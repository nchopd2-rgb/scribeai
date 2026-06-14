"""
ScribeAI Backend - Encryption Utilities
HIPAA-compliant encryption for PHI at rest using Fernet (symmetric AES-256).
"""

import os
import base64
from typing import Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.config import settings


class EncryptionService:
    """
    Handles encryption and decryption of PHI data at rest.
    Uses Fernet (AES-256-CBC with HMAC SHA256) for symmetric encryption.
    """

    def __init__(self, key: Optional[str] = None):
        """
        Initialize with an encryption key.
        If no key is provided, falls back to settings or generates one.
        WARNING: Generated keys are ephemeral — in production, load from env/secret store.
        """
        key_str = key or settings.ENCRYPTION_KEY
        if key_str:
            if isinstance(key_str, str):
                key_bytes = key_str.encode("utf-8")
            else:
                key_bytes = key_str
            # Ensure key is valid base64-encoded 32 bytes
            try:
                self.cipher = Fernet(key_bytes if isinstance(key_bytes, bytes) else key_str)
            except (ValueError, base64.binascii.Error):
                # If key isn't valid Fernet format, derive one
                self.cipher = self._derive_key(key_bytes)
        else:
            # Generate a key (ephemeral — for dev only!)
            self.cipher = Fernet(Fernet.generate_key())

    def _derive_key(self, raw_key: bytes) -> Fernet:
        """Derive a valid Fernet key from an arbitrary string using PBKDF2."""
        salt = b"ScribeAI_HIPAA_SALT_v1"
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=600000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(raw_key))
        return Fernet(key)

    def encrypt(self, plaintext: str) -> str:
        """Encrypt a string value. Returns base64-encoded ciphertext."""
        if not plaintext:
            return ""
        return self.cipher.encrypt(plaintext.encode("utf-8")).decode("utf-8")

    def decrypt(self, ciphertext: str) -> str:
        """Decrypt a base64-encoded ciphertext string."""
        if not ciphertext:
            return ""
        return self.cipher.decrypt(ciphertext.encode("utf-8")).decode("utf-8")


# Singleton for app-wide use
encryption_service = EncryptionService()