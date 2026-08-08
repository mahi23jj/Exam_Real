import enum
import uuid
from typing import Optional, TYPE_CHECKING
from sqlmodel import Field, Relationship, SQLModel

from app.db.base import TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from app.db.models.user import User
    from app.db.models.exam import PastExamQuestion, Choice


class ConfidenceLevel(str, enum.Enum):
    CONFIDENT = "CONFIDENT"
    UNSURE = "UNSURE"
    GUESS = "GUESS"


class StudentAnswer(TimestampMixin, table=True):
    __tablename__ = "student_answers"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    student_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    question_id: uuid.UUID = Field(foreign_key="questions.id", index=True, nullable=False)
    selected_choice_id: Optional[uuid.UUID] = Field(default=None, foreign_key="choices.id", nullable=True)
    
    confidence: ConfidenceLevel = Field(nullable=False)
    reasoning_text: Optional[str] = Field(default=None, nullable=True)
    is_correct: Optional[bool] = Field(default=None, nullable=True)
    ai_generated_explanation: Optional[str] = Field(default=None, nullable=True)

    # Relationships
    student: Optional["User"] = Relationship()
    question: Optional["PastExamQuestion"] = Relationship(back_populates="student_answers")
    selected_choice: Optional["Choice"] = Relationship()
