import uuid
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.db.models.course import Course
from app.db.models.user import User, UserRole
from app.repositories.course_repository import CourseRepository
from app.schemas.course import CourseCreate, CourseUpdate, CourseListResponse, CourseRead


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

    async def create_course(self, course_in: CourseCreate, current_user: User) -> Course:
        """Creates a new course entity."""
        existing = await self.course_repo.get_by_code(course_in.code)
        if existing:
            raise CourseCodeExistsException()

        course = Course(
            code=course_in.code.upper().strip(),
            title=course_in.title.strip(),
            description=course_in.description,
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

    async def update_course(self, course_id: uuid.UUID, course_update: CourseUpdate, current_user: User) -> Course:
        course = await self.get_course_by_id(course_id)

        # Check ownership (only creator or admin can update)
        if course.created_by_user_id != current_user.id and current_user.role != UserRole.ADMIN:
            raise UnauthorizedCourseAccessException()

        update_dict = course_update.model_dump(exclude_unset=True)
        if "code" in update_dict:
            update_dict["code"] = update_dict["code"].upper().strip()
            existing = await self.course_repo.get_by_code(update_dict["code"])
            if existing and existing.id != course_id:
                raise CourseCodeExistsException()

        return await self.course_repo.update(course, update_dict)

    async def delete_course(self, course_id: uuid.UUID, current_user: User) -> None:
        course = await self.get_course_by_id(course_id)

        # Check ownership
        if course.created_by_user_id != current_user.id and current_user.role != UserRole.ADMIN:
            raise UnauthorizedCourseAccessException()

        # Soft delete
        await self.course_repo.update(course, {"is_active": False})
