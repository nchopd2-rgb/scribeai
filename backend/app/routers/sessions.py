"""
ScribeAI Backend - Session Router
Endpoints for managing patient sessions.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session as get_db_session, PatientSession
from app.models import SessionCreate, SessionResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse, status_code=201)
async def create_session(
    body: SessionCreate,
    db: AsyncSession = Depends(get_db_session),
):
    """Create a new patient-clinician session."""
    session_id = str(uuid.uuid4())
    db_session = PatientSession(
        id=session_id,
        provider_id=body.provider_id,
        patient_anon_id=body.patient_anon_id,
        status="active",
    )
    db.add(db_session)
    await db.commit()
    await db.refresh(db_session)

    logger.info(f"Created session: {session_id} (provider={body.provider_id})")

    return SessionResponse(
        id=db_session.id,
        provider_id=db_session.provider_id,
        patient_anon_id=db_session.patient_anon_id,
        status=db_session.status,
        created_at=db_session.created_at,
        completed_at=db_session.completed_at,
    )


@router.get("", response_model=list[SessionResponse])
async def list_sessions(
    provider_id: Optional[str] = Query(None, description="Filter by provider"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db_session),
):
    """List patient sessions."""
    query = select(PatientSession).order_by(PatientSession.created_at.desc())

    if provider_id:
        query = query.where(PatientSession.provider_id == provider_id)
    if status_filter:
        query = query.where(PatientSession.status == status_filter)

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    sessions = result.scalars().all()

    return [
        SessionResponse(
            id=s.id,
            provider_id=s.provider_id,
            patient_anon_id=s.patient_anon_id,
            status=s.status,
            created_at=s.created_at,
            completed_at=s.completed_at,
        )
        for s in sessions
    ]


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session_by_id(
    session_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """Get a single session by ID."""
    result = await db.execute(
        select(PatientSession).where(PatientSession.id == session_id)
    )
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    return SessionResponse(
        id=s.id,
        provider_id=s.provider_id,
        patient_anon_id=s.patient_anon_id,
        status=s.status,
        created_at=s.created_at,
        completed_at=s.completed_at,
    )


@router.patch("/{session_id}/complete", response_model=SessionResponse)
async def complete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """Mark a session as completed."""
    result = await db.execute(
        select(PatientSession).where(PatientSession.id == session_id)
    )
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    s.status = "completed"
    s.completed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(s)

    logger.info(f"Completed session: {session_id}")

    return SessionResponse(
        id=s.id,
        provider_id=s.provider_id,
        patient_anon_id=s.patient_anon_id,
        status=s.status,
        created_at=s.created_at,
        completed_at=s.completed_at,
    )