"""
Authentication is Auth0-only.

These tests cover the parts of auth this project actually owns: the fill-only
profile sync (Auth0 authenticates, the local ExamReal record is authoritative
for name/department/picture) and the authorization boundary around protected
routes. There is no local password system anymore, so tests override
`get_current_user` rather than minting a token.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.auth import RegisterRequest
from app.auth.auth_service import Auth0AuthService
from app.core.config import settings
from app.db.models.user import User


async def _sync(db: AsyncSession, **overrides):
    claims = {
        "sub": "auth0|test-user-1",
        "email": "new.student@example.com",
        "name": "New Student",
        "picture": "https://example.com/pic.png",
        "https://examreal.app/department": "Computer Science",
    }
    claims.update(overrides)
    return await Auth0AuthService(db).sync_user(claims)


@pytest.mark.asyncio
async def test_first_sync_creates_a_local_user_from_claims(db_session: AsyncSession):
    user = await _sync(db_session)

    assert user.auth0_id == "auth0|test-user-1"
    assert user.email == "new.student@example.com"
    assert user.full_name == "New Student"
    assert user.department == "Computer Science"
    assert user.picture == "https://example.com/pic.png"
    assert user.profile_locked is False


@pytest.mark.asyncio
async def test_sync_is_fill_only_and_never_overwrites_a_locked_profile(
    db_session: AsyncSession,
):
    user = await _sync(db_session)
    assert user.profile_locked is False

    # The student edits their profile locally.
    user.full_name = "Chosen Name"
    user.department = "Physics"
    user.picture = "https://example.com/mine.png"
    user.profile_locked = True
    db_session.add(user)
    await db_session.commit()

    # A later login re-presents Auth0 claims, which must not win.
    again = await _sync(
        db_session,
        name="Auth0 Name",
        **{"https://examreal.app/department": "Chemistry"},
    )

    assert again.id == user.id
    assert again.full_name == "Chosen Name"
    assert again.department == "Physics"
    assert again.picture == "https://example.com/mine.png"


@pytest.mark.asyncio
async def test_sync_still_tracks_session_fields_for_a_locked_profile(
    db_session: AsyncSession,
):
    """Email is identity-provider owned and must keep updating."""
    user = await _sync(db_session)
    user.full_name = "Locked In"
    user.profile_locked = True
    db_session.add(user)
    await db_session.commit()

    again = await _sync(db_session, email="renamed@example.com", name="Auth0 Name")

    assert again.full_name == "Locked In", "local name is authoritative"
    assert again.email == "renamed@example.com", "email tracks the identity provider"


@pytest.mark.asyncio
async def test_sync_falls_back_to_email_local_part_when_no_name_claim(
    db_session: AsyncSession,
):
    user = await _sync(db_session, name=None, sub="auth0|no-name")

    # Must never be blank: the UI, profile lists and the users.full_name check
    # constraint all require a real display name.
    assert user.full_name and user.full_name.strip()


@pytest.mark.asyncio
async def test_sync_derives_a_name_for_a_legacy_blank_profile(
    db_session: AsyncSession,
):
    """A pre-existing row with a blank name is repaired on the next login."""
    user = User(
        email="legacy@example.com",
        auth0_id="auth0|legacy",
        full_name=None,
        department=None,
    )
    db_session.add(user)
    await db_session.commit()

    repaired = await _sync(
        db_session, sub="auth0|legacy", email="legacy@example.com", name=None
    )

    assert repaired.id == user.id
    assert repaired.full_name and repaired.full_name.strip()


@pytest.mark.asyncio
async def test_protected_routes_reject_an_unauthenticated_caller(client: AsyncClient):
    for method, path in [
        ("get", f"{settings.API_V1_PREFIX}/auth/me"),
        ("get", f"{settings.API_V1_PREFIX}/users/me/profile"),
        ("get", f"{settings.API_V1_PREFIX}/community/feed-items"),
        ("get", f"{settings.API_V1_PREFIX}/follows/users"),
    ]:
        response = await getattr(client, method)(path)
        assert response.status_code in (401, 403), f"{path} was reachable without auth"


@pytest.mark.asyncio
async def test_own_profile_endpoint_returns_the_local_profile(
    client: AsyncClient, authed_user: User
):
    response = await client.get(f"{settings.API_V1_PREFIX}/users/me/profile")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(authed_user.id)
    assert body["email"] == "tester@example.com"
    assert body["full_name"] == "Test Student"
    assert body["department"] == "Computer Science"
    assert body["is_profile_complete"] is True
    assert "auth0_id" not in body


@pytest.mark.asyncio
async def test_own_profile_patch_updates_editable_fields(
    client: AsyncClient, authed_user: User
):
    response = await client.patch(
        f"{settings.API_V1_PREFIX}/users/me/profile",
        json={"full_name": "Renamed Student", "department": "Mathematics"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["full_name"] == "Renamed Student"
    assert body["department"] == "Mathematics"
    assert body["profile_locked"] is True


@pytest.mark.asyncio
async def test_own_profile_patch_rejects_a_blank_name(
    client: AsyncClient, authed_user: User
):
    response = await client.patch(
        f"{settings.API_V1_PREFIX}/users/me/profile", json={"full_name": "   "}
    )

    assert response.status_code in (400, 422)


@pytest.mark.asyncio
async def test_own_profile_patch_forbids_unknown_fields(
    client: AsyncClient, authed_user: User
):
    response = await client.patch(
        f"{settings.API_V1_PREFIX}/users/me/profile",
        json={"email": "attacker@example.com"},
    )

    assert response.status_code == 422, "users must not edit identity-owned fields"


def test_registration_requires_a_name_and_department():
    """The signup form must not let a student through without both fields."""
    with pytest.raises(Exception):
        RegisterRequest(email="x@example.com", password="Pass123!", full_name="X Y")

    with pytest.raises(Exception):
        RegisterRequest(email="x@example.com", password="Pass123!", department="CS")

    with pytest.raises(Exception):
        RegisterRequest(
            email="x@example.com",
            password="Pass123!",
            full_name="   ",
            department="Computer Science",
        )

    valid = RegisterRequest(
        email="x@example.com",
        password="Pass123!",
        full_name="X Y",
        department="Computer Science",
    )
    assert valid.full_name == "X Y"
    assert valid.department == "Computer Science"
