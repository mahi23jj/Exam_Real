import json
from typing import Optional, Type

from groq import AsyncGroq
from pydantic import BaseModel
from tenacity import retry, wait_exponential, stop_after_attempt

from app.ai.llm.base import BaseLLMProvider, T
from app.core.config import settings


class GroqProvider(BaseLLMProvider):
    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
    ):
        self.api_key = api_key or settings.GROQ_API_KEY
        self.model_name = model_name or settings.GROQ_MODEL
        self.client = AsyncGroq(api_key=self.api_key)

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3),
    )
    async def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1500,
    ) -> str:

        messages = []

        if system_prompt:
            messages.append(
                {
                    "role": "system",
                    "content": system_prompt,
                }
            )

        messages.append(
            {
                "role": "user",
                "content": prompt,
            }
        )

        response = await self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=temperature,
            max_completion_tokens=max_tokens,
        )

        return response.choices[0].message.content or ""

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3),
    )
    async def generate_structured(
        self,
        prompt: str,
        response_schema: Type[T],
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
    ) -> T:

        schema_json = json.dumps(
            response_schema.model_json_schema(),
            indent=2,
        )

        system = (system_prompt or "") + f"""

                Respond ONLY with valid JSON.

                The JSON MUST exactly match this schema:

                {schema_json}

                Do not wrap the JSON in markdown.
                Do not include explanations.
                """

        response = await self.client.chat.completions.create(
            model=self.model_name,
            messages=[
                {
                    "role": "system",
                    "content": system,
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            temperature=temperature,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content or "{}"

        return response_schema.model_validate_json(content)
