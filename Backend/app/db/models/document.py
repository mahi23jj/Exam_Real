import enum
import uuid
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from sqlmodel import Field, Relationship, SQLModel, JSON, Column

from app.db.base import TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from app.db.models.user import User
    from app.db.models.course import Course
    from app.db.models.job import DocumentProcessingJob
from sqlalchemy import Column, Enum


class FileType(str, enum.Enum):
    PDF = "PDF"
    PPT = "PPT"
    PPTX = "PPTX"
    IMAGE = "IMAGE"


class DocumentType(str, enum.Enum):
    NOTE = "NOTE"
    PAST_EXAM = "PAST_EXAM"


class JobStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Document(TimestampMixin, table=True):
    __tablename__ = "documents"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    course_id: uuid.UUID = Field(foreign_key="courses.id", index=True, nullable=False)
    uploaded_by_user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    
    title: str = Field(nullable=False, max_length=255)
    file_name: str = Field(nullable=False, max_length=255)
    file_type: FileType = Field(nullable=False)
    doc_type: DocumentType = Field(nullable=False)
    
    cloudinary_public_id: str = Field(nullable=False)
    cloudinary_secure_url: str = Field(nullable=False)
    file_size_bytes: int = Field(nullable=False)
    status: JobStatus = Field(
        sa_column=Column(
            Enum(
                JobStatus,
                name="jobstatus"
            ),
            nullable=False
        ),
        default=JobStatus.PENDING
    )
    
    metadata_json: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    is_active: bool = Field(default=True, nullable=False)
    version: int = Field(default=1, nullable=False)

    # Relationships
    course: Optional["Course"] = Relationship(back_populates="documents")
    uploaded_by: Optional["User"] = Relationship()
    processing_jobs: List["DocumentProcessingJob"] = Relationship(
        back_populates="document",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
