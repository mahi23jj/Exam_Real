import enum
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, TYPE_CHECKING
from sqlmodel import Field, Relationship, SQLModel, JSON, Column

from app.db.base import TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from app.db.models.user import User


class StudyItemType(str, enum.Enum):
    COURSE = "COURSE"
    DOCUMENT = "DOCUMENT"
    PAST_EXAM = "PAST_EXAM"


class RecentStudyItem(TimestampMixin, table=True):
    __tablename__ = "recent_study_items"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    item_type: StudyItemType = Field(nullable=False, index=True)
    item_id: uuid.UUID = Field(nullable=False, index=True)
    
    title: str = Field(nullable=False, max_length=255)
    subtitle: Optional[str] = Field(default=None, max_length=255, nullable=True)
    continue_url: str = Field(nullable=False, max_length=500)
    last_opened_at: datetime = Field(default_factory=datetime.utcnow, index=True, nullable=False)
    
    metadata_json: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))

    # Relationships
    user: Optional["User"] = Relationship()
