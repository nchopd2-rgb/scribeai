"""
ScribeAI Backend - Speech-to-Text Service
Uses faster-whisper (CTranslate2-based) for local, privacy-preserving transcription.
No audio data leaves the server — HIPAA-compliant by design.
"""

import os
import logging
import tempfile
from pathlib import Path
from typing import Optional

from faster_whisper import WhisperModel

from app.config import settings

logger = logging.getLogger(__name__)


class STTService:
    """
    Speech-to-Text service powered by faster-whisper (CTranslate2).
    Loads model once and reuses for all transcriptions.
    More memory-efficient than openai-whisper while maintaining accuracy.
    """

    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or settings.WHISPER_MODEL
        self.model: Optional[WhisperModel] = None

    def load_model(self):
        """Load faster-whisper model (lazy-loaded on first use)."""
        if self.model is None:
            logger.info(f"Loading faster-whisper model: {self.model_name}")
            # Use CPU with int8 for memory efficiency
            self.model = WhisperModel(
                self.model_name,
                device="cpu",
                compute_type="int8",
                cpu_threads=4,
                num_workers=2,
            )
            logger.info(f"faster-whisper model '{self.model_name}' loaded successfully")

    def transcribe(self, audio_path: str, language: Optional[str] = None) -> dict:
        """
        Transcribe an audio file using faster-whisper.

        Args:
            audio_path: Path to audio file (WAV, MP3, M4A, etc.)
            language: Optional language code (e.g., "en", "es"). Auto-detected if None.

        Returns:
            dict with keys: text, language, segments, duration
        """
        self.load_model()

        logger.info(f"Transcribing audio: {audio_path}")

        # Build transcribe options
        segments, info = self.model.transcribe(
            audio_path,
            language=language,
            beam_size=5,
        )

        # Collect all segment text
        segment_texts = []
        for segment in segments:
            segment_texts.append(segment.text)

        full_text = " ".join(segment_texts).strip()

        # Clean up the uploaded file if configured (HIPAA: don't keep PHI audio)
        if settings.AUTO_DELETE_AUDIO:
            try:
                os.remove(audio_path)
                logger.debug(f"Deleted uploaded audio file: {audio_path}")
            except OSError as e:
                logger.warning(f"Could not delete audio file {audio_path}: {e}")

        return {
            "text": full_text,
            "language": info.language if info else "unknown",
            "duration": info.duration if info else 0.0,
        }

    def transcribe_fileobj(self, file_content: bytes, filename: str,
                           language: Optional[str] = None) -> dict:
        """
        Transcribe audio from raw bytes (file upload).

        Args:
            file_content: Raw audio bytes
            filename: Original filename (for extension detection)
            language: Optional language code

        Returns:
            dict with transcription results
        """
        # Save to temp file for faster-whisper processing
        suffix = Path(filename).suffix if Path(filename).suffix else ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix,
                                         dir=settings.UPLOAD_DIR) as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name

        try:
            return self.transcribe(tmp_path, language=language)
        except Exception as e:
            # Clean up temp file on error
            try:
                os.remove(tmp_path)
            except OSError:
                pass
            raise e


# Singleton for app-wide use
stt_service = STTService()