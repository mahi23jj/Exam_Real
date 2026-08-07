"""Legacy auth dependencies.

Re-exports dependencies from the new auth module.
"""

from app.auth.dependencies import get_current_user, get_current_user_optional

__all__ = ["get_current_user", "get_current_user_optional"]
