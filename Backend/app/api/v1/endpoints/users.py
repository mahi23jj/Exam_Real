"""Authenticated endpoints for the current student's own profile."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import get_current_user
from app.db.models.user import User
from app.schemas.user import MyProfileRead, ProfileUpdateRequest
from app.services.profile_service import ProfileService

router = APIRouter(tags=["users"])


@router.get(
    "/me/profile",
    response_model=MyProfileRead,
    summary="Get my own editable profile",
)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MyProfileRead:
    return await ProfileService(db).get_my_profile(current_user)


@router.patch(
    "/me/profile",
    response_model=MyProfileRead,
    summary="Update my own editable profile",
)
async def update_my_profile(
    updates: ProfileUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MyProfileRead:
    try:
        return await ProfileService(db).update_my_profile(current_user, updates)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc