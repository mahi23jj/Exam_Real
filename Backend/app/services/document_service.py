import uuid
from typing import List, Optional, Tuple
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

    async def upload_documents(
            self,
            course_id: uuid.UUID,
            files: List[UploadFile],
            doc_type: DocumentType,
            current_user: User
        ) -> List[DocumentUploadResponse]:

        """
        Upload multiple documents to a course.
        Creates separate processing jobs for each document.
        """

        # 1. Validate course
        course = await self.course_repo.get_active_by_id(course_id)

        if not course:
            raise HTTPException(
                status_code=404,
                detail="Course not found"
            )


        # 2. Permission check
        if course.created_by_user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Only course owner can upload documents"
            )


        # 3. Upload limit
        MAX_FILES = 10

        if len(files) > MAX_FILES:
            raise HTTPException(
                status_code=400,
                detail=f"Maximum {MAX_FILES} files allowed"
            )


        uploaded_documents = []


        for file in files:

            filename = file.filename or "uploaded_document"


            # 4. Validate extension
            file_type = self._determine_file_type(filename)


            # 5. Upload to Cloudinary
            upload_meta = await self.storage_service.upload_file(
                file=file,
                folder=f"studyloop/{course.code}"
            )


            # 6. Save document metadata
            document = Document(
                course_id=course_id,
                uploaded_by_user_id=current_user.id,

                title=filename,
                file_name=filename,

                file_type=file_type,
                doc_type=doc_type,

                cloudinary_public_id=upload_meta["public_id"],
                cloudinary_secure_url=upload_meta["secure_url"],

                file_size_bytes=upload_meta["bytes"],

                status=JobStatus.PENDING,

                metadata_json={
                    "format": upload_meta["format"]
                },

                is_active=True
            )


            created_document = await self.doc_repo.create(document)


            # 7. Create processing job
            job = DocumentProcessingJob(
                document_id=created_document.id,
                status=JobStatus.PENDING,
                current_step="QUEUED_FOR_PROCESSING"
            )


            created_job = await self.job_repo.create(job)


            # 8. Start AI pipeline
            try:
                process_document_task.delay(
                    str(created_document.id),
                    str(created_job.id)
                )

            except Exception:
                # local development without Celery
                pass



            uploaded_documents.append(
                DocumentUploadResponse(
                    message="Document uploaded successfully",
                    document=DocumentRead.model_validate(
                        created_document
                    ),
                    job=DocumentProcessingJobRead.model_validate(
                        created_job
                    )
                )
            )


        return uploaded_documents

    async def get_document_by_id(self, document_id: uuid.UUID) -> DocumentRead:
        doc = await self.doc_repo.get_active_by_id(document_id)
        if not doc:
            raise DocumentNotFoundException()
        return DocumentRead.model_validate(doc)

    async def list_course_documents(
        self,
        course_id: uuid.UUID,
        statuses: Optional[List[JobStatus]] = None,
        doc_type: Optional[DocumentType] = None
    ) -> DocumentListResponse:
        docs = await self.doc_repo.list_by_course(course_id, statuses=statuses, doc_type=doc_type)
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
