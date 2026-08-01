import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.models.user import User
from app.db.models.social import Visibility
from app.db.session import get_db
from app.schemas.social import (
    LearningQuestionCreate,
    LearningQuestionUpdate,
    LearningQuestionRead,
    LearningQuestionListResponse,
    QuestionReplyCreate,
    QuestionReplyUpdate,
    QuestionReplyRead,
    QuestionReplyTreeResponse,
    ReactionToggleResponse,
    SavedItemToggleResponse,
)
from app.services.social_service import (
    LearningQuestionService,
    NestedReplyService,
)

router = APIRouter(prefix="/learning-questions", tags=["Learning Questions"])


@router.post(
    "",
    response_model=LearningQuestionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Ask a contextual Learning Question on document content"
)
async def create_learning_question(
    question_in: LearningQuestionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> LearningQuestionRead:
    """Creates a new Learning Question attached to note or past exam content."""
    service = LearningQuestionService(db)
    question = await service.create_question(question_in, current_user)
    return await service.get_question_by_id(question.id, current_user)


@router.get(
    "",
    response_model=LearningQuestionListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Learning Questions with filtering, searching, and pagination"
)
async def list_learning_questions(
    document_id: Optional[uuid.UUID] = Query(None, description="Filter by Document ID"),
    page_number: Optional[int] = Query(None, ge=1, description="Filter by page number"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter status (OPEN, SOLVED, CLOSED)"),
    visibility: Optional[Visibility] = Query(None, description="Filter by visibility"),
    author_id: Optional[uuid.UUID] = Query(None, description="Filter by author user ID"),
    search: Optional[str] = Query(None, description="Search pattern in title, content, or snapshot"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> LearningQuestionListResponse:
    """Retrieves paginated list of learning questions."""
    service = LearningQuestionService(db)
    return await service.list_questions(
        document_id=document_id,
        page_number=page_number,
        status_filter=status_filter,
        visibility=visibility,
        author_id=author_id,
        search=search,
        page=page,
        size=size,
        current_user=current_user
    )


@router.get(
    "/{question_id}",
    response_model=LearningQuestionRead,
    status_code=status.HTTP_200_OK,
    summary="Get Learning Question details by ID"
)
async def get_learning_question(
    question_id: uuid.UUID,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> LearningQuestionRead:
    """Retrieves learning question details and increments view count."""
    service = LearningQuestionService(db)
    return await service.get_question_by_id(question_id, current_user)


@router.put(
    "/{question_id}",
    response_model=LearningQuestionRead,
    status_code=status.HTTP_200_OK,
    summary="Full update of a Learning Question"
)
@router.patch(
    "/{question_id}",
    response_model=LearningQuestionRead,
    status_code=status.HTTP_200_OK,
    summary="Partial update of a Learning Question"
)
async def update_learning_question(
    question_id: uuid.UUID,
    update_in: LearningQuestionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> LearningQuestionRead:
    """Updates learning question details or status (Author only)."""
    service = LearningQuestionService(db)
    await service.update_question(question_id, update_in, current_user)
    return await service.get_question_by_id(question_id, current_user)


@router.delete(
    "/{question_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft delete a Learning Question"
)
async def delete_learning_question(
    question_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """Soft deletes learning question (Author only)."""
    service = LearningQuestionService(db)
    await service.delete_question(question_id, current_user)


@router.post(
    "/{question_id}/like",
    response_model=ReactionToggleResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle LIKE reaction on a Learning Question"
)
async def toggle_question_like(
    question_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ReactionToggleResponse:
    """Toggles Like reaction on a learning question."""
    service = LearningQuestionService(db)
    return await service.toggle_like(question_id, current_user)


@router.post(
    "/{question_id}/save",
    response_model=SavedItemToggleResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle Bookmark / Save state on a Learning Question"
)
async def toggle_question_save(
    question_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> SavedItemToggleResponse:
    """Toggles Saved item bookmark on a learning question."""
    service = LearningQuestionService(db)
    return await service.toggle_save(question_id, current_user)


# =========================================================
# UNLIMITED NESTED REPLIES ENDPOINTS
# =========================================================

@router.post(
    "/{question_id}/replies",
    response_model=QuestionReplyRead,
    status_code=status.HTTP_201_CREATED,
    summary="Post a reply (Supports unlimited nesting via parent_reply_id)"
)
async def post_reply(
    question_id: uuid.UUID,
    reply_in: QuestionReplyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> QuestionReplyRead:
    """Posts a top-level or nested reply to a learning question."""
    service = NestedReplyService(db)
    reply = await service.create_reply(question_id, reply_in, current_user)
    return QuestionReplyRead.model_validate(reply)


@router.get(
    "/{question_id}/replies",
    response_model=QuestionReplyTreeResponse,
    status_code=status.HTTP_200_OK,
    summary="Get full nested reply tree hierarchy for a Learning Question"
)
async def get_reply_tree(
    question_id: uuid.UUID,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> QuestionReplyTreeResponse:
    """Retrieves full nested reply tree structure (GitHub Discussions / Reddit style)."""
    service = NestedReplyService(db)
    return await service.get_reply_tree_for_question(question_id, current_user)


@router.patch(
    "/{question_id}/replies/{reply_id}",
    response_model=QuestionReplyRead,
    status_code=status.HTTP_200_OK,
    summary="Update a reply content"
)
async def update_reply(
    question_id: uuid.UUID,
    reply_id: uuid.UUID,
    reply_in: QuestionReplyUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> QuestionReplyRead:
    """Updates reply text (Author only)."""
    service = NestedReplyService(db)
    reply = await service.update_reply(reply_id, reply_in, current_user)
    return QuestionReplyRead.model_validate(reply)


@router.delete(
    "/{question_id}/replies/{reply_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft delete a reply"
)
async def delete_reply(
    question_id: uuid.UUID,
    reply_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """Soft deletes reply (Author only)."""
    service = NestedReplyService(db)
    await service.delete_reply(reply_id, current_user)


@router.post(
    "/{question_id}/replies/{reply_id}/like",
    response_model=ReactionToggleResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle LIKE reaction on a reply"
)
async def toggle_reply_like(
    question_id: uuid.UUID,
    reply_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ReactionToggleResponse:
    """Toggles Like reaction on a reply."""
    service = NestedReplyService(db)
    return await service.toggle_like(reply_id, current_user)


@router.post(
    "/{question_id}/replies/{reply_id}/accept",
    response_model=QuestionReplyRead,
    status_code=status.HTTP_200_OK,
    summary="Mark reply as Accepted Answer (Question Author only)"
)
async def mark_accepted_answer(
    question_id: uuid.UUID,
    reply_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> QuestionReplyRead:
    """Marks reply as accepted answer and updates question status to SOLVED (Question Author only)."""
    service = NestedReplyService(db)
    return await service.mark_accepted_answer(question_id, reply_id, current_user)
