"""Document upload flow (multi-file endpoint).

Authentication is Auth0-only; storage falls back to mock mode when Cloudinary
credentials are absent, so the upload runs end-to-end without external calls.
"""

import io

import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.services.storage_service import StorageService


@pytest.mark.asyncio
async def test_upload_document_success(client: AsyncClient, authed_user, monkeypatch):
    # Storage is Cloudinary in production; stub it so the test never reaches the
    # network and only exercises the API + database path.
    async def fake_upload(self, file, folder="studyloop_docs"):
        return {
            "public_id": f"{folder}/mock",
            "secure_url": "https://example.com/mock.pdf",
            "bytes": 32,
            "format": "pdf",
        }

    monkeypatch.setattr(StorageService, "upload_file", fake_upload)

    course_res = await client.post(
        f"{settings.API_V1_PREFIX}/courses",
        json={"title": "Linear Algebra"},
    )
    assert course_res.status_code == 201
    course_id = course_res.json()["id"]

    fake_pdf = io.BytesIO(b"%PDF-1.4 Mock PDF file content for test")
    files = [("files", ("lecture_notes_ch1.pdf", fake_pdf, "application/pdf"))]
    data = {"doc_type": "NOTE"}

    upload_res = await client.post(
        f"{settings.API_V1_PREFIX}/courses/{course_id}/documents",
        data=data,
        files=files,
    )
    assert upload_res.status_code == 202, upload_res.text
    body = upload_res.json()
    assert isinstance(body, list) and len(body) == 1
    result = body[0]
    assert result["document"]["doc_type"] == "NOTE"
    assert result["document"]["file_type"] == "PDF"
    assert result["job"]["status"] == "PENDING"
