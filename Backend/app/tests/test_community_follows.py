"""Following / follower behaviour for the Community surface."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models.social import Follow
from app.tests._seed import make_user

FOLLOWS = f"{settings.API_V1_PREFIX}/follows"


@pytest.mark.asyncio
async def test_follow_then_list_following(client: AsyncClient, authed_user, db_session: AsyncSession):
    target = await make_user(db_session, full_name="Ada Lovelace", department="Mathematics", email="ada@example.com")

    response = await client.post(f"{FOLLOWS}/users/{target.id}")
    assert response.status_code == 200
    body = response.json()
    assert body["is_following"] is True
    assert body["followers_count"] == 1

    listing = await client.get(f"{FOLLOWS}/users")
    assert listing.status_code == 200
    payload = listing.json()
    assert payload["total"] == 1
    item = payload["items"][0]
    assert item["id"] == str(target.id)
    assert item["full_name"] == "Ada Lovelace"
    assert item["department"] == "Mathematics"
    assert item["is_following"] is True


@pytest.mark.asyncio
async def test_unfollow_removes_the_relationship(client: AsyncClient, authed_user, db_session: AsyncSession):
    target = await make_user(db_session, email="grace@example.com")

    await client.post(f"{FOLLOWS}/users/{target.id}")
    response = await client.delete(f"{FOLLOWS}/users/{target.id}")
    assert response.status_code == 200
    assert response.json()["is_following"] is False
    assert response.json()["followers_count"] == 0

    listing = await client.get(f"{FOLLOWS}/users")
    assert listing.json()["total"] == 0


@pytest.mark.asyncio
async def test_cannot_follow_self(client: AsyncClient, authed_user):
    response = await client.post(f"{FOLLOWS}/users/{authed_user.id}")
    assert response.status_code == 400
    assert "yourself" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_following_twice_is_idempotent(client: AsyncClient, authed_user, db_session: AsyncSession):
    target = await make_user(db_session, email="twice@example.com")

    first = await client.post(f"{FOLLOWS}/users/{target.id}")
    second = await client.post(f"{FOLLOWS}/users/{target.id}")
    assert first.status_code == 200 and second.status_code == 200
    assert second.json()["is_following"] is True

    rows = (await db_session.execute(Follow.__table__.select())).all()
    assert len(rows) == 1, "a duplicate follow row must never be stored"


@pytest.mark.asyncio
async def test_following_a_missing_user_is_a_404(client: AsyncClient, authed_user):
    response = await client.post(
        f"{FOLLOWS}/users/00000000-0000-0000-0000-000000000000"
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_follow_state_reports_counts(client: AsyncClient, authed_user, db_session: AsyncSession):
    who = await make_user(db_session, full_name="Viewer", email="viewer@example.com")
    target = await make_user(db_session, full_name="Target", email="target@example.com")

    await client.post(f"{FOLLOWS}/users/{target.id}")

    state = await client.get(f"{FOLLOWS}/users/{target.id}/state")
    assert state.status_code == 200
    body = state.json()
    assert body["is_following"] is True
    assert body["is_self"] is False
    assert body["followers_count"] == 1

    self_state = await client.get(f"{FOLLOWS}/users/{authed_user.id}/state")
    assert self_state.json()["is_self"] is True
    assert self_state.json()["is_following"] is False


@pytest.mark.asyncio
async def test_following_list_paginates_and_searches(client: AsyncClient, authed_user, db_session: AsyncSession):
    for index in range(5):
        person = await make_user(
            db_session,
            full_name=f"Student {index}",
            email=f"student{index}@example.com",
        )
        await client.post(f"{FOLLOWS}/users/{person.id}")

    page_one = await client.get(f"{FOLLOWS}/users", params={"page": 1, "size": 2})
    assert page_one.json()["total"] == 5
    assert len(page_one.json()["items"]) == 2

    search = await client.get(f"{FOLLOWS}/users", params={"search": "Student 3"})
    assert search.json()["total"] == 1
    assert search.json()["items"][0]["full_name"] == "Student 3"


@pytest.mark.asyncio
async def test_followers_endpoint_lists_followers(client: AsyncClient, authed_user, db_session: AsyncSession):
    target = await make_user(db_session, full_name="Popular", email="popular@example.com")
    await client.post(f"{FOLLOWS}/users/{target.id}")

    response = await client.get(f"{FOLLOWS}/users/{target.id}/followers")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == str(authed_user.id)
