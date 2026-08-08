import uuid
from datetime import datetime
from pydantic import BaseModel


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    

class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
