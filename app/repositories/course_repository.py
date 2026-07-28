import uuid
from typing import Optional, List, Tuple
from sqlmodel import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.course import Course
from app.repositories.base import BaseRepository


class CourseRepository(BaseRepository[Course]):
    def __init__(self, session: AsyncSession):
        super().__init__(Course, session)

    async def get_by_code(self, code: str) -> Optional[Course]:
        statement = select(Course).where(Course.code == code.upper().strip(), Course.is_active == True)
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def get_active_by_id(self, id: uuid.UUID) -> Optional[Course]:
        statement = select(Course).where(Course.id == id, Course.is_active == True)
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def list_courses(self, skip: int = 0, limit: int = 20, search: Optional[str] = None) -> Tuple[List[Course], int]:
        statement = select(Course).where(Course.is_active == True)
        if search:
            search_pattern = f"%{search.strip()}%"
            statement = statement.where(
                (Course.title.ilike(search_pattern)) | (Course.code.ilike(search_pattern))
            )

        # Count total
        count_stmt = select(func.count()).select_from(statement.subquery())
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar_one()

        statement = statement.offset(skip).limit(limit).order_by(Course.created_at.desc())
        results = await self.session.execute(statement)
        courses = list(results.scalars().all())

        return courses, total
