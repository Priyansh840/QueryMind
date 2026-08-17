"""
LLM Provider Factory for QueryMind AI Orchestrator.
Supports Google Gemini (with automatic multi-model quota fallback) and Ollama models.
"""

from typing import List, Any
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage, BaseMessage
from langchain_core.outputs import ChatResult, ChatGeneration
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.chat_models import ChatOllama
from core.config import settings
import logging

logger = logging.getLogger(__name__)

GEMINI_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-3-flash-preview",
]


class FallbackGeminiChatModel(BaseChatModel):
    """Custom LangChain chat model wrapper that transparently falls back across Gemini models on 429 quota errors."""

    models: List[str] = GEMINI_MODELS
    temperature: float = 0.2
    google_api_key: str = ""

    @property
    def _llm_type(self) -> str:
        return "fallback_gemini"

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: List[str] | None = None,
        **kwargs: Any,
    ) -> ChatResult:
        last_error = None
        for model_name in self.models:
            try:
                llm = ChatGoogleGenerativeAI(
                    model=model_name,
                    google_api_key=self.google_api_key,
                    temperature=self.temperature,
                    convert_system_message_to_human=True,
                )
                return llm._generate(messages, stop=stop, **kwargs)
            except Exception as e:
                logger.warning(f"Model {model_name} invocation failed ({e}). Falling back to next candidate...")
                last_error = e
                continue
        raise last_error or RuntimeError("All Gemini models failed.")

    async def _agenerate(
        self,
        messages: List[BaseMessage],
        stop: List[str] | None = None,
        **kwargs: Any,
    ) -> ChatResult:
        last_error = None
        for model_name in self.models:
            try:
                llm = ChatGoogleGenerativeAI(
                    model=model_name,
                    google_api_key=self.google_api_key,
                    temperature=self.temperature,
                    convert_system_message_to_human=True,
                )
                return await llm._agenerate(messages, stop=stop, **kwargs)
            except Exception as e:
                logger.warning(f"Model {model_name} async invocation failed ({e}). Falling back to next candidate...")
                last_error = e
                continue
        raise last_error or RuntimeError("All Gemini models failed.")


def get_llm(model_name: str = "gemini-3.5-flash-lite", temperature: float = 0.2) -> BaseChatModel:
    """
    Returns a configured LangChain ChatModel based on the LLM_PROVIDER setting.
    """
    provider = settings.LLM_PROVIDER.lower()

    if provider == "gemini":
        if not settings.GEMINI_API_KEY or "your_" in settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY must be set when LLM_PROVIDER is 'gemini'.")

        # Ordered with the requested model first, followed by remaining fallbacks
        ordered_models = [model_name] + [m for m in GEMINI_MODELS if m != model_name]
        return FallbackGeminiChatModel(
            models=ordered_models,
            temperature=temperature,
            google_api_key=settings.GEMINI_API_KEY,
        )

    elif provider == "ollama":
        ollama_model = settings.OLLAMA_MODEL or "llama3.2"
        logger.info(f"Initializing local Ollama LLM (Model: {ollama_model})")
        return ChatOllama(
            model=ollama_model,
            base_url=settings.OLLAMA_BASE_URL,
            temperature=temperature,
        )

    raise ValueError(f"Unknown LLM_PROVIDER: {provider}")


class LLMService:
    """Wrapper around LangChain ChatModel used by the RAG pipeline with automatic model fallback."""

    def __init__(self):
        self._llm: BaseChatModel | None = None

    @property
    def llm(self) -> BaseChatModel:
        if self._llm is None:
            self._llm = get_llm()
        return self._llm

    async def health_check(self) -> dict:
        """Check which LLM providers are available."""
        status = {}
        try:
            _ = self.llm
            status[settings.LLM_PROVIDER] = "available"
        except Exception as e:
            status[settings.LLM_PROVIDER] = f"error: {e}"
        return status

    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        provider: str | None = None,
    ) -> str:
        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=prompt))

        response = await self.llm.ainvoke(messages)
        return response.content if response else ""


# Singleton used by knowledge_service and other modules
llm_service = LLMService()
