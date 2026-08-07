from fastapi import APIRouter, Depends, status, Form
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.auth.dependencies import get_current_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.user import UserRead
from app.auth.auth_service import Auth0AuthService
from app.auth.exceptions import MissingAuthorizationHeaderException

router = APIRouter(prefix="/auth", tags=["Authentication"])

auth_scheme = HTTPBearer(auto_error=False)


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


@router.post(
    "/token",
    summary="Swagger helper to login using Auth0 Access Token"
)
async def login_for_access_token(
    password: str = Form(..., description="Paste your Auth0 access token here"),
    db: AsyncSession = Depends(get_db)
):
    """
    Helper for Swagger UI testing.
    Since we use Auth0, real login happens on the frontend.
    For Swagger, use this endpoint: put any dummy username and paste your real Auth0 token in the password field.
    """
    if not password:
        raise MissingAuthorizationHeaderException()
        
    auth_service = Auth0AuthService(db)
    # verify it just to be sure it's valid
    await auth_service.verify_token(password)

    return {
        "access_token": password,
        "token_type": "bearer"
    }