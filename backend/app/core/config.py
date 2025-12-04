"""Application configuration using Pydantic Settings."""

from typing import List
from pydantic import PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "Agentic Knowledge Workspace"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_VERSION: str = "v1"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | List[str]) -> List[str]:
        """Parse CORS origins from string or list."""
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v

    # Database
    DATABASE_URL: PostgresDsn
    DATABASE_ECHO: bool = False

    # Security & Auth
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # AI Services
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    
    # LLM Configuration
    LLM_PROVIDER: str = "gemini"  # "openai", "anthropic", or "gemini"
    LLM_MODEL: str = "gemini-1.5-flash"  # or "gemini-1.5-pro"
    
    # Embeddings Configuration (FREE with Gemini!)
    EMBEDDING_PROVIDER: str = "gemini"  # "gemini" (free) or "openai" (paid)
    EMBEDDING_MODEL: str = "models/embedding-001"  # Gemini: 768 dims, FREE
    EMBEDDING_DIMENSION: int = 768  # Gemini: 768, OpenAI: 1536

    # LangSmith
    LANGSMITH_API_KEY: str = ""
    LANGSMITH_PROJECT: str = "agentic-workspace"
    LANGCHAIN_TRACING_V2: bool = True

    # Storage
    STORAGE_PROVIDER: str = "local"  # "s3" or "local"
    S3_BUCKET: str = ""
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    LOCAL_STORAGE_PATH: str = "./storage"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Integrations
    JIRA_URL: str = ""
    JIRA_EMAIL: str = ""
    JIRA_API_TOKEN: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""


# Global settings instance
settings = Settings()

