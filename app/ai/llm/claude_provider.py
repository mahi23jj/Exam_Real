import json
from typing import Optional, Type
from anthropic import AsyncAnthropic
from pydantic import BaseModel
from tenacity import retry, wait_exponential, stop_after_attempt

from app.ai.llm.base import BaseLLMProvider, T
from app.core.config import settings


class ClaudeProvider(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None, model_name: str = "claude-3-5-sonnet-20241022"):
        self.api_key = api_key or settings.CLAUDE_API_KEY
        self.model_name = model_name
        self.client = AsyncAnthropic(api_key=self.api_key or "dummy-key")

    @retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
    async def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1500
    ) -> str:
        kwargs = {
            "model": self.model_name,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": [{"role": "user", "content": prompt}]
        }
        if system_prompt:
            kwargs["system"] = system_prompt

        response = await self.client.messages.create(**kwargs)
        return response.content[0].text if response.content else ""

    @retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
    async def generate_structured(
        self,
        prompt: str,
        response_schema: Type[T],
        system_prompt: Optional[str] = None,
        temperature: float = 0.2
    ) -> T:
        schema_json = json.dumps(response_schema.model_json_schema(), indent=2)
        sys_msg = (system_prompt or "") + f"\n\nRespond ONLY with valid JSON conforming to this schema:\n{schema_json}"

        response = await self.client.messages.create(
            model=self.model_name,
            max_tokens=2000,
            temperature=temperature,
            system=sys_msg,
            messages=[{"role": "user", "content": prompt}]
        )
        raw_text = response.content[0].text if response.content else "{}"
        return response_schema.model_validate_json(raw_text)
