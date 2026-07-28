import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    UserAlreadyExistsException,
    InvalidCredentialsException,
    RefreshTokenExpiredException,
    UserNotFoundException,
    InactiveUserException,
)
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token_string,
)
from app.db.models.user import User, RefreshToken
from app.repositories.user_repository import UserRepository, RefreshTokenRepository
from app.schemas.auth import LoginRequest, RefreshTokenRequest, Token
from app.schemas.user import UserCreate


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)
        self.token_repo = RefreshTokenRepository(session)

    async def register_user(self, user_create: UserCreate) -> User:
        """Registers a new student or instructor user."""
        existing_user = await self.user_repo.get_by_email(user_create.email)
        if existing_user:
            raise UserAlreadyExistsException()

        hashed_pw = hash_password(user_create.password)
        new_user = User(
            email=user_create.email.lower().strip(),
            hashed_password=hashed_pw,
            full_name=user_create.full_name,
            role=user_create.role,
            is_active=True
        )
        created_user = await self.user_repo.create(new_user)
        return created_user

    async def authenticate_user(self, login_data: LoginRequest) -> Token:
        """Authenticates user credentials and issues access & refresh tokens."""
        user = await self.user_repo.get_by_email(login_data.email)
        if not user or not verify_password(login_data.password, user.hashed_password):
            raise InvalidCredentialsException()

        if not user.is_active:
            raise InactiveUserException()

        # Generate tokens
        access_token = create_access_token(subject=user.id)
        refresh_token_str = create_refresh_token_string()

        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        refresh_token_obj = RefreshToken(
            user_id=user.id,
            token=refresh_token_str,
            expires_at=expires_at,
            revoked=False
        )
        await self.token_repo.create(refresh_token_obj)

        return Token(
            access_token=access_token,
            refresh_token=refresh_token_str,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )

    async def refresh_token(self, refresh_req: RefreshTokenRequest) -> Token:
        """Rotates refresh token and issues a new access token."""
        token_obj = await self.token_repo.get_by_token(refresh_req.refresh_token)
        if not token_obj or token_obj.revoked:
            raise RefreshTokenExpiredException()

        # Check expiration
        now = datetime.now(timezone.utc)
        expires_at = token_obj.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < now:
            raise RefreshTokenExpiredException()

        user = await self.user_repo.get_by_id(token_obj.user_id)
        if not user or not user.is_active:
            raise UserNotFoundException()

        # Revoke old refresh token (Token Rotation)
        await self.token_repo.revoke_token(token_obj)

        # Create new tokens
        new_access_token = create_access_token(subject=user.id)
        new_refresh_token_str = create_refresh_token_string()
        new_expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        new_refresh_token_obj = RefreshToken(
            user_id=user.id,
            token=new_refresh_token_str,
            expires_at=new_expires_at,
            revoked=False
        )
        await self.token_repo.create(new_refresh_token_obj)

        return Token(
            access_token=new_access_token,
            refresh_token=new_refresh_token_str,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )

    async def get_user_by_id(self, user_id: uuid.UUID) -> User:
        """Retrieves user by ID."""
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise UserNotFoundException()
        return user
