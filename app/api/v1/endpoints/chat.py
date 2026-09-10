import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.document import Document
from app.models.chat import ChatSession, ChatMessage, ChatSessionDocument
from app.schemas.chat import (
    ChatSessionCreate,
    ChatSessionResponse,
    ChatMessageResponse,
    ChatQueryRequest,
    ChatQueryResponse,
    SourceCitation,
    ClaimGuestSessionRequest,
)
from app.schemas.auth import MessageResponse
from app.services.rag_service import rag_service
from app.services.vector_store import vector_store_service
from app.services.export_service import export_service
from app.api.deps import get_current_verified_user, get_optional_current_user

router = APIRouter()

@router.post("/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
def create_chat_session(
    session_in: ChatSessionCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    doc_ids: List[str] = []
    if session_in.document_ids:
        doc_ids = [d for d in session_in.document_ids if d]
    elif session_in.document_id:
        doc_ids = [session_in.document_id]
    if not doc_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one document ID is required to create a chat session."
        )
    if len(doc_ids) > 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A chat session can be associated with at most 3 documents."
        )
    now = datetime.now(timezone.utc)
    if current_user:
        documents = (
            db.query(Document).filter(Document.id.in_(doc_ids), Document.user_id == current_user.id).all()
        )
        if len(documents) != len(doc_ids):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or more documents were not found or do not belong to you."
            )

        if session_in.title and session_in.title.strip():
            title = session_in.title.strip()
        elif len(documents) == 1:
            title = f"Chat on {documents[0].title}"
        else:
            title = f"Multi-doc Chat ({len(documents)} PDFs)"

        chat_session = ChatSession(
            user_id=current_user.id,
            document_id=doc_ids[0],
            title=title
        )
        db.add(chat_session)
        db.commit()
        db.refresh(chat_session)

        for d_id in doc_ids:
            link = ChatSessionDocument(
                session_id=chat_session.id,
                document_id=d_id
            )
            db.add(link)
        db.commit()
        db.refresh(chat_session)

        return ChatSessionResponse(
            id=chat_session.id,
            user_id=chat_session.user_id,
            document_id=chat_session.document_id or doc_ids[0],
            document_ids=doc_ids,
            title=chat_session.title,
            created_at=chat_session.created_at,
            updated_at=chat_session.updated_at,
        )
    else:
        guest_sess_id = f"guest_sess_{uuid.uuid4()}"
        title = session_in.title.strip() if session_in.title and session_in.title.strip() else (
            "Guest Chat" if len(doc_ids) == 1 else f"Guest Multi-doc Chat ({len(doc_ids)} PDFs)"
        )
        return ChatSessionResponse(
            id=guest_sess_id,
            user_id="guest",
            document_id=doc_ids[0],
            document_ids=doc_ids,
            title=title,
            created_at=now,
            updated_at=now,
        )

@router.get("/sessions", response_model=List[ChatSessionResponse])
def list_chat_sessions(
    document_id: Optional[str] = Query(None, description="Filter sessions by document ID"),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    query = db.query(ChatSession).filter(ChatSession.user_id == current_user.id)
    if document_id:
        query = query.filter(
            (ChatSession.document_id == document_id) |
            (ChatSession.session_documents.any(ChatSessionDocument.document_id == document_id))
        )
    
    sessions = query.order_by(ChatSession.updated_at.desc()).all()
    res: List[ChatSessionResponse] = []
    for s in sessions:
        res.append(ChatSessionResponse(
            id=s.id,
            user_id=s.user_id,
            document_id=s.document_id or (s.document_ids[0] if s.document_ids else ""),
            document_ids=s.document_ids,
            title=s.title,
            created_at=s.created_at,
            updated_at=s.updated_at,
        ))
    return res

@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
def get_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found."
        )
    return ChatSessionResponse(
        id=session.id,
        user_id=session.user_id,
        document_id=session.document_id or (session.document_ids[0] if session.document_ids else ""),
        document_ids=session.document_ids,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )

@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
def get_session_messages(
    session_id: str,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found."
        )

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return messages

