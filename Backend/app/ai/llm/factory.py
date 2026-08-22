from app.ai.llm.base import BaseLLMProvider
from app.ai.llm.openai_provider import OpenAIProvider
from app.ai.llm.gemini_provider import GeminiProvider
from app.ai.llm.claude_provider import ClaudeProvider
from app.ai.llm.openrouter_provider import OpenRouterProvider
from app.core.config import settings
from app.ai.llm.groq_provider import GroqProvider


def get_llm_provider(provider_name: str | None = None) -> BaseLLMProvider:
    """Factory function returning the configured LLM provider instance."""
    provider = (provider_name or settings.DEFAULT_LLM_PROVIDER).lower().strip()

    if provider == "openai":
        return OpenAIProvider()
    elif provider == "gemini":
        return GeminiProvider()
    elif provider == "claude":
        return ClaudeProvider()
    elif provider == "openrouter":
        return OpenRouterProvider()
    elif provider == "groq":
        return GroqProvider()
    else:
        # Fallback to OpenAI
        return GroqProvider()
