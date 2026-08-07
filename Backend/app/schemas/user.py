import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    picture: Optional[str] = None


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    picture: Optional[str] = None


class UserRead(UserBase):
    id: uuid.UUID
    auth0_id: Optional[str] = None
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserPublicRead(BaseModel):
    id: uuid.UUID
    full_name: Optional[str] = None
    picture: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)
