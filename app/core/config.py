import os
from typing import List, Literal
from pydantic import Field, PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False
    )

    # Core Settings
    APP_NAME: str = "StudyLoop AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    API_V1_PREFIX: str = "/api/v1"

    # Security & Auth
    SECRET_KEY: str = Field("default-insecure-secret-key-change-in-production-min-32-chars-long", min_length=32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database Configuration (PostgreSQL + pgvector)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/studyloop_db"
    
    @property
    def sync_database_url(self) -> str:
        """Returns sync PostgreSQL URL for Alembic migrations and synchronous drivers."""
        return self.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # File Storage (Cloudinary)
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # AI & LLM Providers
    DEFAULT_LLM_PROVIDER: Literal["openai", "gemini", "claude"] = "openai"

    # OpenAI Configuration
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_CHAT_MODEL: str = "gpt-4o-mini"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    # Google Gemini Configuration
    GEMINI_API_KEY: str = ""
    GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com"

    # Anthropic Claude Configuration
    CLAUDE_API_KEY: str = ""
    CLAUDE_BASE_URL: str = "https://api.anthropic.com"

    # Upload Rules
    MAX_UPLOAD_SIZE_MB: int = 25
    ALLOWED_FILE_TYPES: str = "pdf,ppt,pptx,png,jpg,jpeg"

    @property
    def allowed_file_types_list(self) -> List[str]:
        return [ext.strip().lower() for ext in self.ALLOWED_FILE_TYPES.split(",")]


settings = Settings()
