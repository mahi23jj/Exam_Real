from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.auth import LoginRequest, RefreshTokenRequest, Token
from app.schemas.user import UserCreate, UserRead
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user"
)
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db)
) -> UserRead:
    """Registers a new user (Student or Instructor) in StudyLoop AI."""
    auth_service = AuthService(db)
    user = await auth_service.register_user(user_in)
    return user


@router.post(
    "/login",
    response_model=Token,
    status_code=status.HTTP_200_OK,
    summary="User login to obtain JWT access & refresh tokens"
)
async def login(
    login_in: LoginRequest,
    db: AsyncSession = Depends(get_db)
) -> Token:
    """Authenticates user credentials and returns JWT access and refresh tokens."""
    auth_service = AuthService(db)
    tokens = await auth_service.authenticate_user(login_in)
    return tokens


@router.post(
    "/refresh",
    response_model=Token,
    status_code=status.HTTP_200_OK,
    summary="Refresh JWT access token using a valid refresh token"
)
async def refresh_token(
    refresh_in: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
) -> Token:
    """Exchanges a valid refresh token for a new access token and rotated refresh token."""
    auth_service = AuthService(db)
    tokens = await auth_service.refresh_token(refresh_in)
    return tokens


@router.get(
    "/me",
    response_model=UserRead,
    status_code=status.HTTP_200_OK,
    summary="Get current authenticated user profile"
)
async def get_me(
    current_user: User = Depends(get_current_user)
) -> UserRead:
    """Returns the authenticated user profile."""
    return current_user
