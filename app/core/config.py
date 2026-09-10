import os
from pathlib import Path
from typing import Literal, Optional
from dotenv import load_dotenv
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_ENV_FILE = _BACKEND_DIR / ".env"
if not _ENV_FILE.exists():
    _ENV_FILE = Path(".env").resolve()
if _ENV_FILE.exists():
    load_dotenv(dotenv_path=_ENV_FILE, override=True)

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE) if _ENV_FILE.exists() else ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    ENVIRONMENT: Literal["development", "production", "testing"] = "development"
    PROJECT_NAME: str = "RAG Document Chat API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "postgresql+psycopg://postgres:Piyush@localhost:5432/rag_db"

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_postgres_only(cls, v: str) -> str:
        if not v or not (v.startswith("postgresql://") or v.startswith("postgresql+psycopg://") or v.startswith("postgresql+asyncpg://")):
            raise ValueError(
                "Invalid DATABASE_URL. PostgreSQL is the ONLY supported database. SQLite and other fallbacks are strictly prohibited."
            )
        return v

    SECRET_KEY: str = "rag-super-secret-jwt-key-change-this-in-production-min32chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    OTP_EXPIRE_MINUTES: int = 10
    OTP_PEPPER: str = "secure-otp-pepper-secret-key-32chars"

    EMAIL_HOST: str = ""
    EMAIL_PASSWORD: str = ""
    EMAIL_MODE: Literal["mock", "console", "smtp"] = "console"

    LLM_PROVIDER: Literal["ollama"] = "ollama"
    OLLAMA_HOST: str = "https://ollama.com"
    OLLAMA_BASE_URL: Optional[str] = None
    OLLAMA_API_KEY: str = ""
    OLLAMA_MODEL: str = "llama3.2"
    OLLAMA_TIMEOUT: float = 600.0
    OLLAMA_TIMEOUT_SECONDS: Optional[float] = None

    @model_validator(mode="after")
    def sync_ollama_settings(self) -> "Settings":
        if self.OLLAMA_BASE_URL and (not self.OLLAMA_HOST or self.OLLAMA_HOST == "https://ollama.com"):
            self.OLLAMA_HOST = self.OLLAMA_BASE_URL
        elif self.OLLAMA_HOST and not self.OLLAMA_BASE_URL:
            self.OLLAMA_BASE_URL = self.OLLAMA_HOST
        if self.OLLAMA_TIMEOUT_SECONDS is not None:
            self.OLLAMA_TIMEOUT = self.OLLAMA_TIMEOUT_SECONDS
        else:
            self.OLLAMA_TIMEOUT_SECONDS = self.OLLAMA_TIMEOUT
        return self

    RAG_DISTANCE_THRESHOLD: float = 0.90
    RAG_TOP_K: int = 4
    RAG_CHUNK_SIZE: int = 1000
    RAG_CHUNK_OVERLAP: int = 200
    CHAT_HISTORY_LIMIT: int = 10
    CHROMA_PERSIST_DIR: str = "./data/chroma"
    UPLOAD_DIR: str = "./data/uploads"

settings = Settings()
