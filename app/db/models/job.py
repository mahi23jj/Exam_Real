import uuid
from typing import Optional, TYPE_CHECKING
from sqlmodel import Field, Relationship, SQLModel, Column
from sqlalchemy import Enum

from app.db.base import TimestampMixin, generate_uuid
from app.db.models.document import JobStatus

if TYPE_CHECKING:
    from app.db.models.document import Document


class DocumentProcessingJob(TimestampMixin, table=True):
    __tablename__ = "document_processing_jobs"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    document_id: uuid.UUID = Field(foreign_key="documents.id", index=True, nullable=False)
    status: JobStatus = Field(
        sa_column=Column(
            Enum(
                JobStatus,
                name="jobstatus_job"
            ),
            nullable=False,
            index=True
        ),
        default=JobStatus.PENDING
    )
    current_step: str = Field(default="QUEUED", nullable=False, max_length=100)
    error_message: Optional[str] = Field(default=None, nullable=True)

    # Relationships
    document: Optional["Document"] = Relationship(back_populates="processing_jobs")
