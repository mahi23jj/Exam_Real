"""BGE-M3 embedding provider using FlagEmbedding for dense local embeddings."""
import logging
from typing import List, Optional

from app.ai.embeddings.base import BaseEmbeddingProvider

logger = logging.getLogger(__name__)

# Singleton to avoid reloading the model between requests
_bge_model = None


def _load_bge_model():
    """Lazily loads the BGE-M3 model on first use."""
    global _bge_model
    if _bge_model is None:
        try:
            from FlagEmbedding import BGEM3FlagModel
            logger.info("Loading BGE-M3 embedding model (first use)...")
            _bge_model = BGEM3FlagModel(
                "BAAI/bge-m3",
                use_fp16=True  # Use fp16 for lower memory footprint
            )
            logger.info("BGE-M3 model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load BGE-M3 model: {e}")
            raise RuntimeError(f"BGE-M3 model could not be loaded: {e}") from e
    return _bge_model


class BGEM3EmbeddingProvider(BaseEmbeddingProvider):
    """
    Local embedding provider using BAAI/bge-m3 via FlagEmbedding.

    Produces 1024-dimensional dense vectors. No API cost.
    Runs in a thread pool to avoid blocking the async event loop.
    """

    EMBEDDING_DIM: int = 1024

    def __init__(self, batch_size: int = 32):
        # BGE-M3 is a larger model — smaller default batch size than OpenAI
        super().__init__(batch_size=batch_size)

    async def embed_text(self, text: str) -> List[float]:
        import asyncio
        clean = text.replace("\n", " ").strip()
        if not clean:
            return [0.0] * self.EMBEDDING_DIM
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._encode_single, clean)

    def _encode_single(self, text: str) -> List[float]:
        model = _load_bge_model()
        result = model.encode([text], batch_size=1, max_length=8192)
        return result["dense_vecs"][0].tolist()

    async def _embed_batch_chunk(self, texts: List[str]) -> List[List[float]]:
        """Encodes a single bounded batch in a thread pool executor."""
        import asyncio
        cleaned = [t.replace("\n", " ").strip() or " " for t in texts]
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._encode_batch, cleaned)

    def _encode_batch(self, texts: List[str]) -> List[List[float]]:
        model = _load_bge_model()
        result = model.encode(texts, batch_size=len(texts), max_length=8192)
        return [vec.tolist() for vec in result["dense_vecs"]]
