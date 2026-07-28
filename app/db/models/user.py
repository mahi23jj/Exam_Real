import enum
import uuid
from datetime import datetime
from typing import Optional, List
from sqlmodel import Field, Relationship, SQLModel

from app.db.base import TimestampMixin, generate_uuid


class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    INSTRUCTOR = "INSTRUCTOR"
    ADMIN = "ADMIN"


class User(TimestampMixin, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    email: str = Field(unique=True, index=True, nullable=False, max_length=255)
    hashed_password: str = Field(nullable=False)
    full_name: str = Field(nullable=False, max_length=255)
    role: UserRole = Field(default=UserRole.STUDENT, nullable=False)
    is_active: bool = Field(default=True, nullable=False)

    # Relationships
    refresh_tokens: List["RefreshToken"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


class RefreshToken(TimestampMixin, table=True):
    __tablename__ = "refresh_tokens"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    token: str = Field(unique=True, index=True, nullable=False)
    expires_at: datetime = Field(nullable=False)
    revoked: bool = Field(default=False, nullable=False)

    # Relationships
    user: Optional[User] = Relationship(back_populates="refresh_tokens")
