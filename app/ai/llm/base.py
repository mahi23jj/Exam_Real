from abc import ABC, abstractmethod
from typing import Optional, Type, TypeVar, Any
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class BaseLLMProvider(ABC):
    """Abstract Base Class for LLM Providers.
    
    Backend business logic relies solely on this interface so providers
    (OpenAI, Gemini, Claude, etc.) can be swapped cleanly without changing business logic.
    """

    @abstractmethod
    async def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1500
    ) -> str:
        """Generates plain text response for given prompt."""
        pass

    @abstractmethod
    async def generate_structured(
        self,
        prompt: str,
        response_schema: Type[T],
        system_prompt: Optional[str] = None,
        temperature: float = 0.2
    ) -> T:
        """Generates structured JSON response validated against Pydantic schema."""
        pass
