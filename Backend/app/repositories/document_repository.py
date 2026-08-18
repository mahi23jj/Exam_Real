import uuid
from typing import Optional, List
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.document import Document, DocumentType, JobStatus
from app.db.models.job import DocumentProcessingJob
from app.repositories.base import BaseRepository


class DocumentRepository(BaseRepository[Document]):
    def __init__(self, session: AsyncSession):
        super().__init__(Document, session)

    async def get_active_by_id(self, id: uuid.UUID) -> Optional[Document]:
        statement = select(Document).where(Document.id == id, Document.is_active == True)
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def list_by_course(
        self,
        course_id: uuid.UUID,
        statuses: Optional[List[JobStatus]] = None,
        doc_type: Optional[DocumentType] = None
    ) -> List[Document]:
        statement = select(Document).where(
            Document.course_id == course_id,
            Document.is_active == True
        )
        if statuses:
            statement = statement.where(Document.status.in_(statuses))
        if doc_type:
            statement = statement.where(Document.doc_type == doc_type)

        statement = statement.order_by(Document.created_at.desc())
        result = await self.session.execute(statement)
        return list(result.scalars().all())


class DocumentProcessingJobRepository(BaseRepository[DocumentProcessingJob]):
    def __init__(self, session: AsyncSession):
        super().__init__(DocumentProcessingJob, session)

    async def get_latest_by_document_id(self, document_id: uuid.UUID) -> Optional[DocumentProcessingJob]:
        statement = select(DocumentProcessingJob).where(
            DocumentProcessingJob.document_id == document_id
        ).order_by(DocumentProcessingJob.created_at.desc())
        result = await self.session.execute(statement)
        return result.scalars().first()

    async def update_status(self, job_id: uuid.UUID, status: JobStatus, current_step: str, error_message: Optional[str] = None) -> Optional[DocumentProcessingJob]:
        job = await self.get_by_id(job_id)
        if job:
            job.status = status
            job.current_step = current_step
            if error_message:
                job.error_message = error_message
            self.session.add(job)
            await self.session.flush()
        return job
