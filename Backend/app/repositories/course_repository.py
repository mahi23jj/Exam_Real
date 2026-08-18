import uuid
from typing import Optional, List, Tuple, Dict, Any
from sqlmodel import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import case

from app.db.models.course import Course
from app.db.models.user import User
from app.db.models.document import Document, DocumentType
from app.db.models.social import Follow, TargetType, Visibility
from app.repositories.base import BaseRepository


class CourseRepository(BaseRepository[Course]):
    def __init__(self, session: AsyncSession):
        super().__init__(Course, session)

    async def get_by_code(self, code: str) -> Optional[Course]:
        statement = (
            select(Course)
            .options(selectinload(Course.created_by))
            .where(Course.code == code.upper().strip(), Course.is_active == True)
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def get_active_by_id(self, id: uuid.UUID) -> Optional[Course]:
        statement = (
            select(Course)
            .options(selectinload(Course.created_by))
            .where(Course.id == id)
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def list_explore_courses(
        self,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        category: Optional[str] = None,
        viewer_id: Optional[uuid.UUID] = None
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Lists public active courses for Explore.

        Rules:
        - Never show the viewer's own courses.
        - Never show courses already followed by the viewer.
        - Prioritize courses whose category matches a course followed by the viewer.
        - Then show other public courses.
        - Supports search, category filtering, pagination, and enrichment.
        """

        # ---------------------------------------------------------
        # Base query
        # ---------------------------------------------------------
        statement = (
            select(Course)
            .options(selectinload(Course.created_by))
            .join(User, Course.created_by_user_id == User.id)
            .where(
                Course.is_active == True,
                Course.visibility == Visibility.PUBLIC,
            )
        )

        # ---------------------------------------------------------
        # Viewer-specific exclusions and related-course ranking
        # ---------------------------------------------------------
        related_categories_subquery = None

        if viewer_id:

            # Courses already followed by the viewer
            followed_courses_subquery = (
                select(Follow.target_id)
                .where(
                    Follow.follower_id == viewer_id,
                    Follow.target_type == TargetType.COURSE,
                )
            )

            # Never show courses the viewer already follows
            statement = statement.where(
                ~Course.id.in_(followed_courses_subquery)
            )

            # Never show courses created by the viewer
            statement = statement.where(
                Course.created_by_user_id != viewer_id
            )

            # Get categories of courses followed by the viewer.
            #
            # These categories are used to prioritize related courses.
            related_categories_subquery = (
                select(Course.category)
                .join(
                    Follow,
                    and_(
                        Follow.target_id == Course.id,
                        Follow.target_type == TargetType.COURSE,
                    )
                )
                .where(
                    Follow.follower_id == viewer_id,
                    Course.is_active == True,
                    Course.visibility == Visibility.PUBLIC,
                    Course.category.is_not(None),
                )
                .distinct()
            )

            # Related courses first, then other courses.
            statement = statement.order_by(
                case(
                    (
                        Course.category.in_(related_categories_subquery),
                        0,
                    ),
                    else_=1,
                ),
                Course.created_at.desc(),
            )

        else:
            # No logged-in viewer:
            # simply show newest public courses.
            statement = statement.order_by(
                Course.created_at.desc()
            )

        # ---------------------------------------------------------
        # Category filter
        # ---------------------------------------------------------
        if category:
            statement = statement.where(
                Course.category.ilike(category.strip())
            )

        # ---------------------------------------------------------
        # Search
        # ---------------------------------------------------------
        if search:
            search_pattern = f"%{search.strip()}%"

            statement = statement.where(
                or_(
                    Course.title.ilike(search_pattern),
                    Course.code.ilike(search_pattern),
                    Course.category.ilike(search_pattern),
                    User.full_name.ilike(search_pattern),
                )
            )

        # ---------------------------------------------------------
        # Count
        # ---------------------------------------------------------
        count_stmt = select(
            func.count()
        ).select_from(
            statement.order_by(None).subquery()
        )

        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar_one()

        # ---------------------------------------------------------
        # Pagination
        # ---------------------------------------------------------
        statement = statement.offset(skip).limit(limit)

        results = await self.session.execute(statement)
        courses = list(results.scalars().all())

        # ---------------------------------------------------------
        # Enrich cards
        # ---------------------------------------------------------
        enriched = await self._enrich_course_cards(
            courses,
            viewer_id=viewer_id,
        )

        return enriched, total

    async def list_following_courses(
        self,
        follower_id: uuid.UUID,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Lists active courses followed by the given user."""
        statement = (
            select(Course)
            .options(selectinload(Course.created_by))
            .join(Follow, and_(Follow.target_id == Course.id, Follow.target_type == TargetType.COURSE))
            .where(Follow.follower_id == follower_id, Course.is_active == True)
        )

        count_stmt = select(func.count()).select_from(statement.subquery())
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar_one()

        statement = statement.offset(skip).limit(limit).order_by(Course.created_at.desc())
        results = await self.session.execute(statement)
        courses = list(results.scalars().all())

        enriched = await self._enrich_course_cards(courses, viewer_id=follower_id, is_following_override=True)
        return enriched, total

    async def list_my_courses(
        self,
        creator_id: uuid.UUID,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Lists courses created by the specified user."""
        statement = (
            select(Course)
            .options(selectinload(Course.created_by))
            .where(Course.created_by_user_id == creator_id)
        )

        count_stmt = select(func.count()).select_from(statement.subquery())
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar_one()

        statement = statement.offset(skip).limit(limit).order_by(Course.created_at.desc())
        results = await self.session.execute(statement)
        courses = list(results.scalars().all())

        enriched = await self._enrich_course_cards(courses, viewer_id=creator_id)
        return enriched, total

    async def _enrich_course_cards(
        self,
        courses: List[Course],
        viewer_id: Optional[uuid.UUID] = None,
        is_following_override: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        """Batched aggregation helper to compute materials, past exams, and followers counts."""
        if not courses:
            return []

        course_ids = [c.id for c in courses]

        # 1. Batch materials count
        mat_stmt = (
            select(Document.course_id, func.count(Document.id))
            .where(Document.course_id.in_(course_ids), Document.is_active == True)
            .group_by(Document.course_id)
        )
        mat_res = await self.session.execute(mat_stmt)
        materials_map = dict(mat_res.all())

        # 2. Batch past exams count
        exam_stmt = (
            select(Document.course_id, func.count(Document.id))
            .where(
                Document.course_id.in_(course_ids),
                Document.doc_type == DocumentType.PAST_EXAM,
                Document.is_active == True
            )
            .group_by(Document.course_id)
        )
        exam_res = await self.session.execute(exam_stmt)
        exams_map = dict(exam_res.all())

        # 3. Batch followers count
        fol_stmt = (
            select(Follow.target_id, func.count(Follow.id))
            .where(
                Follow.target_type == TargetType.COURSE,
                Follow.target_id.in_(course_ids)
            )
            .group_by(Follow.target_id)
        )
        fol_res = await self.session.execute(fol_stmt)
        followers_map = dict(fol_res.all())

        # 4. Batch is_following check
        following_set = set()
        if viewer_id and is_following_override is None:
            v_stmt = select(Follow.target_id).where(
                Follow.follower_id == viewer_id,
                Follow.target_type == TargetType.COURSE,
                Follow.target_id.in_(course_ids)
            )
            v_res = await self.session.execute(v_stmt)
            following_set = set(v_res.scalars().all())

        cards = []
        for c in courses:
            creator_data = {
                "id": c.created_by.id if c.created_by else c.created_by_user_id,
                "full_name": c.created_by.full_name if c.created_by else "Unknown"
            }
            stats_data = {
                "followers_count": followers_map.get(c.id, 0),
                "materials_count": materials_map.get(c.id, 0),
                "past_exams_count": exams_map.get(c.id, 0)
            }
            is_following = is_following_override if is_following_override is not None else (c.id in following_set)

            cards.append({
                "id": c.id,
                "code": c.code,
                "title": c.title,
                "description": c.description,
                "category": c.category,
                "visibility": c.visibility,
                "creator": creator_data,
                "stats": stats_data,
                "is_following": is_following,
                "latest_update": None,
                "open_url": f"/courses/{c.code.lower()}",
                "created_at": c.created_at
            })

        return cards
