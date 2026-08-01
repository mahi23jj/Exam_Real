from typing import Any, Optional
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user_optional
from app.db.models.user import User
from app.schemas.social import CommunityProfileRead
from app.services.social_service import CommunityProfileService

router = APIRouter()

@router.get("/{user_id}/community-profile", response_model=CommunityProfileRead)
async def get_community_profile(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> Any:
    """
    Get the community profile for a user, including their public pins, questions, and stats.
    """
    service = CommunityProfileService(db)
    return await service.get_community_profile(
        user_id=user_id,
        current_user=current_user
    )
