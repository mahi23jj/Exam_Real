import io
import pytest
from httpx import AsyncClient
from app.core.config import settings


@pytest.mark.asyncio
async def test_upload_document_success(client: AsyncClient):
    # 1. Register & Login
    await client.post(
        f"{settings.API_V1_PREFIX}/auth/register",
        json={"email": "studentdoc@example.com", "password": "Pass123!", "full_name": "Student Doc", "role": "STUDENT"}
    )
    login_res = await client.post(
        f"{settings.API_V1_PREFIX}/auth/login",
        json={"email": "studentdoc@example.com", "password": "Pass123!"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Course
    course_res = await client.post(
        f"{settings.API_V1_PREFIX}/courses",
        json={"code": "MATH201", "title": "Linear Algebra"},
        headers=headers
    )
    course_id = course_res.json()["id"]

    # 3. Upload PDF Document
    fake_pdf = io.BytesIO(b"%PDF-1.4 Mock PDF file content for test")
    files = {"file": ("lecture_notes_ch1.pdf", fake_pdf, "application/pdf")}
    data = {"title": "Chapter 1 Vectors", "doc_type": "NOTE"}

    upload_res = await client.post(
        f"{settings.API_V1_PREFIX}/courses/{course_id}/documents",
        data=data,
        files=files,
        headers=headers
    )
    assert upload_res.status_code == 202
    resp_data = upload_res.json()
    assert "document" in resp_data
    assert "job" in resp_data
    assert resp_data["document"]["doc_type"] == "NOTE"
    assert resp_data["document"]["file_type"] == "PDF"
    assert resp_data["job"]["status"] == "PENDING"
