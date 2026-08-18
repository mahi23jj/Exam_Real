import re
import uuid
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.db.models.course import Course
from app.db.models.user import User
from app.db.models.study_history import RecentStudyItem
from app.repositories.course_repository import CourseRepository
from app.repositories.study_history_repository import RecentStudyItemRepository
from app.schemas.course import (
    CourseCreate,
    CourseUpdate,
    CourseListResponse,
    CourseRead,
    ExploreCourseListResponse,
    ExploreCourseCardRead,
    FollowingCourseListResponse,
    FollowingCourseCardRead,
    MyCourseListResponse,
    MyCourseCardRead,
    ContinueItemListResponse,
    ContinueItemRead,
    TrackStudyItemRequest,
)


class CourseNotFoundException(HTTPException):
    def __init__(self):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")


class CourseCodeExistsException(HTTPException):
    def __init__(self):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail="A course with this code already exists.")


class UnauthorizedCourseAccessException(HTTPException):
    def __init__(self):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to modify this course.")


class CourseService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.course_repo = CourseRepository(session)
        self.study_repo = RecentStudyItemRepository(session)

    async def _generate_unique_code(self, title: str) -> str:
        """Builds a course code from the title plus a random suffix, retrying on collision."""
        prefix = re.sub(r"[^A-Za-z0-9]", "", title).upper()[:8] or "COURSE"
        for _ in range(10):
            code = f"{prefix}-{uuid.uuid4().hex[:6].upper()}"
            if not await self.course_repo.code_exists(code):
                return code
        raise CourseCodeExistsException()

    async def create_course(self, course_in: CourseCreate, current_user: User) -> Course:
        """Creates a new course entity with a server-generated code."""
        course = Course(
            code=await self._generate_unique_code(course_in.title),
            title=course_in.title.strip(),
            description=course_in.description,
            category=course_in.category.strip() if course_in.category else None,
            visibility=course_in.visibility,
            created_by_user_id=current_user.id,
            is_active=True
        )
        return await self.course_repo.create(course)

    async def get_course_by_id(self, course_id: uuid.UUID) -> Course:
        course = await self.course_repo.get_active_by_id(course_id)
        if not course:
            raise CourseNotFoundException()
        return course

    async def list_courses(self, page: int = 1, size: int = 20, search: Optional[str] = None) -> CourseListResponse:
        skip = (page - 1) * size
        courses, total = await self.course_repo.list_courses(skip=skip, limit=size, search=search)
        
        course_reads = [CourseRead.model_validate(c) for c in courses]
        return CourseListResponse(
            items=course_reads,
            total=total,
            page=page,
            size=size
        )

    async def explore_courses(
        self,
        page: int = 1,
        size: int = 20,
        search: Optional[str] = None,
        category: Optional[str] = None,
        viewer_id: Optional[uuid.UUID] = None
    ) -> ExploreCourseListResponse:
        skip = (page - 1) * size
        cards_raw, total = await self.course_repo.list_explore_courses(
            skip=skip,
            limit=size,
            search=search,
            category=category,
            viewer_id=viewer_id
        )
        items = [ExploreCourseCardRead.model_validate(c) for c in cards_raw]
        return ExploreCourseListResponse(
            items=items,
            total=total,
            page=page,
            size=size
        )

    async def get_following_courses(
        self,
        follower_id: uuid.UUID,
        page: int = 1,
        size: int = 20
    ) -> FollowingCourseListResponse:
        skip = (page - 1) * size
        cards_raw, total = await self.course_repo.list_following_courses(
            follower_id=follower_id,
            skip=skip,
            limit=size
        )
        items = [FollowingCourseCardRead.model_validate(c) for c in cards_raw]
        return FollowingCourseListResponse(
            items=items,
            total=total,
            page=page,
            size=size
        )

    async def get_my_courses(
        self,
        creator_id: uuid.UUID,
        page: int = 1,
        size: int = 20
    ) -> MyCourseListResponse:
        skip = (page - 1) * size
        cards_raw, total = await self.course_repo.list_my_courses(
            creator_id=creator_id,
            skip=skip,
            limit=size
        )
        items = [MyCourseCardRead.model_validate(c) for c in cards_raw]
        return MyCourseListResponse(
            items=items,
            total=total,
            page=page,
            size=size
        )

    async def track_study_item(
        self,
        user_id: uuid.UUID,
        req: TrackStudyItemRequest
    ) -> RecentStudyItem:
        return await self.study_repo.upsert_recent_item(
            user_id=user_id,
            item_type=req.item_type,
            item_id=req.item_id,
            title=req.title,
            subtitle=req.subtitle,
            continue_url=req.continue_url
        )

    async def get_continue_items(
        self,
        user_id: uuid.UUID,
        limit: int = 10
    ) -> ContinueItemListResponse:
        recent_items = await self.study_repo.list_recent_items(user_id=user_id, limit=limit)
        items = [ContinueItemRead.model_validate(r) for r in recent_items]
        return ContinueItemListResponse(items=items)

    async def update_course(self, course_id: uuid.UUID, course_update: CourseUpdate, current_user: User) -> Course:
        course = await self.get_course_by_id(course_id)

        # Check ownership (only creator can update)
        if course.created_by_user_id != current_user.id:
            raise UnauthorizedCourseAccessException()

        update_dict = course_update.model_dump(exclude_unset=True)
        if "code" in update_dict and update_dict["code"]:
            update_dict["code"] = update_dict["code"].upper().strip()
            existing = await self.course_repo.get_by_code(update_dict["code"])
            if existing and existing.id != course_id:
                raise CourseCodeExistsException()

        return await self.course_repo.update(course, update_dict)

    async def delete_course(self, course_id: uuid.UUID, current_user: User) -> None:
        course = await self.get_course_by_id(course_id)

        # Check ownership
        if course.created_by_user_id != current_user.id:
            raise UnauthorizedCourseAccessException()

        # Soft delete
        await self.course_repo.update(course, {"is_active": False})
