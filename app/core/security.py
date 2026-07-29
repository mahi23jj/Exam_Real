import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
import jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.schemas.auth import TokenPayload
from app.db.base import utc_now

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hashes plain text password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies plain password against hashed password."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str | uuid.UUID, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a JWT access token with expiration."""
    if expires_delta:
        expire = utc_now() + expires_delta
    else:
        expire = utc_now() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(subject),
        "exp": expire,
        "type": "access"
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token_string() -> str:
    """Generates a secure unique refresh token string."""
    return f"rt_{uuid.uuid4().hex}{uuid.uuid4().hex}"


def decode_token(token: str) -> Optional[TokenPayload]:
    """Decodes and validates JWT access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return TokenPayload(
            sub=payload.get("sub"),
            exp=payload.get("exp"),
            type=payload.get("type")
        )
    except (jwt.PyJWTError, ValueError):
        return None
