"""Tests for security utilities."""

import pytest
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
)


def test_hash_password():
    """Test password hashing."""
    password = "testpassword123"
    hashed = hash_password(password)
    
    assert hashed != password
    assert len(hashed) > 0
    assert hashed.startswith("$2b$")  # bcrypt hash format


def test_verify_password():
    """Test password verification."""
    password = "testpassword123"
    hashed = hash_password(password)
    
    assert verify_password(password, hashed) is True
    assert verify_password("wrongpassword", hashed) is False


def test_create_access_token():
    """Test JWT token creation."""
    data = {"sub": "123", "email": "test@example.com"}
    token = create_access_token(data)
    
    assert isinstance(token, str)
    assert len(token) > 0


def test_decode_token():
    """Test JWT token decoding."""
    data = {"sub": "123", "email": "test@example.com", "tenant_id": 1}
    token = create_access_token(data)
    decoded = decode_token(token)
    
    assert decoded["sub"] == "123"
    assert decoded["email"] == "test@example.com"
    assert decoded["tenant_id"] == 1


def test_hash_password_creates_valid_hash():
    """Test that hash_password creates a hash that can be verified."""
    password = "testpassword123"
    hashed = hash_password(password)
    
    assert hashed != password
    assert verify_password(password, hashed) is True

