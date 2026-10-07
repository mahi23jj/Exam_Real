import uuid
from typing import Dict, Any, Optional
import httpx
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
        self.connection = "Username-Password-Authentication"

    async def register_user_in_auth0(
        self,
        email: str,
        password: str,
        full_name: Optional[str] = None,
        department: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Creates a user in Auth0 using the dbconnections/signup endpoint."""
        url = f"https://{auth0_settings.domain}/dbconnections/signup"
        payload = {
            "client_id": auth0_settings.client_id,
            "email": email,
            "password": password,
            "connection": self.connection
        }
        user_metadata = {}
        if full_name:
            payload["name"] = full_name
        if department:
            user_metadata["department"] = department
        if user_metadata:
            payload["user_metadata"] = user_metadata

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
            if response.status_code != 200:
                raise Exception(f"Auth0 registration failed: {response.text}")
            return response.json()

    async def login_user_in_auth0(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticates a user in Auth0 using Password Realm flow."""

        url = f"https://{auth0_settings.domain}/oauth/token"

        payload = {
            "grant_type": "http://auth0.com/oauth/grant-type/password-realm",
            "client_id": auth0_settings.client_id,
            "client_secret": auth0_settings.client_secret,
            "username": email,
            "password": password,
            "realm": "Username-Password-Authentication",
            "audience": auth0_settings.audience,
            "scope": "openid profile email"
                }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, data=payload)

            print(response.status_code)
            print(response.text)

            if response.status_code != 200:
                raise Exception(f"Auth0 login failed: {response.text}")

            return response.json()

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

    @staticmethod
    def _claim_value(claims: Dict[str, Any], *keys: str) -> Optional[str]:
        """Reads the first non-empty string claim from the given keys."""
        for key in keys:
            value = claims.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return None

    @staticmethod
    def _display_name(claim_name: Optional[str], email: str) -> str:
        """Best-effort human label that is never blank.

        Migration 0011 adds a check constraint requiring a non-blank
        ``full_name``, and every community surface renders it, so a fresh Auth0
        identity without a ``name`` claim still needs a usable default. The
        email local part is the same deterministic fallback the migration uses
        for legacy rows.
        """
        if claim_name and claim_name.strip():
            return claim_name.strip()
        local_part = email.split("@", 1)[0].strip() if email and "@" in email else ""
        return local_part or "ExamReal Student"

    async def sync_user(self, claims: Dict[str, Any]) -> User:
        """Synchronizes an Auth0 identity with the local profile record.

        Auth0 only owns authentication. Locally editable profile fields
        (``full_name``, ``department``, ``picture``) are *fill-only*: a claim
        may populate an empty field, but it can never overwrite a value the
        student already set in ExamReal. Session fields (``auth0_id``,
        ``email``, ``last_login``) always track the provider.
        """
        auth0_id = claims.get("sub")
        if not auth0_id:
            raise InvalidTokenException("Missing 'sub' claim in token")

        claim_email = self._claim_value(claims, "email")
        email = (claim_email or f"{auth0_id}@example.auth0.com").lower().strip()

        claim_name = self._claim_value(claims, "name", "given_name", "nickname")
        claim_picture = self._claim_value(claims, "picture")
        claim_department = self._claim_value(
            claims,
            f"{auth0_settings.custom_claim_namespace}department",
            "department",
            "edu_department",
        )
        if not claim_department:
            user_metadata = claims.get("user_metadata")
            if isinstance(user_metadata, dict):
                claim_department = self._claim_value(user_metadata, "department")

        user = await self.user_repo.get_by_auth0_id(auth0_id)
        if not user and claim_email:
            user = await self.user_repo.get_by_email(email)

        if user is None:
            user = await self.user_repo.create(
                User(
                    email=email,
                    auth0_id=auth0_id,
                    full_name=self._display_name(claim_name, email),
                    picture=claim_picture,
                    department=claim_department,
                    is_active=True,
                    last_login=utc_now(),
                )
            )
            return user

        update_data: Dict[str, Any] = {"last_login": utc_now()}

        if user.auth0_id != auth0_id:
            update_data["auth0_id"] = auth0_id
        if claim_email and (user.email or "").lower() != email:
            update_data["email"] = email

        if not user.profile_locked:
            if claim_name and not (user.full_name or "").strip():
                update_data["full_name"] = claim_name
            elif not (user.full_name or "").strip():
                # Never persist a blank name; fall back to the email local part.
                update_data["full_name"] = self._display_name(None, email)
            if claim_department and not (user.department or "").strip():
                update_data["department"] = claim_department
            if claim_picture and not (user.picture or "").strip():
                update_data["picture"] = claim_picture

        return await self.user_repo.update(user, update_data)
