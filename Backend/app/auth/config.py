"""Auth0-specific configuration.

Reads values from the global Settings object.
All Auth0 concerns are isolated to this module.
"""

from app.core.config import settings


class Auth0Settings:
    """Provides Auth0-specific configuration derived from the global settings."""

    @property
    def domain(self) -> str:
        return settings.AUTH0_DOMAIN

    @property
    def client_id(self) -> str:
        return settings.AUTH0_CLIENT_ID

    @property
    def client_secret(self) -> str:
        return settings.AUTH0_CLIENT_SECRET

    @property
    def audience(self) -> str:
        return settings.AUTH0_AUDIENCE

    @property
    def algorithms(self) -> list[str]:
        return settings.AUTH0_ALGORITHMS

    @property
    def issuer(self) -> str:
        return f"https://{settings.AUTH0_DOMAIN}/"

    @property
    def jwks_uri(self) -> str:
        return f"https://{settings.AUTH0_DOMAIN}/.well-known/jwks.json"

    @property
    def custom_claim_namespace(self) -> str:
        """Namespace Auth0 Action prefixes optional custom claims with.

        Keep this in sync with the Auth0 post-login Action so a
        ``department`` claim lands on our local profile.
        """
        return f"{settings.APP_BASE_URL.rstrip('/')}/"


auth0_settings = Auth0Settings()
