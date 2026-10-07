from typing import Any, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user, get_current_user_optional
from app.db.models.user import User
from app.db.models.social import TargetType
from app.schemas.social import (
    FollowToggleResponse,
    FollowUserResponse,
    FollowStateRead,
    FollowUserListResponse,
)
from app.services.social_service import FollowService

router = APIRouter()


@router.post("/{target_type}/{target_id}/toggle", response_model=FollowToggleResponse)
async def toggle_follow(
    target_type: TargetType,
    target_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Toggle follow status for a user or course.
    """
    service = FollowService(db)
    return await service.toggle_follow(
        target_type=target_type,
        target_id=target_id,
        current_user=current_user
    )


@router.post(
    "/users/{user_id}",
    response_model=FollowUserResponse,
    status_code=status.HTTP_200_OK,
    summary="Follow a student (idempotent, one-way)"
)
async def follow_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> FollowUserResponse:
    """Creates a one-way follow relationship.

    There is no approval or pending state: following an already-followed user
    simply returns the current state. Self-follows are rejected.
    """
    service = FollowService(db)
    return await service.follow_user(user_id, current_user)


@router.delete(
    "/users/{user_id}",
    response_model=FollowUserResponse,
    status_code=status.HTTP_200_OK,
    summary="Unfollow a student (idempotent)"
)
async def unfollow_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> FollowUserResponse:
    """Removes the follow relationship. Unfollowing a non-followed user is a no-op."""
    service = FollowService(db)
    return await service.unfollow_user(user_id, current_user)


@router.get(
    "/users/{user_id}/state",
    response_model=FollowStateRead,
    status_code=status.HTTP_200_OK,
    summary="Read follower/following counts and whether the viewer follows the student"
)
async def get_user_follow_state(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> FollowStateRead:
    """Returns the relationship snapshot between the viewer and another student."""
    service = FollowService(db)
    return await service.get_follow_state(user_id, current_user)


@router.get(
    "/users",
    response_model=FollowUserListResponse,
    status_code=status.HTTP_200_OK,
    summary="List the students I follow",
)
async def list_my_following(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, max_length=120),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> FollowUserListResponse:
    """People the viewer follows, newest follow first.

    Backs the Feed's Following rail and the Community "Following" tab. Search,
    ordering, counting and pagination all run in SQL.
    """
    service = FollowService(db)
    return await service.list_following(
        current_user=current_user, page=page, size=size, search=search
    )


@router.get(
    "/users/{user_id}/followers",
    response_model=FollowUserListResponse,
    status_code=status.HTTP_200_OK,
    summary="List the followers of a student",
)
async def list_user_followers(
    user_id: uuid.UUID,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> FollowUserListResponse:
    """Followers of one student. Visible to guests so profiles stay explorable."""
    service = FollowService(db)
    return await service.list_followers(
        target_id=user_id,
        viewer_id=current_user.id if current_user else None,
        page=page,
        size=size,
    )
