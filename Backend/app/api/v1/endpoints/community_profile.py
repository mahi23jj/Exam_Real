from typing import Any, Optional
import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user_optional, get_current_active_user
from app.db.models.user import User
from app.schemas.social import (
    CommunityProfileRead,
    RecommendedUserListResponse,
)
from app.services.social_service import CommunityProfileService, UserRecommendationService

router = APIRouter()


@router.get(
    "/recommendations",
    response_model=RecommendedUserListResponse,
    status_code=200,
    summary="Discover students from the same department and shared courses"
)
async def get_recommended_users(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> RecommendedUserListResponse:
    """Returns recommended students for the authenticated user.

    Candidates come only from existing relationships (same department and/or
    followed courses). The viewer and users they already follow are excluded.
    Recommendations are computed on the fly — nothing is persisted.
    """
    service = UserRecommendationService(db)
    return await service.get_recommended_users(current_user, page=page, size=size)


@router.get(
    "/{user_id}/community-profile",
    response_model=CommunityProfileRead,
    status_code=200,
    summary="Get the community profile for a student"
)
async def get_community_profile(
    user_id: uuid.UUID,
    page: int = Query(1, ge=1, description="Page number for pins and questions"),
    size: int = Query(10, ge=1, le=50, description="Items per page for pins and questions"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> CommunityProfileRead:
    """Identity, study context, social stats and public contributions of a student."""
    service = CommunityProfileService(db)
    return await service.get_community_profile(
        user_id=user_id,
        current_user=current_user,
        page=page,
        size=size
    )
