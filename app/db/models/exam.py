import enum
import uuid
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from sqlmodel import Field, Relationship, SQLModel, JSON, Column

from app.db.base import TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from app.db.models.document import Document
    from app.db.models.content_block import ContentBlock


class AnswerSource(str, enum.Enum):
    OFFICIAL = "OFFICIAL"      # Answer was explicitly in the document
    AI_INFERRED = "AI_INFERRED"  # Answer inferred by the LLM from context
    MISSING = "MISSING"        # Answer could not be determined


class QuestionContentBlockLink(TimestampMixin, table=True):
    __tablename__ = "question_content_block_links"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    question_id: uuid.UUID = Field(foreign_key="questions.id", index=True, nullable=False)
    content_block_id: uuid.UUID = Field(foreign_key="content_blocks.id", index=True, nullable=False)
    similarity_score: float = Field(nullable=False)


class Exam(TimestampMixin, table=True):
    __tablename__ = "exams"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    document_id: uuid.UUID = Field(foreign_key="documents.id", unique=True, index=True, nullable=False)
    title: str = Field(nullable=False, max_length=255)
    academic_year: Optional[str] = Field(default=None, max_length=50)
    term: Optional[str] = Field(default=None, max_length=50)

    # Relationships
    document: Optional["Document"] = Relationship()
    questions: List["Question"] = Relationship(
        back_populates="exam",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


class Question(TimestampMixin, table=True):
    __tablename__ = "questions"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    exam_id: uuid.UUID = Field(foreign_key="exams.id", index=True, nullable=False)
    question_number: int = Field(nullable=False, index=True)
    question_text: str = Field(nullable=False)
    question_image_url: Optional[str] = Field(default=None, nullable=True)
    explanation: Optional[str] = Field(default=None, nullable=True)
    answer_source: AnswerSource = Field(default=AnswerSource.MISSING, nullable=False)
    metadata_json: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))

    # Relationships
    exam: Optional["Exam"] = Relationship(back_populates="questions")
    choices: List["Choice"] = Relationship(
        back_populates="question",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


class Choice(TimestampMixin, table=True):
    __tablename__ = "choices"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    question_id: uuid.UUID = Field(foreign_key="questions.id", index=True, nullable=False)
    choice_label: str = Field(nullable=False, max_length=10)  # e.g., 'A', 'B', 'C', 'D'
    choice_text: str = Field(nullable=False)
    is_correct: Optional[bool] = Field(default=None, nullable=True)

    # Relationships
    question: Optional["Question"] = Relationship(back_populates="choices")
