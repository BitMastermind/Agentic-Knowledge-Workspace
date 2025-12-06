"""Encryption utilities for sensitive tenant credentials."""

import base64
import os
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from typing import Dict, Any

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class CredentialEncryption:
    """Encrypt and decrypt tenant credentials using Fernet symmetric encryption."""
    
    def __init__(self):
        """Initialize encryption with key derived from JWT_SECRET_KEY."""
        # Derive encryption key from JWT_SECRET_KEY
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'tenant_credentials_salt',  # In production, use a unique salt per tenant
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(
            kdf.derive(settings.JWT_SECRET_KEY.encode())
        )
        self.cipher = Fernet(key)
    
    def encrypt(self, data: Dict[str, Any]) -> str:
        """
        Encrypt credential data.
        
        Args:
            data: Dictionary containing credential information
            
        Returns:
            Encrypted string (base64 encoded)
        """
        try:
            import json
            json_data = json.dumps(data)
            encrypted = self.cipher.encrypt(json_data.encode())
            return base64.urlsafe_b64encode(encrypted).decode()
        except Exception as e:
            logger.error("encryption_failed", error=str(e))
            raise ValueError(f"Failed to encrypt credentials: {str(e)}")
    
    def decrypt(self, encrypted_data: str) -> Dict[str, Any]:
        """
        Decrypt credential data.
        
        Args:
            encrypted_data: Encrypted string (base64 encoded)
            
        Returns:
            Decrypted dictionary
        """
        try:
            import json
            decoded = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted = self.cipher.decrypt(decoded)
            return json.loads(decrypted.decode())
        except Exception as e:
            logger.error("decryption_failed", error=str(e))
            raise ValueError(f"Failed to decrypt credentials: {str(e)}")


# Global encryption instance
_encryption = None


def get_encryption() -> CredentialEncryption:
    """Get or create encryption instance."""
    global _encryption
    if _encryption is None:
        _encryption = CredentialEncryption()
    return _encryption

