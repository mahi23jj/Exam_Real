from typing import Any
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user
from app.db.models.user import User
from app.db.models.social import TargetType
from app.schemas.social import FollowToggleResponse
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
