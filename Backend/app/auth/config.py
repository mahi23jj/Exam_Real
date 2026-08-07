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


auth0_settings = Auth0Settings()
