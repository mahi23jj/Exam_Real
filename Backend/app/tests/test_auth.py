import pytest
from httpx import AsyncClient
from app.core.config import settings


@pytest.mark.asyncio
async def test_register_user_success(client: AsyncClient):
    response = await client.post(
        f"{settings.API_V1_PREFIX}/auth/register",
        json={
            "email": "teststudent@example.com",
            "password": "SecurePassword123!",
            "full_name": "Test Student"
         
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "teststudent@example.com"
    assert data["full_name"] == "Test Student"
    assert data["role"] == "STUDENT"
    assert "id" in data
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email_fails(client: AsyncClient):
    payload = {
        "email": "duplicate@example.com",
        "password": "Password123!",
        "full_name": "Original Student",
        "role": "STUDENT"
    }
    res1 = await client.post(f"{settings.API_V1_PREFIX}/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = await client.post(f"{settings.API_V1_PREFIX}/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]


@pytest.mark.asyncio
async def test_login_success_and_me_endpoint(client: AsyncClient):
    # 1. Register
    reg_payload = {
        "email": "logintest@example.com",
        "password": "SecretPassword123!",
        "full_name": "Login User"
    }
    await client.post(f"{settings.API_V1_PREFIX}/auth/register", json=reg_payload)

    # 2. Login
    login_payload = {
        "email": "logintest@example.com",
        "password": "SecretPassword123!"
    }
    login_res = await client.post(f"{settings.API_V1_PREFIX}/auth/login", json=login_payload)
    assert login_res.status_code == 200
    tokens = login_res.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert tokens["token_type"] == "bearer"

    # 3. Access Protected /auth/me
    access_token = tokens["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    me_res = await client.get(f"{settings.API_V1_PREFIX}/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "logintest@example.com"
    assert me_data["full_name"] == "Login User"


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient):
    payload = {
        "email": "nonexistent@example.com",
        "password": "WrongPassword"
    }
    res = await client.post(f"{settings.API_V1_PREFIX}/auth/login", json=payload)
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token_rotation(client: AsyncClient):
    # 1. Register & Login
    reg_payload = {
        "email": "refreshtest@example.com",
        "password": "Password123!",
        "full_name": "Refresh User"
    }
    await client.post(f"{settings.API_V1_PREFIX}/auth/register", json=reg_payload)
    login_res = await client.post(
        f"{settings.API_V1_PREFIX}/auth/login",
        json={"email": "refreshtest@example.com", "password": "Password123!"}
    )
    first_tokens = login_res.json()
    old_refresh_token = first_tokens["refresh_token"]

    # 2. Refresh Token
    refresh_res = await client.post(
        f"{settings.API_V1_PREFIX}/auth/refresh",
        json={"refresh_token": old_refresh_token}
    )
    assert refresh_res.status_code == 200
    new_tokens = refresh_res.json()
    assert new_tokens["access_token"] != first_tokens["access_token"]
    assert new_tokens["refresh_token"] != old_refresh_token

    # 3. Attempt reuse of old refresh token should fail
    reuse_res = await client.post(
        f"{settings.API_V1_PREFIX}/auth/refresh",
        json={"refresh_token": old_refresh_token}
    )
    assert reuse_res.status_code == 401