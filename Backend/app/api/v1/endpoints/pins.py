import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.models.user import User
from app.db.models.social import PinType, Visibility
from app.db.session import get_db
from app.schemas.social import (
    KnowledgePinCreate,
    KnowledgePinUpdate,
    KnowledgePinRead,
    KnowledgePinListResponse,
    ReactionToggleResponse,
    SavedItemToggleResponse,
)
from app.services.social_service import KnowledgePinService

router = APIRouter(prefix="/pins", tags=["Knowledge Pins"])


@router.post(
    "",
    response_model=KnowledgePinRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a contextual Knowledge Pin on document content"
)
async def create_pin(
    pin_in: KnowledgePinCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> KnowledgePinRead:
    """Creates a new Knowledge Pin attached to document coordinates."""
    service = KnowledgePinService(db)
    pin = await service.create_pin(pin_in, current_user)
    return await service.get_pin_by_id(pin.id, current_user)


@router.get(
    "",
    response_model=KnowledgePinListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Knowledge Pins with filtering, searching, and pagination"
)
async def list_pins(
    document_id: Optional[uuid.UUID] = Query(None, description="Filter by Document ID"),
    page_number: Optional[int] = Query(None, ge=1, description="Filter by page number"),
    pin_type: Optional[PinType] = Query(None, description="Filter by pin type"),
    visibility: Optional[Visibility] = Query(None, description="Filter by visibility"),
    author_id: Optional[uuid.UUID] = Query(None, description="Filter by author user ID"),
    search: Optional[str] = Query(None, description="Search pattern in title, content, or selected text"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> KnowledgePinListResponse:
    """Retrieves paginated Knowledge Pins considering user authorization."""
    service = KnowledgePinService(db)
    return await service.list_pins(
        document_id=document_id,
        page_number=page_number,
        pin_type=pin_type,
        visibility=visibility,
        author_id=author_id,
        search=search,
        page=page,
        size=size,
        current_user=current_user
    )


@router.get(
    "/{pin_id}",
    response_model=KnowledgePinRead,
    status_code=status.HTTP_200_OK,
    summary="Get Knowledge Pin details by ID"
)
async def get_pin(
    pin_id: uuid.UUID,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> KnowledgePinRead:
    """Retrieves single Knowledge Pin by UUID."""
    service = KnowledgePinService(db)
    return await service.get_pin_by_id(pin_id, current_user)


@router.put(
    "/{pin_id}",
    response_model=KnowledgePinRead,
    status_code=status.HTTP_200_OK,
    summary="Full update of a Knowledge Pin"
)
@router.patch(
    "/{pin_id}",
    response_model=KnowledgePinRead,
    status_code=status.HTTP_200_OK,
    summary="Partial update of a Knowledge Pin"
)
async def update_pin(
    pin_id: uuid.UUID,
    pin_update: KnowledgePinUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> KnowledgePinRead:
    """Updates Knowledge Pin content or settings (Author only)."""
    service = KnowledgePinService(db)
    await service.update_pin(pin_id, pin_update, current_user)
    return await service.get_pin_by_id(pin_id, current_user)


@router.delete(
    "/{pin_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft delete a Knowledge Pin"
)
async def delete_pin(
    pin_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """Deletes Knowledge Pin entity (Author only)."""
    service = KnowledgePinService(db)
    await service.delete_pin(pin_id, current_user)


@router.post(
    "/{pin_id}/like",
    response_model=ReactionToggleResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle LIKE reaction on a Knowledge Pin"
)
async def toggle_pin_like(
    pin_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ReactionToggleResponse:
    """Toggles Like reaction state for current user."""
    service = KnowledgePinService(db)
    return await service.toggle_like(pin_id, current_user)


@router.post(
    "/{pin_id}/save",
    response_model=SavedItemToggleResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle Bookmark / Save state on a Knowledge Pin"
)
async def toggle_pin_save(
    pin_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> SavedItemToggleResponse:
    """Toggles Saved item bookmark state for current user."""
    service = KnowledgePinService(db)
    return await service.toggle_save(pin_id, current_user)
