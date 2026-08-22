import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from app.db.models.document import FileType, DocumentType, JobStatus


class DocumentProcessingJobRead(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    status: JobStatus
    current_step: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentRead(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    uploaded_by_user_id: uuid.UUID
    title: str
    file_name: str
    file_type: FileType
    doc_type: DocumentType
    cloudinary_public_id: str
    cloudinary_secure_url: str
    file_size_bytes: int
    status: JobStatus
    metadata_json: Dict[str, Any]
    is_active: bool
    version: int = 1
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentUploadResponse(BaseModel):
    message: str
    document: DocumentRead
    job: DocumentProcessingJobRead


class DocumentListResponse(BaseModel):
    items: List[DocumentRead]
    total: int
