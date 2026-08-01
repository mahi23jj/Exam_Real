from typing import List, Optional
from openai import AsyncOpenAI
from tenacity import retry, wait_exponential, stop_after_attempt

from app.ai.embeddings.base import BaseEmbeddingProvider
from app.core.config import settings


class OpenAIEmbeddingProvider(BaseEmbeddingProvider):
    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None, batch_size: int = 100):
        super().__init__(batch_size=batch_size)
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model_name = model_name or settings.OPENAI_EMBEDDING_MODEL
        self.client = AsyncOpenAI(api_key=self.api_key or "dummy-key", base_url=settings.OPENAI_BASE_URL)

    @retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
    async def embed_text(self, text: str) -> List[float]:
        clean_text = text.replace("\n", " ").strip()
        if not clean_text:
            return [0.0] * 1536

        response = await self.client.embeddings.create(
            input=[clean_text],
            model=self.model_name
        )
        return response.data[0].embedding

    @retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
    async def _embed_batch_chunk(self, texts: List[str]) -> List[List[float]]:
        cleaned = [t.replace("\n", " ").strip() or " " for t in texts]
        if not cleaned:
            return []

        response = await self.client.embeddings.create(
            input=cleaned,
            model=self.model_name
        )
        return [item.embedding for item in response.data]
