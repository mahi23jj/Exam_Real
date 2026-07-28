"""Redis-backed explanation caching service for AI-generated feedback."""
import hashlib
import json
import logging
from typing import Optional

import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)

# Cache TTL: 7 days. Explanations for a given question+answer combination
# are stable — the correct answer and notes don't change per document version.
_CACHE_TTL_SECONDS = 60 * 60 * 24 * 7


class ExplanationCacheService:
    """
    Caches AI-generated explanations in Redis to avoid redundant LLM calls.

    Cache key is a deterministic hash of:
        (question_id, selected_choice_id, document_version)

    This ensures cached explanations are invalidated when a new document
    version is uploaded for the same course, producing potentially different
    note context.
    """

    def __init__(self):
        self._client: Optional[aioredis.Redis] = None

    def _get_client(self) -> aioredis.Redis:
        if self._client is None:
            self._client = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
        return self._client

    def _build_key(
        self,
        question_id: str,
        selected_choice_id: str,
        doc_version: int
    ) -> str:
        """Builds a deterministic, hashed Redis cache key."""
        raw = f"explanation:{question_id}:{selected_choice_id}:v{doc_version}"
        return "studyloop:" + hashlib.sha256(raw.encode()).hexdigest()

    async def get(
        self,
        question_id: str,
        selected_choice_id: str,
        doc_version: int
    ) -> Optional[str]:
        """Returns the cached explanation string, or None if not cached."""
        try:
            key = self._build_key(question_id, selected_choice_id, doc_version)
            client = self._get_client()
            value = await client.get(key)
            if value:
                logger.debug(f"Cache HIT for key {key[:20]}...")
            return value
        except Exception as e:
            logger.warning(f"Cache GET failed (non-fatal): {e}")
            return None

    async def set(
        self,
        question_id: str,
        selected_choice_id: str,
        doc_version: int,
        explanation: str
    ) -> None:
        """Stores an explanation in the cache with the configured TTL."""
        try:
            key = self._build_key(question_id, selected_choice_id, doc_version)
            client = self._get_client()
            await client.set(key, explanation, ex=_CACHE_TTL_SECONDS)
            logger.debug(f"Cache SET for key {key[:20]}...")
        except Exception as e:
            logger.warning(f"Cache SET failed (non-fatal): {e}")

    async def invalidate_for_question(self, question_id: str) -> None:
        """
        Invalidates all cached explanations for a given question.
        Called when a document is re-processed or a new version is uploaded.
        Note: This scans by pattern — use only during admin/ingestion flows,
        not in the hot request path.
        """
        try:
            client = self._get_client()
            pattern = f"studyloop:*"
            # Redis SCAN is safe for production unlike KEYS
            async for key in client.scan_iter(match=pattern, count=100):
                await client.delete(key)
        except Exception as e:
            logger.warning(f"Cache invalidation failed (non-fatal): {e}")
