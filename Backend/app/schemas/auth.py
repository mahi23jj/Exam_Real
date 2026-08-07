from typing import Optional
from pydantic import BaseModel


class TokenPayload(BaseModel):
    """Auth0 token payload"""
    sub: str
    iss: str
    aud: str | list[str]
    exp: int
    iat: int
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None
