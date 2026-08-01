import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User, RefreshToken
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, session: AsyncSession):
        super().__init__(User, session)

    async def get_by_email(self, email: str) -> Optional[User]:
        statement = select(User).where(User.email == email.lower().strip())
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()


class RefreshTokenRepository(BaseRepository[RefreshToken]):
    def __init__(self, session: AsyncSession):
        super().__init__(RefreshToken, session)

    async def get_by_token(self, token: str) -> Optional[RefreshToken]:
        statement = select(RefreshToken).where(RefreshToken.token == token)
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def revoke_token(self, token_obj: RefreshToken) -> RefreshToken:
        token_obj.revoked = True
        self.session.add(token_obj)
        await self.session.flush()
        return token_obj

    async def revoke_all_user_tokens(self, user_id: uuid.UUID) -> None:
        statement = select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked == False
        )
        result = await self.session.execute(statement)
        tokens = result.scalars().all()
        for t in tokens:
            t.revoked = True
            self.session.add(t)
        await self.session.flush()
