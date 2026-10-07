import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict, Field, field_validator


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    picture: Optional[str] = None
    department: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    picture: Optional[str] = Field(default=None, max_length=2048)
    department: Optional[str] = Field(default=None, min_length=2, max_length=120)

    @field_validator("full_name", "department", "picture", mode="before")
    @classmethod
    def blank_to_none(cls, value):
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("full_name", "department", mode="after")
    @classmethod
    def strip_text(cls, value):
        return value.strip() if isinstance(value, str) else value


class UserRead(UserBase):
    id: uuid.UUID
    auth0_id: Optional[str] = None
    is_active: bool
    profile_locked: bool = False
    is_profile_complete: bool = False
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserPublicRead(BaseModel):
    """Profile fields safe to expose to other students."""

    id: uuid.UUID
    full_name: Optional[str] = None
    picture: Optional[str] = None
    department: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ProfileUpdateRequest(BaseModel):
    """Editable own-profile fields. Omitted fields are left untouched."""

    full_name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    department: Optional[str] = Field(default=None, min_length=2, max_length=120)
    picture: Optional[str] = Field(default=None, max_length=2048)

    model_config = ConfigDict(extra="forbid")

    @field_validator("full_name", "department", "picture", mode="before")
    @classmethod
    def blank_to_none(cls, value):
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("full_name", "department", mode="after")
    @classmethod
    def strip_text(cls, value):
        return value.strip() if isinstance(value, str) else value


class MyProfileRead(UserBase):
    """Own profile, including the completion state used to prompt students."""

    id: uuid.UUID
    is_active: bool
    profile_locked: bool = False
    is_profile_complete: bool = False
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)