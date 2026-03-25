from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AgentFlow"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    FRONTEND_URL: str = "http://localhost:5173"

    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./agentflow.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # AI Keys (all free tiers)
    GROQ_API_KEY: Optional[str] = None
    HUGGINGFACE_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None

    # Vector DB
    CHROMA_DB_PATH: str = "./chroma_db"

    # Rate limits
    FREE_TIER_DAILY_RUNS: int = 10
    MAX_TASK_TIMEOUT_SECONDS: int = 120

    # Workflow generation timeout
    WORKFLOW_GENERATION_TIMEOUT_SECONDS: int = 120

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
