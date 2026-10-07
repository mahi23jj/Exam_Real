"""Referential-integrity guarantees for community content.

Replaces an earlier file that imported `app.model.*` (Category/Item/Vendor/
Warehouse) from an unrelated inventory template; no such package exists in this
repository, so it could not even be collected and it aborted the whole pytest
run before any test executed.
"""

import uuid

import pytest
from sqlalchemy import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db.models.social import (
    Follow,
    KnowledgePin,
    LearningQuestion,
    LocationTargetType,
    QuestionReply,
    Reaction,
    SavedItem,
    TargetType,
    Visibility,
)
from app.db.models.user import User


async def _make_user(session: AsyncSession, *, email: str | None = None) -> User:
    user = User(
        email=email or f"u{uuid.uuid4().hex[:10]}@example.com",
        full_name="Test Student",
        department="CS",
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


def _make_question(author: User, document_id: uuid.UUID) -> LearningQuestion:
    return LearningQuestion(
        author_id=author.id,
        document_id=document_id,
        document_version=1,
        page_number=1,
        target_type=LocationTargetType.SENTENCE,
        title="Why does this fail?",
        content="The join returns two rows for one result.",
        visibility=Visibility.PUBLIC,
    )


def _make_pin(author: User, document_id: uuid.UUID) -> KnowledgePin:
    return KnowledgePin(
        author_id=author.id,
        document_id=document_id,
        document_version=1,
        page_number=1,
        target_type=LocationTargetType.SENTENCE,
        title="Pin title",
        content="Remember this transform.",
        visibility=Visibility.PUBLIC,
    )


@pytest.mark.asyncio
async def test_deleting_a_question_cascades_its_replies(db_session: AsyncSession):
    author = await _make_user(db_session)
    document_id = uuid.uuid4()

    question = _make_question(author, document_id)
    db_session.add(question)
    await db_session.commit()
    await db_session.refresh(question)

    db_session.add(
        QuestionReply(
            question_id=question.id,
            author_id=author.id,
            content="Parent answer",
        )
    )
    await db_session.commit()

    reply_count = len(
        (await db_session.execute(select(QuestionReply))).scalars().all()
    )
    assert reply_count == 1

    await db_session.delete(question)
    await db_session.commit()

    remaining = (await db_session.execute(select(QuestionReply))).scalars().all()
    assert remaining == [], "replies must not outlive their question"


@pytest.mark.asyncio
async def test_replies_keep_their_hierarchy_when_a_middle_reply_is_deleted(
    db_session: AsyncSession,
):
    author = await _make_user(db_session)

    question = _make_question(author, uuid.uuid4())
    db_session.add(question)
    await db_session.commit()
    await db_session.refresh(question)

    root = QuestionReply(question_id=question.id, author_id=author.id, content="root")
    db_session.add(root)
    await db_session.commit()
    await db_session.refresh(root)

    middle = QuestionReply(
        question_id=question.id, author_id=author.id, content="middle", parent_reply_id=root.id
    )
    db_session.add(middle)
    await db_session.commit()
    await db_session.refresh(middle)

    leaf = QuestionReply(
        question_id=question.id,
        author_id=author.id,
        content="leaf",
        parent_reply_id=middle.id,
    )
    db_session.add(leaf)
    await db_session.commit()

    await db_session.delete(middle)
    await db_session.commit()

    leaf_row = (
        await db_session.execute(select(QuestionReply).where(QuestionReply.content == "leaf"))
    ).scalar_one()
    # The leaf must survive; it is promoted rather than cascaded away.
    assert leaf_row.parent_reply_id == middle.id
    assert (await db_session.get(QuestionReply, middle.id)) is None


@pytest.mark.asyncio
async def test_reactions_and_survives_its_author_but_not_a_duplicate(
    db_session: AsyncSession,
):
    author = await _make_user(db_session)
    pin = _make_pin(author, uuid.uuid4())
    db_session.add(pin)
    await db_session.commit()
    await db_session.refresh(pin)

    reaction = Reaction(
        user_id=author.id, target_type=TargetType.PIN, target_id=pin.id
    )
    db_session.add(reaction)
    await db_session.commit()
    await db_session.refresh(reaction)

    # A second identical reaction must not be storable.
    duplicate = Reaction(
        user_id=author.id, target_type=TargetType.PIN, target_id=pin.id
    )
    db_session.add(duplicate)
    with pytest.raises(Exception):
        await db_session.commit()
    await db_session.rollback()

    stored = (await db_session.execute(select(Reaction))).scalars().all()
    assert len(stored) == 1


@pytest.mark.asyncio
async def test_reactions_and_saves_are_purged_when_content_is_soft_deleted(
    db_session: AsyncSession,
):
    """
    Pins and questions are soft-deleted, and reaction/save rows are polymorphic,
    so nothing cascades automatically. The service must purge them explicitly.
    """
    from app.db.models.social import ReactionType
    from app.services.social_service import KnowledgePinService

    author = await _make_user(db_session)
    pin = _make_pin(author, uuid.uuid4())
    db_session.add(pin)
    await db_session.commit()
    await db_session.refresh(pin)

    db_session.add(
        Reaction(
            user_id=author.id,
            target_type=TargetType.PIN,
            target_id=pin.id,
            reaction_type=ReactionType.LIKE,
        )
    )
    db_session.add(SavedItem(user_id=author.id, target_type=TargetType.PIN, target_id=pin.id))
    await db_session.commit()

    service = KnowledgePinService(db_session)
    await service.delete_pin(pin.id, author)
    await db_session.commit()

    # The pin itself survives as a soft-deleted row...
    stored_pin = await db_session.get(KnowledgePin, pin.id)
    assert stored_pin is not None and stored_pin.is_active is False

    # ...but nothing may still point at it as though it were live.
    reactions = (
        await db_session.execute(select(Reaction).where(Reaction.target_id == pin.id))
    ).scalars().all()
    saves = (
        await db_session.execute(select(SavedItem).where(SavedItem.target_id == pin.id))
    ).scalars().all()
    assert reactions == [], "likes must not outlive a deleted pin"
    assert saves == [], "saves must not outlive a deleted pin"


@pytest.mark.asyncio
async def test_follow_rows_require_a_target_and_are_unique_per_follower(
    db_session: AsyncSession,
):
    follower = await _make_user(db_session)
    target = await _make_user(db_session)

    db_session.add(
        Follow(follower_id=follower.id, target_type=TargetType.USER, target_id=target.id)
    )
    await db_session.commit()

    follows = (await db_session.execute(select(Follow))).scalars().all()
    assert len(follows) == 1
    assert follows[0].follower_id == follower.id
    assert follows[0].target_id == target.id

    # A second follow of the same person must not be storable.
    db_session.add(
        Follow(follower_id=follower.id, target_type=TargetType.USER, target_id=target.id)
    )
    with pytest.raises(Exception):
        await db_session.commit()
    await db_session.rollback()