"""
ScribeAI Backend - Configuration Module
HIPAA-aware settings management via environment variables.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Project paths
    PROJECT_ROOT: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = PROJECT_ROOT / "data"
    UPLOAD_DIR: Path = PROJECT_ROOT / "uploads"

    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{DATA_DIR}/scribeai.db"

    # Encryption - MUST be set in production
    ENCRYPTION_KEY: Optional[str] = None

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Whisper model selection (tiny, base, small, medium, large)
    # "tiny" is fastest and most memory-efficient for MVP
    WHISPER_MODEL: str = "tiny"

    # Logging
    LOG_LEVEL: str = "INFO"

    # HIPAA: auto-delete uploaded audio files after processing
    AUTO_DELETE_AUDIO: bool = True

    # HIPAA: encrypt all PHI fields in database
    ENCRYPT_PHI: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()

# Ensure data and upload directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)