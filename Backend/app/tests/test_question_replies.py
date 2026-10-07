"""Question discussion: replies, nested replies, authors and authorization."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.tests._seed import make_question, make_reply, make_user

QUESTIONS = f"{settings.API_V1_PREFIX}/learning-questions"


@pytest.mark.asyncio
async def test_question_detail_returns_author_and_source(
    client: AsyncClient, authed_user, db_session: AsyncSession
):
    question = await make_question(db_session, authed_user, title="How does this work?")

    response = await client.get(f"{QUESTIONS}/{question.id}")
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "How does this work?"
    assert body["author"]["full_name"] == "Test Student"
    assert body["author"]["department"] == "Computer Science"


@pytest.mark.asyncio
async def test_create_reply_reports_real_author(
    client: AsyncClient, authed_user, db_session: AsyncSession
):
    question = await make_question(db_session, authed_user)

    response = await client.post(
        f"{QUESTIONS}/{question.id}/replies", json={"content": "Because of a fan-out join."}
    )
    assert response.status_code == 201
    body = response.json()
    assert body["author"]["full_name"] == "Test Student"
    assert body["parent_reply_id"] is None


@pytest.mark.asyncio
async def test_nested_reply_tree(
    client: AsyncClient, authed_user, db_session: AsyncSession
):
    question = await make_question(db_session, authed_user)

    root = await client.post(
        f"{QUESTIONS}/{question.id}/replies", json={"content": "root"}
    )
    root_id = root.json()["id"]
    child = await client.post(
        f"{QUESTIONS}/{question.id}/replies",
        json={"content": "child", "parent_reply_id": root_id},
    )
    assert child.status_code == 201

    tree = await client.get(f"{QUESTIONS}/{question.id}/replies")
    assert tree.status_code == 200
    body = tree.json()
    assert body["total_replies"] == 2
    assert len(body["tree"]) == 1
    assert len(body["tree"][0]["children"]) == 1
    assert body["tree"][0]["children"][0]["content"] == "child"
    # Every node carries a real author name, never a placeholder.
    assert body["tree"][0]["author"]["full_name"] == "Test Student"


@pytest.mark.asyncio
async def test_reply_to_a_parent_from_another_question_is_rejected(
    client: AsyncClient, authed_user, db_session: AsyncSession
):
    question_a = await make_question(db_session, authed_user)
    question_b = await make_question(db_session, authed_user, title="Another")
    foreign_parent = await make_reply(db_session, question_a, authed_user)

    response = await client.post(
        f"{QUESTIONS}/{question_b.id}/replies",
        json={"content": "misplaced", "parent_reply_id": str(foreign_parent.id)},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_only_the_author_can_delete_a_reply(
    client: AsyncClient, authed_user, db_session: AsyncSession
):
    question = await make_question(db_session, authed_user)
    other = await make_user(db_session, email="other-author@example.com")
    foreign_reply = await make_reply(db_session, question, other)

    forbidden = await client.delete(
        f"{QUESTIONS}/{question.id}/replies/{foreign_reply.id}"
    )
    assert forbidden.status_code == 403

    reply = await db_session.get(type(foreign_reply), foreign_reply.id)
    assert reply.is_active is True


@pytest.mark.asyncio
async def test_replies_on_a_missing_question_is_a_404(client: AsyncClient, authed_user):
    response = await client.post(
        f"{QUESTIONS}/00000000-0000-0000-0000-000000000000/replies",
        json={"content": "hello"},
    )
    assert response.status_code == 404
