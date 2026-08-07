import uuid
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt, JWTError, ExpiredSignatureError

from app.auth.config import auth0_settings
from app.auth.jwks import jwks_client
from app.auth.exceptions import InvalidTokenException, ExpiredTokenException
from app.db.models.user import User
from app.repositories.user_repository import UserRepository
from app.db.base import utc_now


class Auth0AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)

    async def verify_token(self, token: str) -> Dict[str, Any]:
        """Verifies JWT using Auth0 JWKS."""
        rsa_key = await jwks_client.get_signing_key(token)
        try:
            payload = jwt.decode(
                token,
                rsa_key,
                algorithms=auth0_settings.algorithms,
                audience=auth0_settings.audience,
                issuer=auth0_settings.issuer,
            )
            return payload
        except ExpiredSignatureError:
            raise ExpiredTokenException()
        except JWTError:
            raise InvalidTokenException("Invalid token signature or payload")

    async def sync_user(self, claims: Dict[str, Any]) -> User:
        """Synchronizes Auth0 user with local database."""
        auth0_id = claims.get("sub")
        if not auth0_id:
            raise InvalidTokenException("Missing 'sub' claim in token")

        # Get additional details from Auth0 if available via custom claims or standard ones
        email = claims.get("email", "")
        # Fallback if no email is provided to avoid unique constraint error
        if not email:
            email = f"{auth0_id}@example.auth0.com"
            
        full_name = claims.get("name")
        picture = claims.get("picture")

        # Try to find by auth0_id first
        user = await self.user_repo.get_by_auth0_id(auth0_id)
        
        if not user:
            # Maybe user exists by email from old auth system?
            if email:
                user = await self.user_repo.get_by_email(email)
            
            if user:
                # Update existing user to use Auth0
                update_data = {
                    "auth0_id": auth0_id,
                    "last_login": utc_now()
                }
                if picture and not user.picture:
                    update_data["picture"] = picture
                user = await self.user_repo.update(user, update_data)
            else:
                # Create entirely new user
                new_user = User(
                    email=email.lower().strip(),
                    auth0_id=auth0_id,
                    full_name=full_name,
                    picture=picture,
                    is_active=True,
                    last_login=utc_now()
                )
                user = await self.user_repo.create(new_user)
        else:
            # User exists, update last_login and potentially profile info
            update_data = {"last_login": utc_now()}
            if picture and user.picture != picture:
                update_data["picture"] = picture
            if full_name and user.full_name != full_name:
                update_data["full_name"] = full_name
            user = await self.user_repo.update(user, update_data)

        return user
