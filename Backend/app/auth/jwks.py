"""JWKS client to fetch and cache public keys from Auth0.
"""

import httpx
from jose import jwt
from typing import Dict, Any

from app.auth.config import auth0_settings
from app.auth.exceptions import InvalidTokenException


class JWKSClient:
    def __init__(self):
        self.jwks: Dict[str, Any] = {}

    async def get_jwks(self) -> Dict[str, Any]:
        if not self.jwks:
            await self._fetch_jwks()
        return self.jwks
    
    async def _fetch_jwks(self):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(auth0_settings.jwks_uri)
                response.raise_for_status()
                self.jwks = response.json()
        except httpx.HTTPError:
            raise InvalidTokenException("Unable to fetch JWKS from Auth0")

    async def get_signing_key(self, token: str) -> dict:
        try:
            unverified_header = jwt.get_unverified_header(token)
        except jwt.JWTError:
            raise InvalidTokenException("Invalid token header")
        
        jwks = await self.get_jwks()
        
        rsa_key = {}
        for key in jwks.get("keys", []):
            if key["kid"] == unverified_header.get("kid"):
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"]
                }
                break
                
        if not rsa_key:
            # Force refresh jwks if kid not found (key rotation)
            await self._fetch_jwks()
            jwks = await self.get_jwks()
            for key in jwks.get("keys", []):
                if key["kid"] == unverified_header.get("kid"):
                    rsa_key = {
                        "kty": key["kty"],
                        "kid": key["kid"],
                        "use": key["use"],
                        "n": key["n"],
                        "e": key["e"]
                    }
                    break
                    
        if not rsa_key:
            raise InvalidTokenException("Unable to find appropriate key")
            
        return rsa_key

jwks_client = JWKSClient()
