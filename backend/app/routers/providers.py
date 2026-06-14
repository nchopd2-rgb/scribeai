"""
ScribeAI Backend - Provider Router
Endpoints for managing healthcare providers.
"""

import uuid
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session, Provider
from app.models import ProviderCreate, ProviderResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/providers", tags=["providers"])


@router.post("", response_model=ProviderResponse, status_code=201)
async def create_provider(
    body: ProviderCreate,
    db: AsyncSession = Depends(get_session),
):
    """Create a new provider (doctor, NP, PA). Name is encrypted at rest."""
    provider_id = str(uuid.uuid4())
    db_provider = Provider(id=provider_id)
    db_provider.set_name(body.name)
    db_provider.set_email(body.email or "")

    db.add(db_provider)
    await db.commit()
    await db.refresh(db_provider)

    logger.info(f"Created provider: {provider_id}")

    return ProviderResponse(
        id=db_provider.id,
        is_active=db_provider.is_active,
        created_at=db_provider.created_at,
    )


@router.get("", response_model=list[ProviderResponse])
async def list_providers(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_session),
):
    """List all providers."""
    result = await db.execute(
        select(Provider).where(Provider.is_active.is_(True))
        .order_by(Provider.created_at.desc())
        .offset(offset).limit(limit)
    )
    providers = result.scalars().all()

    return [
        ProviderResponse(
            id=p.id,
            is_active=p.is_active,
            created_at=p.created_at,
        )
        for p in providers
    ]


@router.get("/{provider_id}", response_model=ProviderResponse)
async def get_provider(
    provider_id: str,
    db: AsyncSession = Depends(get_session),
):
    """Get a provider by ID."""
    result = await db.execute(
        select(Provider).where(Provider.id == provider_id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail=f"Provider {provider_id} not found")

    return ProviderResponse(
        id=p.id,
        is_active=p.is_active,
        created_at=p.created_at,
    )


@router.delete("/{provider_id}", status_code=204)
async def deactivate_provider(
    provider_id: str,
    db: AsyncSession = Depends(get_session),
):
    """Deactivate a provider (soft delete)."""
    result = await db.execute(
        select(Provider).where(Provider.id == provider_id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail=f"Provider {provider_id} not found")

    p.is_active = False
    await db.commit()
    logger.info(f"Deactivated provider: {provider_id}")