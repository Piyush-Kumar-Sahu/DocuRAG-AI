import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import engine, Base
import app.models
from app.api.v1.router import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Production-grade Backend & RAG (Retrieval-Augmented Generation) API for PDF document analysis.\n\n"
        "Features:\n"
        "- PostgreSQL relational database with SQLAlchemy 2.0\n"
        "- Modern Argon2 password hashing & HMAC-SHA256 secure OTP hashing\n"
        "- PyMuPDF text-based PDF ingestion with scanned/empty document validation\n"
        "- Isolated multi-tenant ChromaDB vector store with configurable distance thresholds\n"
        "- Unified BaseLLM abstraction supporting Ollama\n"
        "- Multi-session chat conversations linked to user and document"
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Internal Server Error: {str(exc)}"},
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Health & Status"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": "PostgreSQL",
        "llm_provider": settings.LLM_PROVIDER
    }

@app.get("/", tags=["Health & Status"])
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs": "/docs",
        "api_v1": settings.API_V1_STR
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
