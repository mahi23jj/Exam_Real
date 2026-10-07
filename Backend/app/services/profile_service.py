"""Own-profile read/update service.

The local ExamReal record is the source of truth for editable identity fields
(``full_name``, ``department``, ``picture``). Auth0 remains the authentication
provider only, so editing here must survive every later login/sync.
"""

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import MyProfileRead, ProfileUpdateRequest


class ProfileService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)

    async def get_my_profile(self, current_user: User) -> MyProfileRead:
        return self._to_read(current_user)

    async def update_my_profile(
        self,
        current_user: User,
        updates: ProfileUpdateRequest,
    ) -> MyProfileRead:
        provided = updates.model_dump(exclude_unset=True)

        if not provided:
            return self._to_read(current_user)

        # Name and department are the student's identity, so an explicit blank
        # (or null) is rejected rather than silently stored. ``picture`` may be
        # cleared with null, which is why it is not checked here.
        for field in ("full_name", "department"):
            if field in provided:
                value = provided[field]
                if value is None or not str(value).strip():
                    raise ValueError(f"{field} cannot be empty")

        # A student-provided name/department/picture is authoritative from now
        # on, so Auth0 claims can no longer overwrite it.
        lock_fields = {"full_name", "department", "picture"}
        payload = dict(provided)
        if lock_fields.intersection(provided.keys()):
            payload["profile_locked"] = True

        updated = await self.user_repo.patch(current_user, payload)
        return self._to_read(updated)

    async def update_picture(
        self,
        current_user: User,
        picture: Optional[str],
    ) -> MyProfileRead:
        updated = await self.user_repo.patch(
            current_user, {"picture": picture, "profile_locked": True}
        )
        return self._to_read(updated)

    def _to_read(self, user: User) -> MyProfileRead:
        return MyProfileRead(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            picture=user.picture,
            department=user.department,
            is_active=user.is_active,
            profile_locked=user.profile_locked,
            is_profile_complete=user.is_profile_complete,
            last_login=user.last_login,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )