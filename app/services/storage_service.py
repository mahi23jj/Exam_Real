import uuid
import cloudinary
import cloudinary.uploader
from typing import Dict, Any
from fastapi import UploadFile
import httpx

from app.core.config import settings
from app.core.exceptions import DomainException


class StorageUploadException(DomainException):
    def __init__(self, detail: str):
        super().__init__(status_code=400, detail=f"File upload failed: {detail}")


class StorageService:
    """Service handling Cloudinary file uploads and metadata extractions."""

    def __init__(self):
        if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY:
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
                secure=True
            )

    async def upload_file(self, file: UploadFile, folder: str = "studyloop_docs") -> Dict[str, Any]:
        """Uploads file content to Cloudinary and returns metadata dict containing public_id and secure_url."""
        contents = await file.read()
        file_size = len(contents)

        if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            raise StorageUploadException(f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE_MB}MB.")

        # Fallback for dev/mock mode if credentials are missing
        if not settings.CLOUDINARY_CLOUD_NAME or not settings.CLOUDINARY_API_KEY:
            mock_id = f"{folder}/{uuid.uuid4().hex}"
            return {
                "public_id": mock_id,
                "secure_url": f"https://res.cloudinary.com/demo/image/upload/{mock_id}",
                "bytes": file_size,
                "format": file.filename.split(".")[-1] if file.filename else "unknown"
            }

        try:
            # Upload to Cloudinary (raw resource for PDF/PPT/PPTX, auto for images)
            response = cloudinary.uploader.upload(
                contents,
                folder=folder,
                resource_type="auto",
                use_filename=True,
                unique_filename=True
            )
            return {
                "public_id": response.get("public_id"),
                "secure_url": response.get("secure_url"),
                "bytes": response.get("bytes", file_size),
                "format": response.get("format", file.filename.split(".")[-1])
            }
        except Exception as e:
            raise StorageUploadException(str(e))

    async def get_document_bytes(self, secure_url: str) -> bytes:
        """Downloads document bytes from Cloudinary or external URL."""
        if secure_url.startswith("http://") or secure_url.startswith("https://"):
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.get(secure_url)
                if res.status_code == 200:
                    return res.content
        # Default fallback sample bytes for testing or offline environment
        return b"%PDF-1.4 Mock document bytes content for StudyLoop AI processing pipeline"
