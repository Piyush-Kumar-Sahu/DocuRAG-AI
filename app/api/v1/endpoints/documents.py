import os
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.models.document import Document
from app.schemas.document import DocumentResponse, DocumentListResponse, DocumentUploadResponse
from app.schemas.auth import MessageResponse
from app.services.pdf_processor import pdf_processor
from app.services.vector_store import vector_store_service
from datetime import datetime, timezone
from app.api.deps import get_current_verified_user, get_optional_current_user

router = APIRouter()

@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    files: Optional[List[UploadFile]] = File(None, description="1 to 3 text-based PDF documents to upload"),
    file: Optional[UploadFile] = File(None, description="Single text-based PDF document (for backwards compatibility)"),
    titles: Optional[List[str]] = Form(None, description="Optional custom titles for the documents"),
    title: Optional[str] = Form(None, description="Optional custom title for single document"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    upload_files: List[UploadFile] = []
    if files:
        upload_files.extend([f for f in files if f and f.filename])
    if file and file.filename and file not in upload_files:
        upload_files.append(file)

    if len(upload_files) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one PDF file must be uploaded."
        )

    if len(upload_files) > 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can upload a maximum of 3 PDFs at a time."
        )
    for f in upload_files:
        fn = f.filename or "unknown"
        if not fn.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The file '{fn}' is not a valid PDF. Only PDF files are supported."
            )
        if f.content_type and f.content_type != "application/pdf" and f.content_type != "application/x-pdf":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The file '{fn}' does not have a valid PDF MIME type."
            )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    processed_docs: List[DocumentResponse] = []
    created_paths: List[str] = []
    created_doc_ids: List[str] = []

    now = datetime.now(timezone.utc)

    try:
        for idx, f in enumerate(upload_files):
            doc_id = str(uuid.uuid4())
            safe_filename = f"{doc_id}_{os.path.basename(f.filename)}"
            saved_file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)

            with open(saved_file_path, "wb") as buffer:
                shutil.copyfileobj(f.file, buffer)
            created_paths.append(saved_file_path)

            file_size = os.path.getsize(saved_file_path)
            if file_size == 0:
                raise ValueError(f"The uploaded file '{f.filename}' is empty.")
            if file_size > 50 * 1024 * 1024:
                raise ValueError(f"The file '{f.filename}' exceeds the 50MB size limit.")

            try:
                pages_data = pdf_processor.extract_text(saved_file_path)
            except ValueError as ve:
                raise ValueError(f"Error in '{f.filename}': {str(ve)}")

            chunks = pdf_processor.chunk_pages(pages_data)
            custom_t = None
            if titles and idx < len(titles) and titles[idx] and titles[idx].strip():
                custom_t = titles[idx].strip()
            elif title and title.strip() and idx == 0:
                custom_t = title.strip()
            
            doc_title = custom_t if custom_t else f.filename
            if current_user:
                document = Document(
                    id=doc_id,
                    user_id=current_user.id,
                    title=doc_title,
                    filename=f.filename,
                    file_path=saved_file_path,
                    file_size=file_size,
                    chunk_count=len(chunks),
                )
                db.add(document)
                db.commit()
                db.refresh(document)
                created_doc_ids.append(document.id)

                vector_store_service.add_document_chunks(
                    user_id=current_user.id,
                    document_id=doc_id,
                    chunks=chunks,
                    document_filename=f.filename
                )

                processed_docs.append(DocumentResponse.model_validate(document))
            else:
                vector_store_service.add_document_chunks(
                    user_id="guest",
                    document_id=doc_id,
                    chunks=chunks,
                    document_filename=f.filename
                )
                guest_doc_resp = DocumentResponse(
                    id=doc_id,
                    user_id="guest",
                    title=doc_title,
                    filename=f.filename,
                    file_size=file_size,
                    chunk_count=len(chunks),
                    created_at=now,
                    updated_at=now,
                )
                processed_docs.append(guest_doc_resp)

        primary_doc = processed_docs[0]
        return DocumentUploadResponse(
            documents=processed_docs,
            total=len(processed_docs),
            id=primary_doc.id,
            user_id=primary_doc.user_id,
            title=primary_doc.title,
            filename=primary_doc.filename,
            file_size=primary_doc.file_size,
            chunk_count=primary_doc.chunk_count,
            created_at=primary_doc.created_at,
            updated_at=primary_doc.updated_at,
        )

    except ValueError as e:
        for p in created_paths:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except OSError:
                    pass
        if current_user and created_doc_ids:
            try:
                db.query(Document).filter(Document.id.in_(created_doc_ids)).delete(synchronize_session=False)
                db.commit()
                for d_id in created_doc_ids:
                    vector_store_service.delete_document_vectors(user_id=current_user.id, document_id=d_id)
            except Exception:
                pass

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        for p in created_paths:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except OSError:
                    pass
        if current_user and created_doc_ids:
            try:
                db.query(Document).filter(Document.id.in_(created_doc_ids)).delete(synchronize_session=False)
                db.commit()
                for d_id in created_doc_ids:
                    vector_store_service.delete_document_vectors(user_id=current_user.id, document_id=d_id)
            except Exception:
                pass

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while processing documents: {str(e)}"
        )

@router.get("/", response_model=DocumentListResponse)
def list_documents(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    docs = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return DocumentListResponse(documents=docs, total=len(docs))

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: str,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    doc = (
        db.query(Document)
        .filter(Document.id == document_id, Document.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )
    return doc

@router.delete("/{document_id}", response_model=MessageResponse)
def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    doc = (
        db.query(Document)
        .filter(Document.id == document_id, Document.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )
    vector_store_service.delete_document_vectors(
        user_id=current_user.id,
        document_id=document_id
    )

    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except OSError:
            pass
    db.delete(doc)
    db.commit()

    return MessageResponse(message=f"Document '{doc.title}' and associated vectors were deleted successfully.")
