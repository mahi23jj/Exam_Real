import uuid
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from sqlmodel import Field, Relationship, SQLModel, JSON, Column
from sqlalchemy import Text
from sqlalchemy.dialects.postgresql import TSVECTOR
from pgvector.sqlalchemy import Vector

from app.db.base import TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from app.db.models.document import Document
    from app.db.models.exam import QuestionContentBlockLink


class ContentBlock(TimestampMixin, table=True):
    __tablename__ = "content_blocks"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    document_id: uuid.UUID = Field(foreign_key="documents.id", index=True, nullable=False)
    page_number: int = Field(nullable=False, index=True)
    block_order: int = Field(nullable=False)
    content: str = Field(nullable=False)
    # tsvector column for Full Text Search — populated by DB trigger (see migration 0006)
    content_tsv: Optional[str] = Field(
        default=None,
        sa_column=Column("content_tsv", TSVECTOR, nullable=True)
    )
    metadata_json: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))

    # Relationships
    document: Optional["Document"] = Relationship()
    embedding: Optional["Embedding"] = Relationship(
        back_populates="content_block",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "uselist": False}
    )


class Embedding(TimestampMixin, table=True):
    __tablename__ = "embeddings"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    content_block_id: uuid.UUID = Field(foreign_key="content_blocks.id", unique=True, index=True, nullable=False)
    
    # 1024-dimensional vector for OpenAI text-embedding-3-small
    vector: List[float] = Field(sa_column=Column(Vector(1024), nullable=False))
    model_name: str = Field(default="text-embedding-3-small", nullable=False)

    # Relationships
    content_block: Optional["ContentBlock"] = Relationship(back_populates="embedding")
