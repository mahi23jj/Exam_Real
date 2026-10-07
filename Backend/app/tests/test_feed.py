"""Unified community feed: scope, content type, person filter, ordering, paging."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.tests._seed import make_pin, make_question, make_user, staggered_times

FEED = f"{settings.API_V1_PREFIX}/community/feed-items"
FOLLOWS = f"{settings.API_V1_PREFIX}/follows"


async def _follow(client: AsyncClient, user_id) -> None:
    response = await client.post(f"{FOLLOWS}/users/{user_id}")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_following_feed_is_empty_when_nobody_is_followed(
    client: AsyncClient, authed_user
):
    response = await client.get(FEED, params={"scope": "following"})
    assert response.status_code == 200
    body = response.json()
    assert body["items"] == []
    assert body["total"] == 0
    assert body["has_more"] is False


@pytest.mark.asyncio
async def test_combined_feed_is_chronological_newest_first(
    client: AsyncClient, authed_user, db_session: AsyncSession
):
    author = await make_user(db_session, full_name="Ada Lovelace", email="ada@example.com")
    await _follow(client, author.id)

    t1, t2, t3 = staggered_times(3)
    await make_question(db_session, author, title="Q oldest", created_at=t1)
    await make_pin(db_session, author, title="Pin middle", created_at=t2)
    await make_question(db_session, authed_user, title="Q from me newest", created_at=t3)

    response = await client.get(FEED, params={"scope": "following"})
    assert response.status_code == 200
    body = response.json()
    types_and_titles = [
        (item["content_type"], item["question"]["title"] if item["question"] else item["pin"]["title"])
        for item in body["items"]
    ]
    assert types_and_titles == [
        ("questions", "Q from me newest"),
        ("pins", "Pin middle"),
        ("questions", "Q oldest"),
    ]
    assert all(item["author"]["full_name"] for item in body["items"])


@pytest.mark.asyncio
async def test_content_type_filter(client: AsyncClient, authed_user, db_session: AsyncSession):
    author = await make_user(db_session, email="filter@example.com")
    await _follow(client, author.id)
    await make_question(db_session, author, title="Only question")
    await make_pin(db_session, author, title="Only pin")

    questions = await client.get(
        FEED, params={"scope": "following", "type": "questions"}
    )
    assert [i["content_type"] for i in questions.json()["items"]] == ["questions"]

    pins = await client.get(FEED, params={"scope": "following", "type": "pins"})
    assert [i["content_type"] for i in pins.json()["items"]] == ["pins"]


@pytest.mark.asyncio
async def test_person_filter_returns_only_that_person(
    client: AsyncClient, authed_user, db_session: AsyncSession
):
    author = await make_user(db_session, full_name="Selected Person", email="selected@example.com")
    other = await make_user(db_session, full_name="Other Person", email="other@example.com")
    await _follow(client, author.id)
    await _follow(client, other.id)

    await make_question(db_session, author, title="Mine to select")
    await make_question(db_session, other, title="Someone else")
    await make_question(db_session, authed_user, title="My own question")

    response = await client.get(
        FEED, params={"scope": "following", "author_id": str(author.id)}
    )
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["author"]["id"] == str(author.id)
    assert body["items"][0]["question"]["title"] == "Mine to select"


@pytest.mark.asyncio
async def test_person_filter_combines_with_content_type(
    client: AsyncClient, authed_user, db_session: AsyncSession
):
    author = await make_user(db_session, email="combo@example.com")
    await _follow(client, author.id)
    await make_question(db_session, author, title="Q")
    await make_pin(db_session, author, title="P")

    response = await client.get(
        FEED,
        params={"scope": "following", "author_id": str(author.id), "type": "pins"},
    )
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["content_type"] == "pins"


@pytest.mark.asyncio
async def test_feed_pagination_does_not_repeat_items(
    client: AsyncClient, authed_user, db_session: AsyncSession
):
    author = await make_user(db_session, email="pager@example.com")
    await _follow(client, author.id)
    times = staggered_times(5)
    for index, when in enumerate(times):
        await make_question(db_session, author, title=f"Q{index}", created_at=when)

    page_one = await client.get(FEED, params={"scope": "following", "page": 1, "size": 2})
    page_two = await client.get(FEED, params={"scope": "following", "page": 2, "size": 2})
    page_three = await client.get(FEED, params={"scope": "following", "page": 3, "size": 2})

    assert page_one.json()["total"] == 5
    assert page_one.json()["has_more"] is True
    assert page_three.json()["has_more"] is False

    ids = [
        item["id"]
        for page in (page_one, page_two, page_three)
        for item in page.json()["items"]
    ]
    assert len(ids) == 5
    assert len(set(ids)) == 5, "pages must not repeat or skip rows"


@pytest.mark.asyncio
async def test_everyone_scope_includes_public_content_from_anyone(
    client: AsyncClient, authed_user, db_session: AsyncSession
):
    stranger = await make_user(db_session, full_name="Stranger", email="stranger@example.com")
    await make_question(db_session, stranger, title="Public from a stranger")

    response = await client.get(FEED, params={"scope": "everyone"})
    body = response.json()
    titles = [i["question"]["title"] if i["question"] else None for i in body["items"]]
    assert "Public from a stranger" in titles
