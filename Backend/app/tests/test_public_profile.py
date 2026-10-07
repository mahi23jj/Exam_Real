"""Public community profile: identity, public content, no private data leak."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models.social import Visibility
from app.tests._seed import make_pin, make_question, make_user

USERS = f"{settings.API_V1_PREFIX}/users"
FOLLOWS = f"{settings.API_V1_PREFIX}/follows"


@pytest.mark.asyncio
async def test_public_profile_shows_identity_and_public_content_only(
    client: AsyncClient, authed_user, db_session: AsyncSession
):
    target = await make_user(
        db_session, full_name="Ada Lovelace", department="Mathematics", email="ada@example.com"
    )
    await make_question(db_session, target, title="Public question")
    await make_pin(db_session, target, title="Public pin")
    await make_question(
        db_session, target, title="Private question", visibility=Visibility.PRIVATE
    )

    response = await client.get(f"{USERS}/{target.id}/community-profile")
    assert response.status_code == 200
    body = response.json()

    assert body["user"]["full_name"] == "Ada Lovelace"
    assert body["user"]["department"] == "Mathematics"
    assert "email" not in body["user"], "emails must never be exposed to peers"

    assert body["questions_total"] == 1
    assert body["pins_total"] == 1
    assert [q["title"] for q in body["public_questions"]] == ["Public question"]
    assert [p["title"] for p in body["public_pins"]] == ["Public pin"]
    assert body["is_following_user"] is False


@pytest.mark.asyncio
async def test_public_profile_reflects_follow_state(
    client: AsyncClient, authed_user, db_session: AsyncSession
):
    target = await make_user(db_session, email="followed@example.com")
    await client.post(f"{FOLLOWS}/users/{target.id}")

    response = await client.get(f"{USERS}/{target.id}/community-profile")
    assert response.json()["is_following_user"] is True
    assert response.json()["relationship"]["is_following"] is True


@pytest.mark.asyncio
async def test_public_profile_for_a_missing_user_is_a_404(
    client: AsyncClient, authed_user
):
    response = await client.get(
        f"{USERS}/00000000-0000-0000-0000-000000000000/community-profile"
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_own_profile_endpoint_is_distinct_from_public_profile(
    client: AsyncClient, authed_user
):
    own = await client.get(f"{USERS}/me/profile")
    assert own.status_code == 200
    assert own.json()["email"] == "tester@example.com"

    public = await client.get(f"{USERS}/{authed_user.id}/community-profile")
    assert public.status_code == 200
    assert public.json()["relationship"]["is_self"] is True
