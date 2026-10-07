"""Shared factories for community tests.

Kept out of the `test_*.py` namespace so pytest does not try to collect it.
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.social import (
    KnowledgePin,
    LearningQuestion,
    LocationTargetType,
    QuestionReply,
    Visibility,
)
from app.db.models.user import User


async def make_user(
    session: AsyncSession,
    *,
    full_name: str = "Other Student",
    department: str = "Computer Science",
    email: Optional[str] = None,
) -> User:
    user = User(
        email=email or f"u{uuid.uuid4().hex[:10]}@example.com",
        full_name=full_name,
        department=department,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def make_question(
    session: AsyncSession,
    author: User,
    *,
    title: str = "Why does this join duplicate rows?",
    content: str = "The join returns two rows for one result.",
    visibility: Visibility = Visibility.PUBLIC,
    created_at: Optional[datetime] = None,
    document_id: Optional[uuid.UUID] = None,
    page_number: int = 1,
) -> LearningQuestion:
    question = LearningQuestion(
        author_id=author.id,
        document_id=document_id or uuid.uuid4(),
        document_version=1,
        page_number=page_number,
        target_type=LocationTargetType.PARAGRAPH,
        title=title,
        content=content,
        visibility=visibility,
    )
    if created_at is not None:
        question.created_at = created_at
    session.add(question)
    await session.commit()
    await session.refresh(question)
    return question


async def make_pin(
    session: AsyncSession,
    author: User,
    *,
    title: str = "Remember the transform",
    content: str = "Always normalise before comparing vectors.",
    visibility: Visibility = Visibility.PUBLIC,
    created_at: Optional[datetime] = None,
    document_id: Optional[uuid.UUID] = None,
) -> KnowledgePin:
    pin = KnowledgePin(
        author_id=author.id,
        document_id=document_id or uuid.uuid4(),
        document_version=1,
        page_number=1,
        target_type=LocationTargetType.PARAGRAPH,
        title=title,
        content=content,
        visibility=visibility,
    )
    if created_at is not None:
        pin.created_at = created_at
    session.add(pin)
    await session.commit()
    await session.refresh(pin)
    return pin


async def make_reply(
    session: AsyncSession,
    question: LearningQuestion,
    author: User,
    *,
    content: str = "Here is the answer.",
    parent_reply_id: Optional[uuid.UUID] = None,
) -> QuestionReply:
    reply = QuestionReply(
        question_id=question.id,
        author_id=author.id,
        content=content,
        parent_reply_id=parent_reply_id,
    )
    session.add(reply)
    await session.commit()
    await session.refresh(reply)
    return reply


def staggered_times(count: int) -> list[datetime]:
    """Ascending timestamps, newest last, one minute apart."""
    base = datetime(2026, 1, 1, 12, 0, 0)
    return [base + timedelta(minutes=i) for i in range(count)]
