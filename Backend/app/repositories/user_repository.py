import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, session: AsyncSession):
        super().__init__(User, session)

    async def get_by_email(self, email: str) -> Optional[User]:
        statement = select(User).where(User.email == email.lower().strip())
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def get_by_auth0_id(self, auth0_id: str) -> Optional[User]:
        statement = select(User).where(User.auth0_id == auth0_id)
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()
