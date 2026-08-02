"""
QueryMind - Application Settings
Loaded from environment variables using Pydantic Settings.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration loaded from .env file."""

    # App
    APP_NAME: str = "QueryMind"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # Database (PostgreSQL)
    DATABASE_URL: str = "postgresql+asyncpg://querymind:querymind_dev@localhost:5432/querymind"

    # Qdrant (Vector Database)
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION_DOCUMENTS: str = "querymind_documents"
    QDRANT_COLLECTION_MEMORIES: str = "querymind_memories"

    # Supabase Auth
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # Google Gemini API
    GEMINI_API_KEY: str = ""

    # Ollama (Local LLM fallback)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"

    # File Upload
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 50

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
