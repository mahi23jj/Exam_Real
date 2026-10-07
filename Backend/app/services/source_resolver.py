"""Resolves the real origin of community content into deep links.

A pin/question row stores a ``document_id`` plus an anchor. On its own that is
not enough to navigate anywhere: the document may have been deleted, or its
course unlinked, and the anchor may no longer exist in the current document
version. This module resolves that in the database (one joined query for a
whole page of content, never one query per row) and produces a
:class:`~app.schemas.social.ContentSourceRead` whose ``can_open`` flag is only
true when a genuine destination exists.
"""

from __future__ import annotations

import uuid
from typing import Any, Dict, Iterable, List, Optional, Sequence, Union
from urllib.parse import urlencode

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.course import Course
from app.db.models.document import Document
from app.db.models.social import KnowledgePin, LearningQuestion, LocationTargetType
from app.schemas.social import ContentSourceRead


class SourceResolver:
    """Builds deep-link sources for pins and questions in bulk."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def load_documents(
        self, document_ids: Iterable[uuid.UUID]
    ) -> Dict[uuid.UUID, Dict[str, Any]]:
        """Fetches document + course data for many documents in one query."""
        ids = {d for d in document_ids if d is not None}
        if not ids:
            return {}

        statement = (
            select(Document.id, Document.title, Document.version, Document.is_active,
                   Document.course_id, Course.id, Course.title, Course.code)
            .outerjoin(Course, Document.course_id == Course.id)
            .where(Document.id.in_(ids))
        )
        rows = (await self.session.execute(statement)).all()

        found: Dict[uuid.UUID, Dict[str, Any]] = {}
        for row in rows:
            (
                document_id,
                document_title,
                document_version,
                document_is_active,
                course_id,
                joined_course_id,
                course_title,
                course_code,
            ) = row
            # Prefer the join result but fall back to the FK: a broken join must
            # not silently erase a course that the document still references.
            resolved_course_id = joined_course_id or course_id
            found[document_id] = {
                "document_title": document_title,
                "document_version": document_version,
                "document_is_active": bool(document_is_active),
                "course_id": resolved_course_id,
                "course_title": course_title,
                "course_code": course_code,
            }
        return found

    async def resolve_many(
        self,
        items: Sequence[Union[KnowledgePin, LearningQuestion]],
    ) -> Dict[uuid.UUID, ContentSourceRead]:
        """Resolves sources for pins/questions, keyed by content id."""
        if not items:
            return {}

        documents = await self.load_documents(item.document_id for item in items)
        return {
            item.id: self._build(item, documents.get(item.document_id))
            for item in items
        }

    def _build(
        self,
        item: Union[KnowledgePin, LearningQuestion],
        document: Optional[Dict[str, Any]],
    ) -> ContentSourceRead:
        has_document = document is not None
        course_id = document.get("course_id") if document else None
        course_title = document.get("course_title") if document else None
        course_code = document.get("course_code") if document else None
        document_title = document.get("document_title") if document else None
        document_version = document.get("document_version") if document else None

        target_type = item.target_type
        target_id = item.target_id
        can_open = self._can_open(
            has_document=has_document,
            document_is_active=bool(document.get("document_is_active")) if document else False,
            course_id=course_id,
            item_version=getattr(item, "document_version", None),
            document_version=document_version,
            target_type=target_type,
            target_id=target_id,
        )

        open_url = None
        if can_open and course_id is not None:
            open_url = self.build_workspace_url(
                course_id=course_id,
                document_id=item.document_id,
                page_number=item.page_number,
                target_type=target_type,
                target_id=target_id,
                selection_start_offset=item.selection_start_offset,
                selection_end_offset=item.selection_end_offset,
                document_version=getattr(item, "document_version", None),
            )

        # can_open and open_url are passed together so the schema's invariant
        # (they must agree) is satisfied by construction.
        return ContentSourceRead(
            document_id=item.document_id,
            document_title=document_title,
            document_version=getattr(item, "document_version", None),
            course_id=course_id,
            course_title=course_title,
            course_code=course_code,
            page_number=item.page_number,
            target_type=target_type,
            target_id=target_id,
            selection_start_offset=item.selection_start_offset,
            selection_end_offset=item.selection_end_offset,
            selected_text_snapshot=item.selected_text_snapshot,
            can_open=can_open and open_url is not None,
            open_url=open_url,
        )

    @staticmethod
    def _can_open(
        *,
        has_document: bool,
        document_is_active: bool,
        course_id: Optional[uuid.UUID],
        item_version: Optional[int],
        document_version: Optional[int],
        target_type: LocationTargetType,
        target_id: Optional[uuid.UUID],
    ) -> bool:
        if not has_document or not document_is_active or not course_id:
            return False
        if target_type is None:
            return False
        # The anchor refers to a specific document version. If that version is
        # gone the offsets point at unrelated text, so we do not deep link.
        if item_version and document_version and item_version != document_version:
            return False
        return True

    @staticmethod
    def build_workspace_url(
        *,
        course_id: uuid.UUID,
        document_id: uuid.UUID,
        page_number: int,
        target_type: Optional[LocationTargetType] = None,
        target_id: Optional[uuid.UUID] = None,
        selection_start_offset: Optional[int] = None,
        selection_end_offset: Optional[int] = None,
        document_version: Optional[int] = None,
    ) -> str:
        params: Dict[str, str] = {"document": str(document_id)}
        if page_number:
            params["page"] = str(page_number)
        if target_type is not None:
            params["target_type"] = LocationTargetType(target_type).value
        if target_id is not None:
            params["target_id"] = str(target_id)
        if selection_start_offset is not None:
            params["selection_start"] = str(selection_start_offset)
        if selection_end_offset is not None:
            params["selection_end"] = str(selection_end_offset)
        if document_version is not None:
            params["version"] = str(document_version)
        return f"/workspace/{course_id}?{urlencode(params)}"


# Module-level helper so callers do not have to own a resolver instance.
async def resolve_sources(
    session: AsyncSession,
    items: Sequence[Union[KnowledgePin, LearningQuestion]],
) -> Dict[uuid.UUID, ContentSourceRead]:
    return await SourceResolver(session).resolve_many(items)


async def attach_sources(
    session: AsyncSession,
    rows: Sequence[Union[KnowledgePin, LearningQuestion]],
    dtos: Sequence[Any],
) -> None:
    """Resolves sources for ``rows`` and assigns them onto the parallel ``dtos``.

    One query resolves the whole page, so cost is constant per page rather than
    per row.
    """
    if not rows or len(rows) != len(dtos):
        return
    sources = await resolve_sources(session, list(rows))
    for row, dto in zip(rows, dtos):
        dto.source = sources.get(row.id)