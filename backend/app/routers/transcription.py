"""
ScribeAI Backend - Transcription Router
Endpoints for audio upload, transcription, and management.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Query
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session, Transcription, PatientSession
from app.models import TranscriptionResponse, TranscriptionListResponse
from app.services.stt import stt_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["transcription"])


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    file: UploadFile = File(..., description="Audio file (WAV, MP3, M4A, etc.)"),
    session_id: str = Form(..., description="Patient session UUID"),
    language: Optional[str] = Form(None, description="Optional language code (e.g., 'en')"),
    db: AsyncSession = Depends(get_session),
):
    """
    Upload an audio file and receive a real-time transcription.

    - Accepts common audio formats (WAV, MP3, M4A, OGG, FLAC)
    - Uses OpenAI Whisper locally — no audio data leaves the server
    - Returns structured transcription with metadata
    - Audio file is deleted after processing (HIPAA compliance)
    """
    # Validate session exists
    result = await db.execute(
        select(PatientSession).where(PatientSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    if session.status != "active":
        raise HTTPException(status_code=400, detail=f"Session {session_id} is not active")

    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read audio file: {str(e)}")

    if not content:
        raise HTTPException(status_code=400, detail="Empty audio file")

    logger.info(f"Processing audio: {file.filename} ({len(content)} bytes, session={session_id})")

    # Transcribe
    try:
        result_data = stt_service.transcribe_fileobj(
            content,
            filename=file.filename or "audio.wav",
            language=language,
        )
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

    # Store in database
    transcription_id = str(uuid.uuid4())
    db_transcription = Transcription(
        id=transcription_id,
        session_id=session_id,
        transcript_text=result_data["text"],
        language=result_data["language"],
        duration_sec=result_data["duration"],
        model_used=f"whisper-{stt_service.model_name}",
        confidence=None,  # Whisper doesn't provide a single confidence score
    )
    db.add(db_transcription)
    await db.commit()
    await db.refresh(db_transcription)

    logger.info(f"Transcription stored: {transcription_id} ({len(result_data['text'])} chars)")

    return TranscriptionResponse(
        id=db_transcription.id,
        session_id=db_transcription.session_id,
        transcript=db_transcription.transcript_text,
        language=db_transcription.language,
        duration_sec=db_transcription.duration_sec,
        model_used=db_transcription.model_used,
        created_at=db_transcription.created_at,
    )


@router.get("/transcriptions", response_model=TranscriptionListResponse)
async def list_transcriptions(
    session_id: Optional[str] = Query(None, description="Filter by session ID"),
    limit: int = Query(50, ge=1, le=200, description="Max results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: AsyncSession = Depends(get_session),
):
    """List transcriptions, optionally filtered by session."""
    query = select(Transcription).order_by(Transcription.created_at.desc())

    if session_id:
        query = query.where(Transcription.session_id == session_id)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get paginated results
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    transcriptions = result.scalars().all()

    return TranscriptionListResponse(
        transcriptions=[
            TranscriptionResponse(
                id=t.id,
                session_id=t.session_id,
                transcript=t.transcript_text,
                language=t.language,
                duration_sec=t.duration_sec,
                model_used=t.model_used,
                created_at=t.created_at,
            )
            for t in transcriptions
        ],
        total=total,
    )


@router.get("/transcriptions/{transcription_id}", response_model=TranscriptionResponse)
async def get_transcription(
    transcription_id: str,
    db: AsyncSession = Depends(get_session),
):
    """Get a single transcription by ID."""
    result = await db.execute(
        select(Transcription).where(Transcription.id == transcription_id)
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail=f"Transcription {transcription_id} not found")

    return TranscriptionResponse(
        id=t.id,
        session_id=t.session_id,
        transcript=t.transcript_text,
        language=t.language,
        duration_sec=t.duration_sec,
        model_used=t.model_used,
        created_at=t.created_at,
    )


@router.delete("/transcriptions/{transcription_id}", status_code=204)
async def delete_transcription(
    transcription_id: str,
    db: AsyncSession = Depends(get_session),
):
    """Delete a transcription."""
    result = await db.execute(
        select(Transcription).where(Transcription.id == transcription_id)
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail=f"Transcription {transcription_id} not found")

    await db.delete(t)
    await db.commit()
    logger.info(f"Deleted transcription: {transcription_id}")