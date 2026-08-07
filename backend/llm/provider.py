"""
LLM Provider Factory for MYND AI Orchestrator.
Supports Google Gemini and Ollama models.
"""

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.chat_models import ChatOllama
from core.config import settings
import logging

logger = logging.getLogger(__name__)

def get_llm(temperature: float = 0.2) -> BaseChatModel:
    """
    Returns a configured LangChain ChatModel based on the LLM_PROVIDER setting.
    """
    provider = settings.LLM_PROVIDER.lower()
    
    if provider == "gemini":
        if not settings.GEMINI_API_KEY or "your_" in settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY must be set when LLM_PROVIDER is 'gemini'.")
            
        logger.info(f"Initializing Gemini LLM")
        return ChatGoogleGenerativeAI(
            model="gemini-1.5-flash", # defaulting to fast model
            google_api_key=settings.GEMINI_API_KEY,
            temperature=temperature,
            convert_system_message_to_human=True
        )
        
    elif provider == "ollama":
        model_name = settings.OLLAMA_MODEL or "llama3.2"
        logger.info(f"Initializing local Ollama LLM (Model: {model_name})")
        return ChatOllama(
            model=model_name,
            base_url=settings.OLLAMA_BASE_URL,
            temperature=temperature
        )
