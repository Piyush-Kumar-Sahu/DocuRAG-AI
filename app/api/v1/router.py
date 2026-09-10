from fastapi import APIRouter
from app.api.v1.endpoints import auth, documents, chat

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Security"])
api_router.include_router(documents.router, prefix="/documents", tags=["Document Processing"])
api_router.include_router(chat.router, prefix="/chat", tags=["RAG Chat & Q&A"])
