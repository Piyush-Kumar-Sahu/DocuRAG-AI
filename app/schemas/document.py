from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    filename: str
    file_size: int
    chunk_count: int
    created_at: datetime
    updated_at: datetime

class DocumentUploadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    documents: List[DocumentResponse]
    total: int
    id: Optional[str] = None
    user_id: Optional[str] = None
    title: Optional[str] = None
    filename: Optional[str] = None
    file_size: Optional[int] = None
    chunk_count: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int
