import enum
import uuid
from datetime import datetime
from typing import Optional, List
from sqlmodel import Field, Relationship, SQLModel

from app.db.base import TimestampMixin, generate_uuid





class User(TimestampMixin, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=generate_uuid, primary_key=True, index=True)
    email: str = Field(unique=True, index=True, nullable=False, max_length=255)
    full_name: Optional[str] = Field(default=None, max_length=255)
    picture: Optional[str] = Field(default=None)
    is_active: bool = Field(default=True, nullable=False)

    auth0_id: Optional[str] = Field(default=None, unique=True, index=True, nullable=True)
    last_login: Optional[datetime] = Field(default=None, nullable=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    # Study context used by people discovery (same-department recommendations)
    department: Optional[str] = Field(default=None, index=True, nullable=True, max_length=255)

    # Identity fields that must never be re-derived from the identity provider
    # once a student has set them in ExamReal. Empty means "not provided yet",
    # so the next Auth0 sync may fill them in from a claim.
    profile_locked: bool = Field(default=False, nullable=False)

    @property
    def is_profile_complete(self) -> bool:
        return bool((self.full_name or "").strip()) and bool((self.department or "").strip())

    def display_name(self) -> str:
        """Human label for a user, never the literal string 'Unknown'."""
        name = (self.full_name or "").strip()
        if name:
            return name
        email = (self.email or "").strip()
        if email and "@" in email:
            return email.split("@", 1)[0]
        return "ExamReal Student"


