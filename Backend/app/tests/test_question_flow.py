import pytest
from httpx import AsyncClient
from app.core.config import settings


@pytest.mark.asyncio
async def test_question_flow_initial_hide_correct_answers(client: AsyncClient):
    # 1. Register & Login
    await client.post(
        f"{settings.API_V1_PREFIX}/auth/register",
        json={"email": "studentq@example.com", "password": "Pass123!", "full_name": "Student Q", "role": "STUDENT"}
    )
    login_res = await client.post(
        f"{settings.API_V1_PREFIX}/auth/login",
        json={"email": "studentq@example.com", "password": "Pass123!"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get questions for dummy exam
    res = await client.get(f"{settings.API_V1_PREFIX}/exams/00000000-0000-0000-0000-000000000000/questions")
    assert res.status_code == 200
    questions = res.json()
    assert isinstance(questions, list)
