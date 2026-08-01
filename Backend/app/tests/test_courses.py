import pytest
from httpx import AsyncClient
from app.core.config import settings


@pytest.mark.asyncio
async def test_create_and_list_course(client: AsyncClient):
    # 1. Register & Login User
    await client.post(
        f"{settings.API_V1_PREFIX}/auth/register",
        json={"email": "instructor@example.com", "password": "Pass123!", "full_name": "Dr. Smith", "role": "INSTRUCTOR"}
    )
    login_res = await client.post(
        f"{settings.API_V1_PREFIX}/auth/login",
        json={"email": "instructor@example.com", "password": "Pass123!"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Course
    course_payload = {
        "code": "CS101",
        "title": "Introduction to Computer Science",
        "description": "Foundational programming and algorithms."
    }
    create_res = await client.post(
        f"{settings.API_V1_PREFIX}/courses",
        json=course_payload,
        headers=headers
    )
    assert create_res.status_code == 201
    course_data = create_res.json()
    assert course_data["code"] == "CS101"
    assert course_data["title"] == "Introduction to Computer Science"

    # 3. List Courses
    list_res = await client.get(f"{settings.API_V1_PREFIX}/courses")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] == 1
    assert list_data["items"][0]["code"] == "CS101"
