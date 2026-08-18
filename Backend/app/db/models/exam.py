import enum
import uuid
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from sqlmodel import Field, Relationship, SQLModel, JSON, Column

from app.db.base import TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from app.db.models.document import Document
    from app.db.models.content_block import ContentBlock
    from app.db.models.course import Course
    from app.db.models.student_answer import StudentAnswer


class AnswerSource(str, enum.Enum):
    OFFICIAL = "OFFICIAL"      # Answer was explicitly in the document
    AI_INFERRED = "AI_INFERRED"  # Answer inferred by the LLM from context
    MISSING = "MISSING"        # Answer could not be determined


class DifficultyLevel(str, enum.Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"


class QuestionType(str, enum.Enum):
    MULTIPLE_CHOICE = "MULTIPLE_CHOICE"
    TRUE_FALSE = "TRUE_FALSE"
    OPEN_ENDED = "OPEN_ENDED"


class Topic(TimestampMixin, table=True):
    __tablename__ = "topics"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    course_id: uuid.UUID = Field(foreign_key="courses.id", index=True, nullable=False)
    name: str = Field(nullable=False, max_length=255)
    normalized_name: str = Field(nullable=False, max_length=255, index=True)

    # Relationships
    course: Optional["Course"] = Relationship()
    past_exam_questions: List["PastExamQuestion"] = Relationship(
        back_populates="topic"
    )
    analytics: List["TopicAnalytics"] = Relationship(
        back_populates="topic",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    year_analytics: List["TopicYearAnalytics"] = Relationship(
        back_populates="topic",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


class TopicAnalytics(TimestampMixin, table=True):
    __tablename__ = "topic_analytics"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    topic_id: uuid.UUID = Field(foreign_key="topics.id", unique=True, index=True, nullable=False)
    course_id: uuid.UUID = Field(foreign_key="courses.id", index=True, nullable=False)
    total_questions: int = Field(default=0, nullable=False)

    # Relationships
    topic: Optional["Topic"] = Relationship(back_populates="analytics")
    course: Optional["Course"] = Relationship()


class TopicYearAnalytics(TimestampMixin, table=True):
    __tablename__ = "topic_year_analytics"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    topic_id: uuid.UUID = Field(foreign_key="topics.id", index=True, nullable=False)
    academic_year: str = Field(nullable=False, max_length=50, index=True)
    question_count: int = Field(default=0, nullable=False)

    # Relationships
    topic: Optional["Topic"] = Relationship(back_populates="year_analytics")


class Exam(TimestampMixin, table=True):
    __tablename__ = "exams"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    document_id: uuid.UUID = Field(foreign_key="documents.id", unique=True, index=True, nullable=False)
    title: str = Field(nullable=False, max_length=255)
    academic_year: Optional[str] = Field(default=None, max_length=50)
    term: Optional[str] = Field(default=None, max_length=50)

    # Relationships
    document: Optional["Document"] = Relationship()
    questions: List["PastExamQuestion"] = Relationship(
        back_populates="exam",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


class PastExamQuestion(TimestampMixin, table=True):
    __tablename__ = "questions"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    exam_id: uuid.UUID = Field(foreign_key="exams.id", index=True, nullable=False)
    topic_id: Optional[uuid.UUID] = Field(default=None, foreign_key="topics.id", index=True, nullable=True)
    
    question_number: int = Field(nullable=False, index=True)
    question_text: str = Field(nullable=False)
    question_image_url: Optional[str] = Field(default=None, nullable=True)
    explanation: Optional[str] = Field(default=None, nullable=True)
    
    # Educational Intelligence & PDF Location
    subtopic: Optional[str] = Field(default=None, max_length=255, nullable=True)
    difficulty: Optional[DifficultyLevel] = Field(default=None, nullable=True)
    question_type: Optional[QuestionType] = Field(default=None, nullable=True)
    confidence: Optional[float] = Field(default=None, nullable=True)
    answer_source: AnswerSource = Field(default=AnswerSource.MISSING, nullable=False)
    
    page_number: Optional[int] = Field(default=None, index=True, nullable=True)
    location_json: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    metadata_json: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))

    # Relationships
    exam: Optional["Exam"] = Relationship(back_populates="questions")
    topic: Optional["Topic"] = Relationship(back_populates="past_exam_questions")
    student_answers: List["StudentAnswer"] = Relationship(back_populates="question")
    choices: List["Choice"] = Relationship(
        back_populates="question",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    content_block_links: List["QuestionContentBlockLink"] = Relationship(
        back_populates="question",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


class QuestionContentBlockLink(TimestampMixin, table=True):
    __tablename__ = "question_content_block_links"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    question_id: uuid.UUID = Field(foreign_key="questions.id", index=True, nullable=False)
    content_block_id: uuid.UUID = Field(foreign_key="content_blocks.id", index=True, nullable=False)
    similarity_score: float = Field(nullable=False)

    # Relationships
    question: Optional["PastExamQuestion"] = Relationship(back_populates="content_block_links")


class Choice(TimestampMixin, table=True):
    __tablename__ = "choices"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    question_id: uuid.UUID = Field(foreign_key="questions.id", index=True, nullable=False)
    choice_label: str = Field(nullable=False, max_length=10)  # e.g., 'A', 'B', 'C', 'D'
    choice_text: str = Field(nullable=False)
    is_correct: Optional[bool] = Field(default=None, nullable=True)

    # Relationships
    question: Optional["PastExamQuestion"] = Relationship(back_populates="choices")
