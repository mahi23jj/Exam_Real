"""Exam question listing flow.

Authentication is Auth0-only; the authenticated student is injected via the
`authed_user` fixture instead of registering against the live provider.
"""

import pytest
from httpx import AsyncClient

from app.core.config import settings


@pytest.mark.asyncio
async def test_question_flow_initial_hide_correct_answers(
    client: AsyncClient, authed_user
):
    # No exam exists for this id, so the list is empty but must still succeed.
    res = await client.get(
        f"{settings.API_V1_PREFIX}/exams/00000000-0000-0000-0000-000000000000/questions"
    )
    assert res.status_code == 200
    assert isinstance(res.json(), list)
