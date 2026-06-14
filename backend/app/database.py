"""
ScribeAI Backend - Database Module
SQLite database with async support via SQLAlchemy + aiosqlite.
Schema designed for HIPAA-compatible storage.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Column, String, Text, Float, DateTime, Boolean, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.config import settings
from app.utils.encryption import encryption_service


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# ORM Models
# ---------------------------------------------------------------------------

class Provider(Base):
    """Healthcare provider (doctor, NP, PA). PHI fields are encrypted."""

    __tablename__ = "providers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    email_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    def set_name(self, name: str):
        self.name_encrypted = encryption_service.encrypt(name)

    def get_name(self) -> str:
        return encryption_service.decrypt(self.name_encrypted)

    def set_email(self, email: str):
        self.email_encrypted = encryption_service.encrypt(email) if email else ""

    def get_email(self) -> str:
        return encryption_service.decrypt(self.email_encrypted) if self.email_encrypted else ""


class PatientSession(Base):
    """A patient-clinician encounter/session."""

    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    provider_id: Mapped[str] = mapped_column(String(36), nullable=False)
    # Anonymized patient identifier — never store real patient names/DOB here
    patient_anon_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active, completed, archived
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class Transcription(Base):
    """Transcription of an audio recording from a patient session."""

    __tablename__ = "transcriptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    transcript_text: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # e.g., "en"
    duration_sec: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    model_used: Mapped[str] = mapped_column(String(50), default="whisper-tiny")
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


# ---------------------------------------------------------------------------
# Engine & Session Factory
# ---------------------------------------------------------------------------

async_engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    """Create all tables. Safe to call multiple times (IF NOT EXISTS behavior)."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncSession:
    """Dependency: yield an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# ---------------------------------------------------------------------------
# Sync engine for non-async contexts (CLI, migrations)
# ---------------------------------------------------------------------------

def get_sync_engine():
    """Return a synchronous engine for one-off operations."""
    sync_url = settings.DATABASE_URL.replace("sqlite+aiosqlite:///", "sqlite:///")
    return create_engine(sync_url)


def init_db_sync():
    """Initialize database synchronously (useful for startup checks)."""
    engine = get_sync_engine()
    Base.metadata.create_all(engine)
    engine.dispose()