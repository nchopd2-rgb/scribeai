"""
ScribeAI Backend - Main Application
FastAPI server with HIPAA-aware design for medical transcription.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db, get_sync_engine
from app.models import HealthResponse
from app.routers import transcription, sessions, providers
from app.services.stt import stt_service

# ---------------------------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# Silence noisy loggers
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("whisper").setLevel(logging.WARNING)

logger = logging.getLogger("scribeai")


# ---------------------------------------------------------------------------
# Application Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown handlers."""
    logger.info("=" * 60)
    logger.info("ScribeAI Backend starting up")
    logger.info(f"Data directory: {settings.DATA_DIR}")
    logger.info(f"Whisper model: {settings.WHISPER_MODEL}")
    logger.info(f"Encryption: {'enabled' if settings.ENCRYPT_PHI else 'disabled'}")

    # Initialize database (create tables if they don't exist)
    await init_db()
    logger.info("Database initialized")

    # Pre-load Whisper model on startup
    try:
        stt_service.load_model()
        logger.info("STT model loaded successfully")
    except Exception as e:
        logger.warning(f"Could not pre-load STT model: {e}")
        logger.warning("Model will load on first request")

    yield

    # Shutdown
    logger.info("ScribeAI Backend shutting down")


# ---------------------------------------------------------------------------
# FastAPI Application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="ScribeAI Backend API",
    description="AI-powered medical scribe — real-time speech-to-text for clinical documentation",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow the frontend (served on port 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(transcription.router)
app.include_router(sessions.router)
app.include_router(providers.router)


# ---------------------------------------------------------------------------
# Root & Health
# ---------------------------------------------------------------------------

@app.get("/", tags=["root"])
async def root():
    """Root endpoint — API info."""
    return {
        "service": "ScribeAI Backend",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health():
    """Health check endpoint."""
    model_loaded = stt_service.model is not None
    db_ok = False
    try:
        from sqlalchemy import text
        engine = get_sync_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            db_ok = True
        engine.dispose()
    except Exception:
        db_ok = False

    return HealthResponse(
        status="healthy" if (model_loaded and db_ok) else "degraded",
        version="0.1.0",
        model_loaded=model_loaded,
        database_connected=db_ok,
    )


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level=settings.LOG_LEVEL.lower(),
    )