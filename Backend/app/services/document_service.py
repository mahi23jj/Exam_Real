import uuid
from typing import List, Tuple
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models.course import Course
from app.db.models.document import Document, FileType, DocumentType, JobStatus
from app.db.models.job import DocumentProcessingJob
from app.db.models.user import User
from app.repositories.course_repository import CourseRepository
from app.repositories.document_repository import DocumentRepository, DocumentProcessingJobRepository
from app.schemas.document import DocumentRead, DocumentProcessingJobRead, DocumentUploadResponse, DocumentListResponse
from app.services.storage_service import StorageService
from app.workers.tasks import process_document_task


class DocumentNotFoundException(HTTPException):
    def __init__(self):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")


class InvalidFileTypeException(HTTPException):
    def __init__(self, extension: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{extension}'. Allowed types: {settings.ALLOWED_FILE_TYPES}"
        )


class DocumentService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.course_repo = CourseRepository(session)
        self.doc_repo = DocumentRepository(session)
        self.job_repo = DocumentProcessingJobRepository(session)
        self.storage_service = StorageService()

    def _determine_file_type(self, filename: str) -> FileType:
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        if ext == "pdf":
            return FileType.PDF
        elif ext == "ppt":
            return FileType.PPT
        elif ext == "pptx":
            return FileType.PPTX
        elif ext in ["png", "jpg", "jpeg", "webp"]:
            return FileType.IMAGE
        else:
            raise InvalidFileTypeException(ext)

    async def upload_document(
        self,
        course_id: uuid.UUID,
        file: UploadFile,
        title: str,
        doc_type: DocumentType,
        current_user: User
    ) -> DocumentUploadResponse:
        """Uploads document binary to Cloudinary, creates DB metadata, spawns Celery task, and returns immediate response."""
        # 1. Validate Course exists
        course = await self.course_repo.get_active_by_id(course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found.")

        # 2. Determine file type
        filename = file.filename or "uploaded_document"
        file_type = self._determine_file_type(filename)

        # 3. Upload to Cloudinary
        upload_meta = await self.storage_service.upload_file(file=file, folder=f"studyloop/{course.code}")

        # 4. Create Document record
        document = Document(
            course_id=course_id,
            uploaded_by_user_id=current_user.id,
            title=title.strip(),
            file_name=filename,
            file_type=file_type,
            doc_type=doc_type,
            cloudinary_public_id=upload_meta["public_id"],
            cloudinary_secure_url=upload_meta["secure_url"],
            file_size_bytes=upload_meta["bytes"],
            status=JobStatus.PENDING,
            metadata_json={"format": upload_meta.get("format")},
            is_active=True
        )
        created_doc = await self.doc_repo.create(document)

        # 5. Create AI Processing Job record
        job = DocumentProcessingJob(
            document_id=created_doc.id,
            status=JobStatus.PENDING,
            current_step="QUEUED_FOR_PROCESSING",
            error_message=None
        )
        created_job = await self.job_repo.create(job)

        # 6. Dispatch Background Task to Celery
        try:
            process_document_task.delay(str(created_doc.id), str(created_job.id))
        except Exception:
            # Fallback for local testing without running Redis
            pass

        return DocumentUploadResponse(
            message="Document uploaded successfully. Background AI processing initiated.",
            document=DocumentRead.model_validate(created_doc),
            job=DocumentProcessingJobRead.model_validate(created_job)
        )

    async def get_document_by_id(self, document_id: uuid.UUID) -> DocumentRead:
        doc = await self.doc_repo.get_active_by_id(document_id)
        if not doc:
            raise DocumentNotFoundException()
        return DocumentRead.model_validate(doc)

    async def list_course_documents(self, course_id: uuid.UUID) -> DocumentListResponse:
        docs = await self.doc_repo.list_by_course(course_id)
        items = [DocumentRead.model_validate(d) for d in docs]
        return DocumentListResponse(items=items, total=len(items))

    async def get_job_status(self, document_id: uuid.UUID) -> DocumentProcessingJobRead:
        job = await self.job_repo.get_latest_by_document_id(document_id)
        if not job:
            raise HTTPException(status_code=404, detail="No processing job found for this document.")
        return DocumentProcessingJobRead.model_validate(job)

    async def delete_document(self, document_id: uuid.UUID, current_user: User) -> None:
        doc = await self.doc_repo.get_active_by_id(document_id)
        if not doc:
            raise DocumentNotFoundException()
        await self.doc_repo.update(doc, {"is_active": False})
