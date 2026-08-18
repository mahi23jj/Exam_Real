from typing import List
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.models.document import DocumentType
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.document import DocumentRead, DocumentProcessingJobRead, DocumentUploadResponse, DocumentListResponse
from app.services.document_service import DocumentService

router = APIRouter(tags=["Document Management & AI Pipeline"])


@router.post(
    "/courses/{course_id}/documents",
    response_model=List[DocumentUploadResponse],
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload document (PDF/PPT/PPTX/Image) and trigger background AI processing"
)
async def upload_document(
    course_id: uuid.UUID,
    doc_type: DocumentType = Form(..., description="Document type: NOTE or PAST_EXAM"),
    files: List[UploadFile] = File(...,  description="Multiple document files"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[DocumentUploadResponse]:
    """Uploads document to Cloudinary, creates Document record & Processing Job, enqueues background processing, and immediately returns."""
    service = DocumentService(db)
    return await service.upload_document(
        course_id=course_id,
        files=files,
        doc_type=doc_type,
        current_user=current_user
    )


@router.get(
    "/courses/{course_id}/documents",
    response_model=DocumentListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all documents uploaded to a course"
)
async def list_course_documents(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
) -> DocumentListResponse:
    """Retrieves list of active documents in a course."""
    service = DocumentService(db)
    return await service.list_course_documents(course_id)


@router.get(
    "/documents/{document_id}",
    response_model=DocumentRead,
    status_code=status.HTTP_200_OK,
    summary="Get document details by ID"
)
async def get_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
) -> DocumentRead:
    """Retrieves metadata of a specific document."""
    service = DocumentService(db)
    return await service.get_document_by_id(document_id)


@router.get(
    "/documents/{document_id}/job",
    response_model=DocumentProcessingJobRead,
    status_code=status.HTTP_200_OK,
    summary="Get AI background processing job status for a document"
)
async def get_job_status(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
) -> DocumentProcessingJobRead:
    """Retrieves background processing status and step for a document."""
    service = DocumentService(db)
    return await service.get_job_status(document_id)


@router.delete(
    "/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete document (Soft delete)"
)
async def delete_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """Soft deletes a document record."""
    service = DocumentService(db)
    await service.delete_document(document_id, current_user)
