from typing import Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user, get_current_user_optional
from app.db.models.user import User
from app.schemas.social import (
    FeedResponse,
    CommunityContextRequest,
    CommunityContextResponse
)
from app.services.social_service import FeedService, CommunityContextService

router = APIRouter()

@router.get("/feed", response_model=FeedResponse)
async def get_feed(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get the personalized activity feed for the current user.
    """
    service = FeedService(db)
    return await service.get_user_feed(
        user_id=current_user.id,
        skip=skip,
        limit=limit
    )

@router.post("/context", response_model=CommunityContextResponse)
async def get_community_context(
    request: CommunityContextRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> Any:
    """
    Get the community context (pins, questions, top contributors) for a specific document location.
    """
    service = CommunityContextService(db)
    return await service.get_community_context(
        request=request,
        current_user=current_user
    )
