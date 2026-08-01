import json
from typing import Optional, Type
import google.generativeai as genai
from pydantic import BaseModel
from tenacity import retry, wait_exponential, stop_after_attempt

from app.ai.llm.base import BaseLLMProvider, T
from app.core.config import settings


class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-2.5-flash-lite"):
        self.api_key = api_key or settings.GEMINI_API_KEY
        if self.api_key:
            genai.configure(api_key=self.api_key)
        self.model_name = model_name

    @retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
    async def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1500
    ) -> str:
        model = genai.GenerativeModel(
            model_name=self.model_name,
            system_instruction=system_prompt
        )
        response = await model.generate_content_async(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens
            )
        )
        return response.text or ""

    @retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
    async def generate_structured(
        self,
        prompt: str,
        response_schema: Type[T],
        system_prompt: Optional[str] = None,
        temperature: float = 0.2
    ) -> T:
        schema_json = json.dumps(response_schema.model_json_schema(), indent=2)
        sys_msg = (system_prompt or "") + f"\n\nRespond ONLY with a valid JSON object matching this schema:\n{schema_json}"

        model = genai.GenerativeModel(
            model_name=self.model_name,
            system_instruction=sys_msg
        )
        response = await model.generate_content_async(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=temperature,
                response_mime_type="application/json"
            )
        )
        return response_schema.model_validate_json(response.text or "{}")
