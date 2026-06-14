"""
ScribeAI Backend - Pydantic Models
Request/Response schemas for API endpoints.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Transcription Endpoints
# ---------------------------------------------------------------------------

class TranscriptionResponse(BaseModel):
    """Response from /transcribe endpoint."""
    id: str
    session_id: str
    transcript: str
    language: Optional[str] = None
    duration_sec: Optional[float] = None
    model_used: str
    created_at: datetime


class TranscriptionListResponse(BaseModel):
    """List of transcriptions."""
    transcriptions: list[TranscriptionResponse]
    total: int


# ---------------------------------------------------------------------------
# Session Management
# ---------------------------------------------------------------------------

class SessionCreate(BaseModel):
    """Create a new patient session."""
    provider_id: str = Field(..., description="Provider UUID")
    patient_anon_id: Optional[str] = Field(None, description="Anonymized patient identifier")


class SessionResponse(BaseModel):
    """Response for session operations."""
    id: str
    provider_id: str
    patient_anon_id: Optional[str] = None
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Provider Management
# ---------------------------------------------------------------------------

class ProviderCreate(BaseModel):
    """Create a new provider."""
    name: str
    email: Optional[str] = None


class ProviderResponse(BaseModel):
    """Response for provider operations (PHI not exposed)."""
    id: str
    is_active: bool
    created_at: datetime


# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str
    model_loaded: bool
    database_connected: bool