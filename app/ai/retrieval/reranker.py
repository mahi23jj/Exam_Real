"""BGE Reranker provider using BAAI/bge-reranker-base."""
import logging
from typing import List, Tuple

logger = logging.getLogger(__name__)

_reranker_model = None


def _load_reranker():
    """Lazily loads the BGE reranker model on first use."""
    global _reranker_model
    if _reranker_model is None:
        try:
            from FlagEmbedding import FlagReranker
            logger.info("Loading BGE reranker model (first use)...")
            _reranker_model = FlagReranker("BAAI/bge-reranker-base", use_fp16=True)
            logger.info("BGE reranker model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load BGE reranker: {e}")
            raise RuntimeError(f"BGE reranker could not be loaded: {e}") from e
    return _reranker_model


class BGERerankerProvider:
    """
    Re-ranks a list of (content_block, text) pairs against a query using
    BAAI/bge-reranker-base.

    Returns pairs sorted by descending reranker score.
    Runs in a thread pool to avoid blocking the async event loop.
    """

    async def rerank(
        self,
        query: str,
        candidates: List[Tuple[any, str]],  # (content_block, text)
        top_k: int = 5
    ) -> List[Tuple[any, float]]:
        """
        Args:
            query:      The student's question text.
            candidates: List of (ContentBlock, block_text) tuples to re-rank.
            top_k:      Number of top results to return.

        Returns:
            List of (ContentBlock, reranker_score) sorted descending.
        """
        if not candidates:
            return []

        import asyncio
        loop = asyncio.get_event_loop()
        pairs = [(query, text) for _, text in candidates]
        scores: List[float] = await loop.run_in_executor(None, self._score, pairs)

        scored = sorted(
            zip([block for block, _ in candidates], scores),
            key=lambda x: x[1],
            reverse=True
        )
        return scored[:top_k]

    def _score(self, pairs: List[Tuple[str, str]]) -> List[float]:
        reranker = _load_reranker()
        return reranker.compute_score(pairs, normalize=True)
