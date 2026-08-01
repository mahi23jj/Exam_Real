from abc import ABC, abstractmethod
from typing import List


class BaseEmbeddingProvider(ABC):
    def __init__(self, batch_size: int = 100):
        self.batch_size = batch_size

    @abstractmethod
    async def embed_text(self, text: str) -> List[float]:
        """Generates embedding vector for a single text chunk."""
        pass

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generates embedding vectors for a list of text chunks, automatically batching them."""
        all_embeddings = []
        for i in range(0, len(texts), self.batch_size):
            batch = texts[i:i + self.batch_size]
            batch_embeddings = await self._embed_batch_chunk(batch)
            all_embeddings.extend(batch_embeddings)
        return all_embeddings

    @abstractmethod
    async def _embed_batch_chunk(self, texts: List[str]) -> List[List[float]]:
        """Generates embedding vectors for a single limited batch of text chunks."""
        pass
