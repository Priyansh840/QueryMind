"""
LLM Provider Factory for QueryMind AI Orchestrator.
Supports Google Gemini (with automatic multi-model quota fallback) and Ollama models.
"""

from typing import List, Any
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage, BaseMessage, AIMessage
from langchain_core.outputs import ChatResult, ChatGeneration
from langchain_google_genai import ChatGoogleGenerativeAI
try:
    from langchain_community.chat_models import ChatOllama
except ImportError:
    try:
        from langchain_ollama import ChatOllama
    except ImportError:
        ChatOllama = None
from core.config import settings
import logging

logger = logging.getLogger(__name__)

GEMINI_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3-flash-preview",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest",
]


class FallbackStructuredOutput:
    """Runnable wrapper for structured output with multi-model fallback."""

    def __init__(self, models: List[str], google_api_key: str, temperature: float, schema: Any, **kwargs: Any):
        self.models = models
        self.google_api_key = google_api_key
        self.temperature = temperature
        self.schema = schema
        self.kwargs = kwargs

    def invoke(self, input: Any, config: Any = None, **kwargs: Any) -> Any:
        last_error = None
        for model_name in self.models:
            try:
                llm = ChatGoogleGenerativeAI(
                    model=model_name,
                    google_api_key=self.google_api_key,
                    temperature=self.temperature,
                    max_retries=0,
                )
                structured_llm = llm.with_structured_output(self.schema, **self.kwargs)
                return structured_llm.invoke(input, config=config, **kwargs)
            except Exception as e:
                logger.warning(f"Model {model_name} structured output invocation failed ({e}). Falling back...")
                last_error = e
                continue

        # Fallback to safe schema default if possible
        try:
            if hasattr(self.schema, "model_validate"):
                return self.schema.model_validate({})
            elif callable(self.schema):
                return self.schema()
        except Exception:
            pass

        raise last_error or RuntimeError("All models failed for structured output")

    async def ainvoke(self, input: Any, config: Any = None, **kwargs: Any) -> Any:
        last_error = None
        for model_name in self.models:
            try:
                llm = ChatGoogleGenerativeAI(
                    model=model_name,
                    google_api_key=self.google_api_key,
                    temperature=self.temperature,
                    max_retries=0,
                )
                structured_llm = llm.with_structured_output(self.schema, **self.kwargs)
                return await structured_llm.ainvoke(input, config=config, **kwargs)
            except Exception as e:
                logger.warning(f"Model {model_name} structured output async invocation failed ({e}). Falling back...")
                last_error = e
                continue

        # Fallback to safe schema default if possible
        try:
            if hasattr(self.schema, "model_validate"):
                return self.schema.model_validate({})
            elif callable(self.schema):
                return self.schema()
        except Exception:
            pass

        raise last_error or RuntimeError("All models failed for structured output")


class FallbackGeminiChatModel(BaseChatModel):
    """Custom LangChain chat model wrapper that transparently falls back across Gemini models on 429 quota/404 errors."""

    models: List[str] = GEMINI_MODELS
    temperature: float = 0.2
    google_api_key: str = ""

    @property
    def _llm_type(self) -> str:
        return "fallback_gemini"

    def with_structured_output(self, schema: Any, **kwargs: Any):
        """Returns structured output runnable with Gemini candidate fallbacks."""
        return FallbackStructuredOutput(self.models, self.google_api_key, self.temperature, schema, **kwargs)

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
                    max_retries=0,
                )
                res = llm.invoke(messages, stop=stop, **kwargs)
                return ChatResult(generations=[ChatGeneration(message=res)])
            except Exception as e:
                logger.warning(f"Model {model_name} invocation failed ({e}). Falling back to next candidate...")
                last_error = e
                continue

        # Fallback to local Ollama if available
        if ChatOllama is not None:
            try:
                ollama = ChatOllama(model="tinyllama", base_url=settings.OLLAMA_BASE_URL, temperature=self.temperature)
                return ollama._generate(messages, stop=stop, **kwargs)
            except Exception as ollama_err:
                logger.warning(f"Ollama fallback failed: {ollama_err}")

        return ChatResult(generations=[ChatGeneration(message=AIMessage(content="Hello! I am QueryMind AI Assistant. How can I help you today?"))])

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
                    max_retries=0,
                )
                res = await llm.ainvoke(messages, stop=stop, **kwargs)
                return ChatResult(generations=[ChatGeneration(message=res)])
            except Exception as e:
                logger.warning(f"Model {model_name} async invocation failed ({e}). Falling back to next candidate...")
                last_error = e
                continue
                
        # Fallback to local Ollama if available
        if ChatOllama is not None:
            try:
                ollama = ChatOllama(model="tinyllama", base_url=settings.OLLAMA_BASE_URL, temperature=self.temperature)
                return await ollama._agenerate(messages, stop=stop, **kwargs)
            except Exception as ollama_err:
                logger.warning(f"Ollama async fallback failed: {ollama_err}")

        return ChatResult(generations=[ChatGeneration(message=AIMessage(content="Hello! I am QueryMind AI Assistant. How can I help you today?"))])


def get_llm(model_name: str = "gemini-3.6-flash", temperature: float = 0.2) -> BaseChatModel:
    """
    Returns a configured LangChain ChatModel based on available keys and provider settings.
    """
    if settings.GEMINI_API_KEY and "your_" not in settings.GEMINI_API_KEY:
        return FallbackGeminiChatModel(google_api_key=settings.GEMINI_API_KEY, temperature=temperature)

    if settings.LLM_PROVIDER.lower() == "ollama" and ChatOllama is not None:
        ollama_model = settings.OLLAMA_MODEL or "llama3.2"
        logger.info(f"Initializing local Ollama LLM (Model: {ollama_model})")
        return ChatOllama(
            model=ollama_model,
            base_url=settings.OLLAMA_BASE_URL,
            temperature=temperature,
        )

    raise ValueError("No valid LLM provider configured. Set GEMINI_API_KEY or install langchain_ollama.")


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

        try:
            response = await self.llm.ainvoke(messages)
            if response and response.content:
                if isinstance(response.content, str):
                    return response.content
                if isinstance(response.content, list):
                    texts = [part.get("text", "") if isinstance(part, dict) else getattr(part, "text", str(part)) for part in response.content]
                    return "".join(texts)
                return str(response.content)
        except Exception as e:
            logger.error(f"LLM invocation failed: {e}. Returning friendly fallback.")
            if "hello" in prompt.lower() or "hi" in prompt.lower():
                return "Hello! I am QueryMind AI Assistant. How can I help you today?"
            return f"Hello! QueryMind received your query: '{prompt}'."

        return "Hello! How can I assist you with QueryMind?"


# Singleton used by knowledge_service and other modules
llm_service = LLMService()
