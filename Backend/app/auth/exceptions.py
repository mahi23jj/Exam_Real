"""Auth0-specific exceptions.

These exceptions are raised by the auth module when token validation
fails or when a user cannot be processed correctly.
"""

from fastapi import HTTPException, status
from app.core.exceptions import DomainException


class MissingAuthorizationHeaderException(DomainException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header is expected"
        )


class InvalidTokenException(DomainException):
    def __init__(self, detail: str = "Invalid token"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail
        )


class ExpiredTokenException(DomainException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )


class LocalUserNotFoundException(DomainException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User associated with this token was not found locally"
        )


class ForbiddenException(DomainException):
    def __init__(self, detail: str = "Not enough permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )
