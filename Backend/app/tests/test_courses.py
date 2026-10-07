"""Course creation/list flow.

Authentication is Auth0-only, so these tests run as an already-authenticated
student (the `authed_user` fixture overrides `get_current_user`) rather than
hitting the live Auth0 tenant.
"""

import pytest
from httpx import AsyncClient

from app.core.config import settings


@pytest.mark.asyncio
async def test_create_and_list_course(client: AsyncClient, authed_user):
    course_payload = {
        "code": "CS101",
        "title": "Introduction to Computer Science",
        "description": "Foundational programming and algorithms.",
    }
    create_res = await client.post(
        f"{settings.API_V1_PREFIX}/courses", json=course_payload
    )
    assert create_res.status_code == 201
    course_data = create_res.json()
    # Codes are generated server-side from the title.
    assert course_data["code"]
    assert course_data["title"] == "Introduction to Computer Science"

    list_res = await client.get(f"{settings.API_V1_PREFIX}/courses")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(item["code"] == course_data["code"] for item in list_data["items"])
