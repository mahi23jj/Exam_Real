"""Chronological feed queries that merge questions and pins.

A feed has to interleave two separate tables. Fetching each table's page
separately and merging in Python silently corrupts pagination (page 2 would skip
or repeat rows), so the merge happens in SQL with ``UNION ALL``: ordering,
``LIMIT`` and ``OFFSET`` all apply to the combined result set.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional, Sequence, Tuple

from sqlalchemy import Select, and_, func, literal, or_, select, union_all
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.social import (
    Follow,
    KnowledgePin,
    LearningQuestion,
    TargetType,
    Visibility,
)

# Which table a feed row came from.
SOURCE_PIN = "pin"
SOURCE_QUESTION = "question"

# Scope/content-type values, mirroring the schema enums without importing them
# (the repository stays independent of the presentation layer).
SCOPE_EVERYONE = "everyone"
SCOPE_FOLLOWING = "following"
TYPE_ALL = "all"
TYPE_QUESTIONS = "questions"
TYPE_PINS = "pins"


class FeedRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def followed_user_ids(self, viewer_id: uuid.UUID) -> List[uuid.UUID]:
        statement = select(Follow.target_id).where(
            and_(
                Follow.follower_id == viewer_id,
                Follow.target_type == TargetType.USER,
            )
        )
        return list((await self.session.execute(statement)).scalars().all())

    def _visibility_clause(
        self,
        visibility_column,
        author_column,
        viewer_id: uuid.UUID,
        followed_ids: Sequence[uuid.UUID],
        scope: str,
    ):
        """Visibility predicate shared by both branches of the union.

        ``everyone``  -> public content only.
        ``following`` -> content from followed authors plus the viewer's own.
        """
        if scope == SCOPE_EVERYONE:
            return visibility_column == Visibility.PUBLIC
        return and_(
            visibility_column == Visibility.PUBLIC,
            author_column.in_(list(followed_ids) + [viewer_id]),
        )

    def _pin_branch(
        self,
        viewer_id: uuid.UUID,
        followed_ids: Sequence[uuid.UUID],
        scope: str,
        search: Optional[str],
        author_id_filter: Optional[uuid.UUID] = None,
    ) -> Select:
        author_id = KnowledgePin.author_id
        created_at = KnowledgePin.created_at

        visibility = self._visibility_clause(
            KnowledgePin.visibility, author_id, viewer_id, followed_ids, scope
        )

        statement = select(
            KnowledgePin.id.label("id"),
            literal(SOURCE_PIN).label("content_type"),
            author_id.label("author_id"),
            created_at.label("created_at"),
        ).where(and_(KnowledgePin.is_active.is_(True), visibility))

        # Person filter: one selected author (the "Following rail" selection).
        if author_id_filter is not None:
            statement = statement.where(author_id == author_id_filter)

        if search:
            term = f"%{search.strip().lower()}%"
            statement = statement.where(
                or_(
                    func.lower(KnowledgePin.title).like(term),
                    func.lower(KnowledgePin.content).like(term),
                )
            )
        return statement

    def _question_branch(
        self,
        viewer_id: uuid.UUID,
        followed_ids: Sequence[uuid.UUID],
        scope: str,
        search: Optional[str],
        author_id_filter: Optional[uuid.UUID] = None,
    ) -> Select:
        author_id = LearningQuestion.author_id
        created_at = LearningQuestion.created_at

        visibility = self._visibility_clause(
            LearningQuestion.visibility, author_id, viewer_id, followed_ids, scope
        )

        statement = select(
            LearningQuestion.id.label("id"),
            literal(SOURCE_QUESTION).label("content_type"),
            author_id.label("author_id"),
            created_at.label("created_at"),
        ).where(and_(LearningQuestion.is_active.is_(True), visibility))

        # Person filter: one selected author (the "Following rail" selection).
        if author_id_filter is not None:
            statement = statement.where(author_id == author_id_filter)

        if search:
            term = f"%{search.strip().lower()}%"
            statement = statement.where(
                or_(
                    func.lower(LearningQuestion.title).like(term),
                    func.lower(LearningQuestion.content).like(term),
                )
            )
        return statement

    async def list_feed(
        self,
        viewer_id: uuid.UUID,
        scope: str = SCOPE_EVERYONE,
        content_type: str = TYPE_ALL,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
        followed_ids: Optional[Sequence[uuid.UUID]] = None,
        author_id: Optional[uuid.UUID] = None,
    ) -> Tuple[List[Tuple[uuid.UUID, str, uuid.UUID, datetime]], int]:
        """Returns ``(rows, total)`` newest-first across pins and questions."""
        if followed_ids is None:
            followed_ids = await self.followed_user_ids(viewer_id)
        followed_ids = list(followed_ids)

        branches = []
        if content_type in (TYPE_ALL, TYPE_PINS):
            branches.append(
                self._pin_branch(viewer_id, followed_ids, scope, search, author_id)
            )
        if content_type in (TYPE_ALL, TYPE_QUESTIONS):
            branches.append(
                self._question_branch(viewer_id, followed_ids, scope, search, author_id)
            )

        if not branches:
            return [], 0

        combined = branches[0]
        for extra in branches[1:]:
            combined = union_all(combined, extra)

        # Always wrap in a subquery so ordering/limit/offset apply to the merged
        # set even when only one branch is active.
        combined_subq = combined.subquery("feed_combined")
        ordered = select(
            combined_subq.c.id,
            combined_subq.c.content_type,
            combined_subq.c.author_id,
            combined_subq.c.created_at,
        ).order_by(
            combined_subq.c.created_at.desc(),
            combined_subq.c.id.desc(),
        )

        total = await self._count(combined_subq)

        paged = ordered.offset(skip).limit(limit)
        rows = (await self.session.execute(paged)).all()
        return list(rows), total

    async def _count(self, combined) -> int:
        statement = select(func.count()).select_from(combined)
        return (await self.session.execute(statement)).scalar_one() or 0

    async def load_items(
        self,
        pin_ids: Sequence[uuid.UUID],
        question_ids: Sequence[uuid.UUID],
    ) -> Tuple[List[KnowledgePin], List[LearningQuestion]]:
        """Loads the full rows for a page of ids, preserving id sets."""
        from sqlalchemy.orm import selectinload

        pins: List[KnowledgePin] = []
        questions: List[LearningQuestion] = []
        if pin_ids:
            pins = list(
                (
                    await self.session.execute(
                        select(KnowledgePin)
                        .options(selectinload(KnowledgePin.author))
                        .where(KnowledgePin.id.in_(list(pin_ids)))
                    )
                )
                .scalars()
                .all()
            )
        if question_ids:
            questions = list(
                (
                    await self.session.execute(
                        select(LearningQuestion)
                        .options(selectinload(LearningQuestion.author))
                        .where(LearningQuestion.id.in_(list(question_ids)))
                    )
                )
                .scalars()
                .all()
            )
        return pins, questions

    async def load_reply_counts(
        self, question_ids: Sequence[uuid.UUID]
    ) -> dict:
        from app.db.models.social import QuestionReply

        if not question_ids:
            return {}
        statement = (
            select(
                QuestionReply.question_id,
                func.count(QuestionReply.id),
            )
            .where(
                and_(
                    QuestionReply.question_id.in_(list(question_ids)),
                    QuestionReply.is_active.is_(True),
                )
            )
            .group_by(QuestionReply.question_id)
        )
        rows = (await self.session.execute(statement)).all()
        return {row[0]: row[1] for row in rows}