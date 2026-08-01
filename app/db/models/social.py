import enum
import uuid
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from sqlmodel import Field, Relationship, SQLModel, JSON, Column
from sqlalchemy import Text

from app.db.base import TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from app.db.models.user import User
    from app.db.models.document import Document


class PinType(str, enum.Enum):
    MEMORY_TRICK = "MEMORY_TRICK"
    EXPLANATION = "EXPLANATION"
    EXAM_TIP = "EXAM_TIP"
    WARNING = "WARNING"
    COMMON_MISTAKE = "COMMON_MISTAKE"
    IMPLEMENTATION_TIP = "IMPLEMENTATION_TIP"
    FORMULA_TIP = "FORMULA_TIP"
    OTHER = "OTHER"


class Visibility(str, enum.Enum):
    PUBLIC = "PUBLIC"
    FOLLOWERS_ONLY = "FOLLOWERS_ONLY"
    PRIVATE = "PRIVATE"


class TargetType(str, enum.Enum):
    PIN = "PIN"
    QUESTION = "QUESTION"
    REPLY = "REPLY"
    COURSE = "COURSE"
    USER = "USER"
    TOPIC = "TOPIC"


class LocationTargetType(str, enum.Enum):
    SENTENCE = "SENTENCE"
    PARAGRAPH = "PARAGRAPH"
    HEADING = "HEADING"
    DIAGRAM = "DIAGRAM"
    IMAGE = "IMAGE"
    EXAM_QUESTION = "EXAM_QUESTION"
    PAGE = "PAGE"


class ReactionType(str, enum.Enum):
    LIKE = "LIKE"
    HELPFUL = "HELPFUL"
    INSIGHTFUL = "INSIGHTFUL"


class Reaction(TimestampMixin, table=True):
    __tablename__ = "reactions"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    target_type: TargetType = Field(nullable=False, index=True)
    target_id: uuid.UUID = Field(nullable=False, index=True)
    reaction_type: ReactionType = Field(default=ReactionType.LIKE, nullable=False)

    # Relationships
    user: Optional["User"] = Relationship()


class SavedItem(TimestampMixin, table=True):
    __tablename__ = "saved_items"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    target_type: TargetType = Field(nullable=False, index=True)
    target_id: uuid.UUID = Field(nullable=False, index=True)

    # Relationships
    user: Optional["User"] = Relationship()


class KnowledgePin(TimestampMixin, table=True):
    __tablename__ = "knowledge_pins"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    author_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    document_id: uuid.UUID = Field(foreign_key="documents.id", index=True, nullable=False)
    document_version: int = Field(default=1, index=True, nullable=False)
    page_number: int = Field(nullable=False, index=True)
    
    # Location anchors
    target_type: LocationTargetType = Field(default=LocationTargetType.PARAGRAPH, nullable=False)
    target_id: Optional[uuid.UUID] = Field(default=None, index=True, nullable=True)  # References content_block_id or question_id if available
    selection_start_offset: Optional[int] = Field(default=None, index=True, nullable=True)
    selection_end_offset: Optional[int] = Field(default=None, index=True, nullable=True)
    selected_text_snapshot: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    location_metadata_json: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))

    # Pin Details
    pin_type: PinType = Field(default=PinType.EXPLANATION, nullable=False, index=True)
    visibility: Visibility = Field(default=Visibility.PUBLIC, nullable=False, index=True)
    title: str = Field(nullable=False, max_length=255)
    content: str = Field(sa_column=Column(Text, nullable=False))
    
    # Denormalized aggregate metrics
    likes_count: int = Field(default=0, nullable=False)
    saves_count: int = Field(default=0, nullable=False)
    reports_count: int = Field(default=0, nullable=False)
    is_active: bool = Field(default=True, nullable=False)

class QuestionStatus(str, enum.Enum):
    OPEN = "OPEN"
    SOLVED = "SOLVED"
    CLOSED = "CLOSED"


class LearningQuestion(TimestampMixin, table=True):
    __tablename__ = "learning_questions"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    author_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    document_id: uuid.UUID = Field(foreign_key="documents.id", index=True, nullable=False)
    document_version: int = Field(default=1, index=True, nullable=False)
    page_number: int = Field(nullable=False, index=True)
    
    # Location anchors
    target_type: LocationTargetType = Field(default=LocationTargetType.PARAGRAPH, nullable=False)
    target_id: Optional[uuid.UUID] = Field(default=None, index=True, nullable=True)
    selection_start_offset: Optional[int] = Field(default=None, index=True, nullable=True)
    selection_end_offset: Optional[int] = Field(default=None, index=True, nullable=True)
    selected_text_snapshot: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    location_metadata_json: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))

    # Question Details
    title: str = Field(nullable=False, max_length=255)
    content: str = Field(sa_column=Column(Text, nullable=False))
    visibility: Visibility = Field(default=Visibility.PUBLIC, nullable=False, index=True)
    status: QuestionStatus = Field(default=QuestionStatus.OPEN, nullable=False, index=True)
    
    # Denormalized aggregate metrics
    answers_count: int = Field(default=0, nullable=False)
    views_count: int = Field(default=0, nullable=False)
    likes_count: int = Field(default=0, nullable=False)
    saves_count: int = Field(default=0, nullable=False)
    reports_count: int = Field(default=0, nullable=False)
    is_active: bool = Field(default=True, nullable=False)

    # Relationships
    author: Optional["User"] = Relationship()
    document: Optional["Document"] = Relationship()
    replies: List["QuestionReply"] = Relationship(
        back_populates="question",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


class QuestionReply(TimestampMixin, table=True):
    __tablename__ = "question_replies"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    question_id: uuid.UUID = Field(foreign_key="learning_questions.id", index=True, nullable=False)
    parent_reply_id: Optional[uuid.UUID] = Field(default=None, foreign_key="question_replies.id", index=True, nullable=True)
    author_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    content: str = Field(sa_column=Column(Text, nullable=False))
    is_accepted_answer: bool = Field(default=False, index=True, nullable=False)
    
    # Denormalized metrics & history
    likes_count: int = Field(default=0, nullable=False)
    reports_count: int = Field(default=0, nullable=False)
    is_active: bool = Field(default=True, nullable=False)
    edit_history_json: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))

    # Relationships
    question: Optional["LearningQuestion"] = Relationship(back_populates="replies")
    author: Optional["User"] = Relationship()


class Follow(TimestampMixin, table=True):
    __tablename__ = "follows"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    follower_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    target_type: TargetType = Field(nullable=False, index=True)
    target_id: uuid.UUID = Field(nullable=False, index=True)

    # Relationships
    follower: Optional["User"] = Relationship()


class ActivityType(str, enum.Enum):
    CREATED_PIN = "CREATED_PIN"
    ASKED_QUESTION = "ASKED_QUESTION"
    REPLIED_TO_QUESTION = "REPLIED_TO_QUESTION"
    ACCEPTED_ANSWER = "ACCEPTED_ANSWER"
    EARNED_BADGE = "EARNED_BADGE"
    COMPLETED_COURSE = "COMPLETED_COURSE"


class UserActivity(TimestampMixin, table=True):
    __tablename__ = "user_activities"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    activity_type: ActivityType = Field(nullable=False, index=True)
    
    # Optional polymorphic target references
    target_type: Optional[TargetType] = Field(default=None, index=True, nullable=True)
    target_id: Optional[uuid.UUID] = Field(default=None, index=True, nullable=True)
    
    # Denormalized/Contextual data for the feed (e.g. "Asked a question: 'What is TCP?'")
    context_data: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))

    # Relationships
    user: Optional["User"] = Relationship()