@router.post("/sessions/{session_id}/query", response_model=ChatQueryResponse)
def query_session_document(
    session_id: str,
    query_in: ChatQueryRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    if current_user and not session_id.startswith("guest_"):
        session = (
            db.query(ChatSession)
            .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
            .first()
        )
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found."
            )

        target_doc_ids = session.document_ids
        if not target_doc_ids and session.document_id:
            target_doc_ids = [session.document_id]

        target_user_id = current_user.id

        docs = (
            db.query(Document)
            .filter(Document.id.in_(target_doc_ids), Document.user_id == current_user.id)
            .all()
        )
        doc_names = {d.id: d.filename for d in docs}

        past_messages = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
            .all()
        )
        chat_history = [
            {"role": m.role, "content": m.content}
            for m in past_messages
        ]

        try:
            answer, sources = rag_service.query_document(
                user_id=target_user_id,
                document_ids=target_doc_ids,
                user_query=query_in.query,
                chat_history=chat_history,
                document_names=doc_names
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"RAG query generation failed: {str(e)}"
            )

        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=query_in.query
        )
        assistant_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=answer,
            sources=sources
        )
        db.add(user_msg)
        db.add(assistant_msg)
        db.commit()

        primary_doc_id = target_doc_ids[0] if target_doc_ids else ""

    else:
        target_doc_ids = []
        if query_in.document_ids:
            target_doc_ids = [d for d in query_in.document_ids if d]
        elif query_in.document_id:
            target_doc_ids = [query_in.document_id]

        if not target_doc_ids:
            if session_id.startswith("guest_sess_"):
                target_doc_ids = [session_id[len("guest_sess_"):]]
            else:
                target_doc_ids = ["guest_doc"]

        target_user_id = "guest"

        chat_history = []
        if query_in.chat_history:
            chat_history = [
                {"role": m.role, "content": m.content}
                for m in query_in.chat_history
            ]

        try:
            answer, sources = rag_service.query_document(
                user_id=target_user_id,
                document_ids=target_doc_ids,
                user_query=query_in.query,
                chat_history=chat_history
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"RAG query generation failed: {str(e)}"
            )

        primary_doc_id = target_doc_ids[0] if target_doc_ids else ""

    source_citations = [SourceCitation(**s) for s in sources]

    return ChatQueryResponse(
        answer=answer,
        sources=source_citations,
        session_id=session_id,
        document_id=primary_doc_id,
        document_ids=target_doc_ids,
        user_query=query_in.query
    )

@router.post("/claim-guest-session", response_model=ChatSessionResponse)
def claim_guest_session(
    claim_in: ClaimGuestSessionRequest,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    guest_doc_ids = []
    if claim_in.guest_document_ids:
        guest_doc_ids = [d for d in claim_in.guest_document_ids if d]
    elif claim_in.guest_document_id:
        guest_doc_ids = [claim_in.guest_document_id]

    if not guest_doc_ids:
        guest_doc_ids = ["guest_doc"]

    persisted_doc_ids: List[str] = []
    default_title = claim_in.title or "Imported Document"
    doc_info_map = {}
    if claim_in.documents:
        for d in claim_in.documents:
            if isinstance(d, dict) and d.get("id"):
                doc_info_map[d["id"]] = d

    for g_id in guest_doc_ids:
        new_doc_id = str(uuid.uuid4())
        info = doc_info_map.get(g_id, {})
        doc_title = info.get("title") or default_title
        doc_filename = info.get("filename") or (f"{doc_title}.pdf" if not doc_title.lower().endswith(".pdf") else doc_title)
        migrated_count = vector_store_service.migrate_guest_vectors(
            guest_document_id=g_id,
            new_user_id=current_user.id,
            new_document_id=new_doc_id,
            new_filename=doc_filename
        )
        new_document = Document(
            id=new_doc_id,
            user_id=current_user.id,
            title=doc_title,
            filename=doc_filename,
            file_path="",
            file_size=info.get("file_size", 1024),
            chunk_count=migrated_count or 1,
        )
        db.add(new_document)
        db.commit()
        db.refresh(new_document)
        persisted_doc_ids.append(new_document.id)

    session_title = claim_in.title or (
        f"Chat on {default_title}" if len(persisted_doc_ids) == 1 else f"Multi-doc Chat ({len(persisted_doc_ids)} PDFs)"
    )
    chat_session = ChatSession(
        user_id=current_user.id,
        document_id=persisted_doc_ids[0],
        title=session_title
    )
    db.add(chat_session)
    db.commit()
    db.refresh(chat_session)

    for p_id in persisted_doc_ids:
        link = ChatSessionDocument(
            session_id=chat_session.id,
            document_id=p_id
        )
        db.add(link)
    db.commit()
    db.refresh(chat_session)
    for msg in claim_in.messages:
        db_msg = ChatMessage(
            session_id=chat_session.id,
            role=msg.role,
            content=msg.content,
            sources=msg.sources
        )
        db.add(db_msg)
    db.commit()

    return ChatSessionResponse(
        id=chat_session.id,
        user_id=chat_session.user_id,
        document_id=chat_session.document_id or persisted_doc_ids[0],
        document_ids=persisted_doc_ids,
        title=chat_session.title,
        created_at=chat_session.created_at,
        updated_at=chat_session.updated_at,
    )

@router.get("/sessions/{session_id}/export")
def export_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found."
        )

    doc_ids = session.document_ids or ([session.document_id] if session.document_id else [])
    docs = db.query(Document).filter(Document.id.in_(doc_ids), Document.user_id == current_user.id).all()
    if docs:
        doc_title = ", ".join([d.filename for d in docs])
    else:
        doc_title = session.title

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    msg_dicts = [
        {
            "role": m.role,
            "content": m.content,
            "sources": m.sources or []
        }
        for m in messages
    ]

    pdf_buffer = export_service.generate_chat_pdf(
        title=session.title,
        document_title=doc_title,
        messages=msg_dicts,
        user_email=current_user.email
    )

    safe_title = "".join(c for c in session.title if c.isalnum() or c in (' ', '_', '-')).rstrip()
    filename = f"{safe_title.replace(' ', '_')}_chat.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.delete("/sessions/{session_id}", response_model=MessageResponse)
def delete_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found."
        )

    db.delete(session)
    db.commit()
    return MessageResponse(message="Chat session deleted successfully.")
