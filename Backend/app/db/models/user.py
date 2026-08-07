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


