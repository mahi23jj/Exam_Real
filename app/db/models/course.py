import uuid
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, Relationship, SQLModel

from app.db.base import TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from app.db.models.user import User
    from app.db.models.document import Document


class Course(TimestampMixin, table=True):
    __tablename__ = "courses"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    code: str = Field(unique=True, index=True, nullable=False, max_length=50)
    title: str = Field(nullable=False, max_length=255)
    description: Optional[str] = Field(default=None, nullable=True)
    created_by_user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    is_active: bool = Field(default=True, nullable=False)

    # Relationships
    created_by: Optional["User"] = Relationship()
    documents: List["Document"] = Relationship(
        back_populates="course",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
