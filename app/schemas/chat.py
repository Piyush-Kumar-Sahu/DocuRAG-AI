from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict, Field

class ChatSessionCreate(BaseModel):
    document_id: Optional[str] = Field(None, description="Primary document ID for single-document chat")
    document_ids: Optional[List[str]] = Field(None, description="List of 1 to 3 document IDs for multi-document chat")
    title: Optional[str] = Field("New Chat", description="Title or topic for the chat session")

class ChatSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    document_id: str
    document_ids: List[str] = []
    title: str
    created_at: datetime
    updated_at: datetime

class SourceCitation(BaseModel):
    document_id: Optional[str] = None
    document_filename: Optional[str] = None
    document_title: Optional[str] = None
    page_number: int
    chunk_index: int
    distance: float
    similarity_score: float
    snippet: str

class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    role: str
    content: str
    sources: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

class ChatMessageHistoryItem(BaseModel):
    role: str
    content: str

class ChatQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Question or prompt to ask regarding the document(s)")
    document_id: Optional[str] = Field(None, description="Single document ID for queries")
    document_ids: Optional[List[str]] = Field(None, description="List of 1 to 3 document IDs for multi-document queries")
    chat_history: Optional[List[ChatMessageHistoryItem]] = Field(None, description="Optional conversation history for multi-turn sessions")

class ChatQueryResponse(BaseModel):
    answer: str
    sources: List[SourceCitation]
    session_id: str
    document_id: str
    document_ids: List[str] = []
    user_query: str

class GuestChatMessage(BaseModel):
    role: str
    content: str
    sources: Optional[List[Dict[str, Any]]] = None

class ClaimGuestSessionRequest(BaseModel):
    guest_document_id: Optional[str] = None
    guest_document_ids: Optional[List[str]] = None
    title: str = "Imported Chat"
    messages: List[GuestChatMessage] = []
    documents: Optional[List[Dict[str, Any]]] = None
