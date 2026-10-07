"""Knowledge Pin likes: one simple like toggle, user-specific, never duplicated."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models.social import Reaction, ReactionType, TargetType
from app.repositories.social_repository import ReactionRepository
from app.tests._seed import make_pin, make_user

PINS = f"{settings.API_V1_PREFIX}/pins"


@pytest.mark.asyncio
async def test_like_then_unlike_toggles_state_and_count(
    client: AsyncClient, authed_user, db_session: AsyncSession
):
    pin = await make_pin(db_session, authed_user)

    liked = await client.post(f"{PINS}/{pin.id}/like")
    assert liked.status_code == 200
    assert liked.json()["is_reacted"] is True
    assert liked.json()["new_count"] == 1

    unliked = await client.post(f"{PINS}/{pin.id}/like")
    assert unliked.status_code == 200
    assert unliked.json()["is_reacted"] is False
    assert unliked.json()["new_count"] == 0


@pytest.mark.asyncio
async def test_like_is_never_stored_twice(
    client: AsyncClient, authed_user, db_session: AsyncSession
):
    pin = await make_pin(db_session, authed_user)

    repo = ReactionRepository(db_session)
    first = await repo.add_reaction_if_absent(
        authed_user.id, TargetType.PIN, pin.id, ReactionType.LIKE
    )
    second = await repo.add_reaction_if_absent(
        authed_user.id, TargetType.PIN, pin.id, ReactionType.LIKE
    )
    await db_session.commit()

    assert first is True
    assert second is False, "the unique constraint must reject a duplicate like"
    assert await repo.count_reactions(TargetType.PIN, pin.id) == 1

    rows = (await db_session.execute(Reaction.__table__.select())).all()
    assert len(rows) == 1


@pytest.mark.asyncio
async def test_like_state_is_specific_to_each_viewer(
    client: AsyncClient, authed_user, db_session: AsyncSession
):
    author = await make_user(db_session, email="author@example.com")
    other = await make_user(db_session, email="other@example.com")
    pin = await make_pin(db_session, author)

    await client.post(f"{PINS}/{pin.id}/like")

    repo = ReactionRepository(db_session)
    assert (
        await repo.get_user_reaction(authed_user.id, TargetType.PIN, pin.id, ReactionType.LIKE)
        is not None
    )
    # A different student has not liked it, even though the count is shared.
    assert (
        await repo.get_user_reaction(other.id, TargetType.PIN, pin.id, ReactionType.LIKE)
        is None
    )
    assert await repo.count_reactions(TargetType.PIN, pin.id) == 1


@pytest.mark.asyncio
async def test_liked_pin_reports_viewer_state(
    client: AsyncClient, authed_user, db_session: AsyncSession
):
    pin = await make_pin(db_session, authed_user)

    await client.post(f"{PINS}/{pin.id}/like")
    detail = await client.get(f"{PINS}/{pin.id}")
    assert detail.status_code == 200
    body = detail.json()
    assert body["is_liked_by_me"] is True
    assert body["likes_count"] == 1


@pytest.mark.asyncio
async def test_liking_a_missing_pin_is_a_404(client: AsyncClient, authed_user):
    response = await client.post(
        f"{PINS}/00000000-0000-0000-0000-000000000000/like"
    )
    assert response.status_code == 404
