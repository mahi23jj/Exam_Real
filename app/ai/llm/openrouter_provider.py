"""OpenRouter LLM provider — drop-in replacement for OpenAI-compatible API."""
import json
from typing import Optional, Type
from openai import AsyncOpenAI
from pydantic import BaseModel
from tenacity import retry, wait_exponential, stop_after_attempt

from app.ai.llm.base import BaseLLMProvider, T
from app.core.config import settings


class OpenRouterProvider(BaseLLMProvider):
    """
    LLM provider that calls OpenRouter's OpenAI-compatible API.
    Supports any model available on OpenRouter (e.g. mistral, llama, mixtral).
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None
    ):
        self.api_key = api_key or settings.OPENROUTER_API_KEY
        self.model_name = model_name or settings.OPENROUTER_MODEL
        self.client = AsyncOpenAI(
            api_key=self.api_key or "dummy-key",
            base_url="https://openrouter.ai/api/v1"
        )

    @retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
    async def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1500
    ) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = await self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        return response.choices[0].message.content or ""

    @retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
    async def generate_structured(
        self,
        prompt: str,
        response_schema: Type[T],
        system_prompt: Optional[str] = None,
        temperature: float = 0.2
    ) -> T:
        schema_json = json.dumps(response_schema.model_json_schema(), indent=2)
        sys_msg = (system_prompt or "") + (
            f"\n\nYou MUST respond strictly in valid JSON matching this schema:\n{schema_json}"
        )
        messages = [
            {"role": "system", "content": sys_msg},
            {"role": "user", "content": prompt}
        ]
        response = await self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=temperature,
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content or "{}"
        return response_schema.model_validate_json(content)
