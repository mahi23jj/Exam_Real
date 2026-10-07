"""Community (people discovery) queries.

Recommendations are derived from existing relationships only — there is no
persisted recommendation table. Candidates come from:

  A. the viewer's department
  B. courses the viewer follows (shared courses)

Everything is computed with a bounded number of aggregate queries so a page of
recommendations never triggers per-candidate lookups.
"""

import uuid
from typing import Dict, List, Optional, Tuple

from sqlmodel import select, func, and_, or_
from sqlalchemy import case, exists, false
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.course import Course
from app.db.models.social import Follow, TargetType, Visibility
from app.db.models.user import User
from app.repositories.base import BaseRepository


class CommunityRepository(BaseRepository[User]):
    def __init__(self, session: AsyncSession):
        super().__init__(User, session)

    # ── People discovery ───────────────────────────────────────────────────────

    async def list_recommended_users(
        self,
        viewer: User,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[Tuple[User, int]], int]:
        """Returns one page of ``(candidate, shared_course_count)`` plus the total.

        Ranking:
          1. same department *and* shared courses
          2. shared courses only
          3. same department only

        The viewer is always excluded, as are users the viewer already follows
        and deactivated accounts.
        """
        department = viewer.department

        # Courses the viewer follows — the "shared course" axis.
        viewer_course_ids = (
            select(Follow.target_id).where(
                and_(
                    Follow.follower_id == viewer.id,
                    Follow.target_type == TargetType.COURSE,
                )
            )
        )

        # Users who follow at least one of those courses. Only PUBLIC courses
        # count, so a private course never surfaces another student through the
        # discovery surface.
        shared_course_peer_ids = (
            select(Follow.follower_id)
            .join(
                Course,
                and_(
                    Course.id == Follow.target_id,
                    Course.is_active == True,
                    Course.visibility == Visibility.PUBLIC,
                ),
            )
            .where(
                and_(
                    Follow.target_type == TargetType.COURSE,
                    Follow.target_id.in_(viewer_course_ids),
                )
            )
        )

        # Users the viewer already follows — never recommended again.
        already_following = (
            select(Follow.target_id).where(
                and_(
                    Follow.follower_id == viewer.id,
                    Follow.target_type == TargetType.USER,
                )
            )
        )

        same_department = (
            User.department == department
            if department
            else false()
        )
        has_shared_course = User.id.in_(shared_course_peer_ids)

        shared_course_count = (
            select(func.count(Follow.id))
            .join(
                Course,
                and_(
                    Course.id == Follow.target_id,
                    Course.is_active == True,
                    Course.visibility == Visibility.PUBLIC,
                ),
            )
            .where(
                and_(
                    Follow.follower_id == User.id,
                    Follow.target_type == TargetType.COURSE,
                    Follow.target_id.in_(viewer_course_ids),
                )
            )
            .correlate(User)
            .scalar_subquery()
        )

        statement = (
            select(User, shared_course_count.label("shared_course_count"))
            .where(
                User.id != viewer.id,
                User.is_active == True,
                ~User.id.in_(already_following),
                or_(same_department, has_shared_course),
            )
            .order_by(
                case(
                    (and_(same_department, has_shared_course), 0),
                    (has_shared_course, 1),
                    (same_department, 2),
                    else_=3,
                ),
                shared_course_count.desc(),
                User.created_at.desc(),
                User.id,
            )
        )

        count_statement = select(func.count()).select_from(statement.subquery())
        total_result = await self.session.execute(count_statement)
        total = total_result.scalar_one() or 0

        paged = statement.offset(skip).limit(limit)
        result = await self.session.execute(paged)
        rows = list(result.all())

        return [(row[0], row[1] or 0) for row in rows], total

    async def get_shared_courses_for_users(
        self,
        viewer_course_ids: List[uuid.UUID],
        candidate_ids: List[uuid.UUID],
    ) -> Dict[uuid.UUID, List[Course]]:
        """Public course details shared with the viewer, per candidate, in one query.

        Restricted to PUBLIC courses because the result is rendered on discovery
        cards that other students can see.
        """
        if not viewer_course_ids or not candidate_ids:
            return {}

        statement = (
            select(Follow.follower_id, Course)
            .join(
                Course,
                and_(
                    Course.id == Follow.target_id,
                    Course.is_active == True,
                    Course.visibility == Visibility.PUBLIC,
                )
            )
            .where(
                and_(
                    Follow.target_type == TargetType.COURSE,
                    Follow.follower_id.in_(candidate_ids),
                    Follow.target_id.in_(viewer_course_ids),
                )
            )
            .order_by(Course.title.asc())
        )
        result = await self.session.execute(statement)
        return self._group_courses_by_user(result.all())

    async def get_viewer_course_ids(self, viewer_id: uuid.UUID) -> List[uuid.UUID]:
        statement = select(Follow.target_id).where(
            and_(
                Follow.follower_id == viewer_id,
                Follow.target_type == TargetType.COURSE,
            )
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())

    # ── Profile study context ──────────────────────────────────────────────────

    async def list_user_courses(
        self,
        user_id: uuid.UUID,
        include_private: bool = False,
    ) -> List[Course]:
        """Courses the student follows plus courses they created.

        Private courses are visible only to their creator, so a viewer always
        sees another student's public courses. When ``include_private`` is set
        (self-profile) every course is returned.
        """
        followed_by_user = exists().where(
            and_(
                Follow.follower_id == user_id,
                Follow.target_type == TargetType.COURSE,
                Follow.target_id == Course.id,
            )
        )

        filters = [
            Course.is_active == True,
            or_(Course.created_by_user_id == user_id, followed_by_user),
        ]
        if not include_private:
            # PRIVATE means only-me, so another viewer's profile shows public
            # courses only -- including courses this student created.
            filters.append(Course.visibility == Visibility.PUBLIC)

        statement = (
            select(Course)
            .where(and_(*filters))
            .order_by(Course.title.asc())
        )

        result = await self.session.execute(statement)
        return list(result.scalars().all())

    @staticmethod
    def _group_courses_by_user(rows) -> Dict[uuid.UUID, List[Course]]:
        grouped: Dict[uuid.UUID, List[Course]] = {}
        for user_id, course in rows:
            grouped.setdefault(user_id, []).append(course)
        return grouped
