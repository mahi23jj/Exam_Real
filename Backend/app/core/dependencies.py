import uuid
from typing import AsyncGenerator, Optional
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import InvalidTokenException, InactiveUserException
from app.core.security import decode_token
from app.db.models.user import User
from app.db.session import get_db
from app.services.auth_service import AuthService

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl="/api/v1/v1/auth/token"
)

reusable_oauth2_optional = OAuth2PasswordBearer(
    tokenUrl="/api/v1/v1/auth/token",
    auto_error=False
)


async def get_current_user(
    token: str = Depends(reusable_oauth2),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Dependency to extract and validate current authenticated user from JWT token."""
    payload = decode_token(token)
    if not payload or not payload.sub or payload.type != "access":
        raise InvalidTokenException()

    try:
        user_id = uuid.UUID(payload.sub)
    except ValueError:
        raise InvalidTokenException()

    auth_service = AuthService(db)
    user = await auth_service.get_user_by_id(user_id)
    if not user.is_active:
        raise InactiveUserException()

    return user


async def get_current_user_optional(
    token: Optional[str] = Depends(reusable_oauth2_optional),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Dependency returning authenticated user if token present, or None for guest requests."""
    if not token:
        return None
    try:
        return await get_current_user(token=token, db=db)
    except Exception:
        return None
