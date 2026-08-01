"""Hybrid retriever combining pgvector semantic search and PostgreSQL Full Text Search."""
import uuid
import logging
from typing import List, Tuple
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.db.models.content_block import ContentBlock, Embedding
from app.db.models.document import Document
from app.ai.retrieval.reranker import BGERerankerProvider

logger = logging.getLogger(__name__)


class HybridRetriever:
    """
    Executes parallel semantic (pgvector cosine) and lexical (PostgreSQL FTS)
    searches, deduplicates, then re-ranks via BGE reranker.

    This replaces the previous VectorStoreRetriever in the answer submission flow.
    VectorStoreRetriever is still used for QuestionContentBlockLink linking during
    ingestion (analytics / traceability use case).
    """

    def __init__(self, session: AsyncSession, reranker: BGERerankerProvider | None = None):
        self.session = session
        self.reranker = reranker or BGERerankerProvider()

    async def search(
        self,
        query_text: str,
        query_vector: List[float],
        course_id: uuid.UUID,
        semantic_top_k: int = 20,
        fts_top_k: int = 20,
        rerank_top_k: int = 5,
    ) -> List[Tuple[ContentBlock, float]]:
        """
        Performs hybrid retrieval and returns top-k reranked ContentBlocks with scores.

        Args:
            query_text:    Raw question text for FTS and reranking.
            query_vector:  Dense embedding of query_text for pgvector search.
            course_id:     Filter results to a specific course.
            semantic_top_k: Number of candidates from vector search.
            fts_top_k:      Number of candidates from full text search.
            rerank_top_k:   Final number of results after reranking.
        """
        semantic_results = await self._semantic_search(query_vector, course_id, semantic_top_k)
        fts_results = await self._fts_search(query_text, course_id, fts_top_k)

        # Deduplicate by block id, preserving order (semantic first, then FTS)
        seen_ids: set = set()
        merged: List[ContentBlock] = []
        for block in semantic_results + fts_results:
            if block.id not in seen_ids:
                seen_ids.add(block.id)
                merged.append(block)

        if not merged:
            return []

        # Prepare (block, text) pairs for reranker
        candidates = [(block, block.content) for block in merged]

        try:
            reranked = await self.reranker.rerank(
                query=query_text,
                candidates=candidates,
                top_k=rerank_top_k
            )
            return reranked
        except Exception as e:
            logger.warning(f"Reranker failed, falling back to semantic results: {e}")
            # Graceful degradation: return top semantic results with placeholder score
            return [(block, 0.5) for block in merged[:rerank_top_k]]

    async def _semantic_search(
        self,
        query_vector: List[float],
        course_id: uuid.UUID,
        top_k: int
    ) -> List[ContentBlock]:
        """Cosine similarity search via pgvector."""
        stmt = (
            select(ContentBlock)
            .join(Embedding, Embedding.content_block_id == ContentBlock.id)
            .join(Document, Document.id == ContentBlock.document_id)
            .where(
                Document.course_id == course_id,
                Document.is_active == True
            )
            .order_by(Embedding.vector.cosine_distance(query_vector))
            .limit(top_k)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def _fts_search(
        self,
        query_text: str,
        course_id: uuid.UUID,
        top_k: int
    ) -> List[ContentBlock]:
        """
        PostgreSQL Full Text Search using the pre-built tsvector GIN index.
        Uses plainto_tsquery for safe, unsanitized user input handling.
        """
        raw_sql = text(
            """
            SELECT cb.*
            FROM content_blocks cb
            JOIN documents d ON d.id = cb.document_id
            WHERE d.course_id = :course_id
              AND d.is_active = true
              AND cb.content_tsv @@ plainto_tsquery('english', :query)
            ORDER BY ts_rank(cb.content_tsv, plainto_tsquery('english', :query)) DESC
            LIMIT :top_k
            """
        )
        result = await self.session.execute(
            raw_sql,
            {"course_id": str(course_id), "query": query_text, "top_k": top_k}
        )
        rows = result.fetchall()
        block_ids = [row[0] for row in rows]  # cb.id is first column

        if not block_ids:
            return []

        blocks_stmt = select(ContentBlock).where(ContentBlock.id.in_(block_ids))
        blocks_result = await self.session.execute(blocks_stmt)
        blocks = {b.id: b for b in blocks_result.scalars().all()}
        # Preserve the FTS rank order
        return [blocks[bid] for bid in block_ids if bid in blocks]
