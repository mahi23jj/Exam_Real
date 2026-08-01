import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_current_user_optional
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.course import (
    CourseCreate,
    CourseUpdate,
    CourseRead,
    CourseListResponse,
    ExploreCourseListResponse,
    FollowingCourseListResponse,
    MyCourseListResponse,
    ContinueItemListResponse,
    ContinueItemRead,
    TrackStudyItemRequest,
)
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
    """Creates a new course entity in ExamReal AI."""
    service = CourseService(db)
    course = await service.create_course(course_in, current_user)
    return CourseRead.model_validate(course)


@router.get(
    "/explore",
    response_model=ExploreCourseListResponse,
    status_code=status.HTTP_200_OK,
    summary="Explore public courses with rich statistics and follow status"
)
async def explore_courses(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search courses, categories, or creators"),
    category: Optional[str] = Query(None, description="Filter by subject/category"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
) -> ExploreCourseListResponse:
    """Retrieves paginated public course cards enriched with creator details, stats, and follow status."""
    service = CourseService(db)
    viewer_id = current_user.id if current_user else None
    return await service.explore_courses(
        page=page,
        size=size,
        search=search,
        category=category,
        viewer_id=viewer_id
    )


@router.get(
    "/following",
    response_model=FollowingCourseListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get courses followed by the current user"
)
async def get_following_courses(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> FollowingCourseListResponse:
    """Retrieves paginated list of courses the authenticated user follows."""
    service = CourseService(db)
    return await service.get_following_courses(
        follower_id=current_user.id,
        page=page,
        size=size
    )


@router.get(
    "/my-courses",
    response_model=MyCourseListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get courses created by the current user"
)
async def get_my_courses(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> MyCourseListResponse:
    """Retrieves paginated list of courses created by the authenticated user."""
    service = CourseService(db)
    return await service.get_my_courses(
        creator_id=current_user.id,
        page=page,
        size=size
    )


@router.get(
    "/continue",
    response_model=ContinueItemListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get recently opened study items for the Continue Section"
)
async def get_continue_items(
    limit: int = Query(10, ge=1, le=30, description="Maximum items to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ContinueItemListResponse:
    """Retrieves recently opened study items (courses, documents, past exams)."""
    service = CourseService(db)
    return await service.get_continue_items(user_id=current_user.id, limit=limit)


@router.post(
    "/continue/track",
    response_model=ContinueItemRead,
    status_code=status.HTTP_200_OK,
    summary="Track a user opening a course, document, or past exam"
)
async def track_study_item(
    req: TrackStudyItemRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ContinueItemRead:
    """Records a study interaction to display in the Continue Section."""
    service = CourseService(db)
    item = await service.track_study_item(user_id=current_user.id, req=req)
    return ContinueItemRead.model_validate(item)


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
    """Retrieves basic paginated list of courses."""
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
    """Updates course title, code, description, category, or visibility."""
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
