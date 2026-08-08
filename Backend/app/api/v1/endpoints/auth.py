from fastapi import APIRouter, Depends, status, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import HTTPBearer
from pydantic import BaseModel, EmailStr
from typing import Optional, Any, Dict

from app.auth.dependencies import get_current_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.user import UserRead
from app.auth.auth_service import Auth0AuthService
from app.auth.exceptions import MissingAuthorizationHeaderException, InvalidTokenException

router = APIRouter(prefix="/auth", tags=["Authentication"])

auth_scheme = HTTPBearer(auto_error=False)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleCallbackRequest(BaseModel):
    access_token: str


@router.post("/register", summary="Register a new user")
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    auth_service = Auth0AuthService(db)
    try:
        # Create user in Auth0
        await auth_service.register_user_in_auth0(
            email=request.email,
            password=request.password,
            full_name=request.full_name
        )
        
        # Log them in to get token
        login_response = await auth_service.login_user_in_auth0(
            email=request.email,
            password=request.password
        )
        
        access_token = login_response.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Failed to obtain access token after registration")

        # Sync user in our DB
        payload = await auth_service.verify_token(access_token)
        # Auth0 signup doesn't immediately put full_name in the token sometimes without rules, 
        # but we can pass full_name explicitly to sync if it's missing in token.
        if "name" not in payload and request.full_name:
            payload["name"] = request.full_name
        
        user = await auth_service.sync_user(payload)
        
        return {
            "access_token": access_token,
            "token_type": login_response.get("token_type", "Bearer"),
            "user": user
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", summary="Login a user")
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    auth_service = Auth0AuthService(db)
    try:
        login_response = await auth_service.login_user_in_auth0(
            email=request.email,
            password=request.password
        )
        
        access_token = login_response.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Invalid credentials or Auth0 error")

        # Sync user in our DB
        payload = await auth_service.verify_token(access_token)
        user = await auth_service.sync_user(payload)
        
        return {
            "access_token": access_token,
            "token_type": login_response.get("token_type", "Bearer"),
            "user": user
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/google/callback", summary="Handle Google OAuth callback token")
async def google_callback(
    request: GoogleCallbackRequest,
    db: AsyncSession = Depends(get_db)
):
    auth_service = Auth0AuthService(db)
    try:
        payload = await auth_service.verify_token(request.access_token)
        user = await auth_service.sync_user(payload)
        
        return {
            "access_token": request.access_token,
            "token_type": "Bearer",
            "user": user
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


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