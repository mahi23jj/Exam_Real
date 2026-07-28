import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.course import CourseCreate, CourseUpdate, CourseRead, CourseListResponse
from app.services.course_service import CourseService

router = APIRouter(prefix="/courses", tags=["Courses"])


@router.post(
    "",
    response_model=CourseRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new course"
)
async def create_course(
    course_in: CourseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> CourseRead:
    """Creates a new course entity in StudyLoop AI."""
    service = CourseService(db)
    course = await service.create_course(course_in, current_user)
    return CourseRead.model_validate(course)


@router.get(
    "",
    response_model=CourseListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all active courses with pagination and search"
)
async def list_courses(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term for course title or code"),
    db: AsyncSession = Depends(get_db)
) -> CourseListResponse:
    """Retrieves paginated list of courses."""
    service = CourseService(db)
    return await service.list_courses(page=page, size=size, search=search)


@router.get(
    "/{course_id}",
    response_model=CourseRead,
    status_code=status.HTTP_200_OK,
    summary="Get course details by ID"
)
async def get_course(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
) -> CourseRead:
    """Retrieves course details by UUID."""
    service = CourseService(db)
    course = await service.get_course_by_id(course_id)
    return CourseRead.model_validate(course)


@router.patch(
    "/{course_id}",
    response_model=CourseRead,
    status_code=status.HTTP_200_OK,
    summary="Update course details"
)
async def update_course(
    course_id: uuid.UUID,
    course_update: CourseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> CourseRead:
    """Updates course title, code, or description."""
    service = CourseService(db)
    updated = await service.update_course(course_id, course_update, current_user)
    return CourseRead.model_validate(updated)


@router.delete(
    "/{course_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete course (Soft delete)"
)
async def delete_course(
    course_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """Deletes a course entity."""
    service = CourseService(db)
    await service.delete_course(course_id, current_user)
