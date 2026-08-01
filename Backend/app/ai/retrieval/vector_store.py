import uuid
from typing import List, Tuple
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.content_block import ContentBlock, Embedding
from app.db.models.document import Document


class VectorStoreRetriever:
    """Handles pgvector vector operations, storing embeddings and retrieving top-K relevant ContentBlocks."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def search_similar_content_blocks(
        self,
        query_vector: List[float],
        course_id: uuid.UUID,
        top_k: int = 5
    ) -> List[Tuple[ContentBlock, float]]:
        """Performs cosine distance search in pgvector to retrieve top-K ContentBlocks within a course."""
        # Cosine distance operator in pgvector: Embedding.vector.cosine_distance(query_vector)
        statement = (
            select(ContentBlock, Embedding.vector.cosine_distance(query_vector).label("distance"))
            .join(Embedding, Embedding.content_block_id == ContentBlock.id)
            .join(Document, Document.id == ContentBlock.document_id)
            .where(Document.course_id == course_id, Document.is_active == True)
            .order_by("distance")
            .limit(top_k)
        )
        results = await self.session.execute(statement)
        items = []
        for block, distance in results.all():
            # Convert cosine distance to similarity score: similarity = 1 - distance
            similarity = max(0.0, 1.0 - float(distance))
            items.append((block, similarity))

        return items
