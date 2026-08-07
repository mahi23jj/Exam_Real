"""Auth0 dependencies for FastAPI endpoints."""

from typing import Optional
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth_service import Auth0AuthService
from app.auth.exceptions import MissingAuthorizationHeaderException, LocalUserNotFoundException
from app.db.models.user import User
from app.db.session import get_db

auth_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Dependency to extract and validate current Auth0 user from JWT token."""
    if not credentials:
        raise MissingAuthorizationHeaderException()

    auth_service = Auth0AuthService(db)
    claims = await auth_service.verify_token(credentials.credentials)
    
    user = await auth_service.sync_user(claims)
    if not user:
        raise LocalUserNotFoundException()
        
    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Dependency returning authenticated user if token present, or None for guest requests."""
    if not credentials:
        return None
        
    try:
        auth_service = Auth0AuthService(db)
        claims = await auth_service.verify_token(credentials.credentials)
        user = await auth_service.sync_user(claims)
        return user
    except Exception:
        return None
