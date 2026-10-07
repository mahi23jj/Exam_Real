from typing import Any, Optional
import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user, get_current_user_optional
from app.db.models.user import User
from app.schemas.social import (
    FeedResponse,
    FeedPageResponse,
    FeedScope,
    FeedContentType,
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

    Deprecated: this returns raw activity events. Use ``GET
    /community/feed-items`` for the chronological questions/pins feed.
    """
    service = FeedService(db)
    return await service.get_user_feed(
        user_id=current_user.id,
        skip=skip,
        limit=limit
    )


@router.get("/feed-items", response_model=FeedPageResponse)
async def get_feed_items(
    scope: FeedScope = Query(
        FeedScope.EVERYONE,
        description="'everyone' shows all public content; 'following' shows "
                    "followed authors plus your own posts.",
    ),
    content_type: FeedContentType = Query(
        FeedContentType.ALL,
        alias="type",
        description="Restrict to questions, pins, or both.",
    ),
    search: Optional[str] = Query(None, max_length=200),
    author_id: Optional[uuid.UUID] = Query(
        None,
        description="Restrict the feed to one person's content (Following rail).",
    ),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Chronological feed of questions and pins, merged and paginated in the
    database so ordering is correct across both content types.
    """
    service = FeedService(db)
    return await service.get_feed(
        current_user=current_user,
        scope=scope,
        content_type=content_type,
        search=search,
        page=page,
        size=size,
        author_id=author_id,
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
