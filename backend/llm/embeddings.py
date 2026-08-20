"""
Embeddings Factory for MYND AI Orchestrator.
Supports Google Generative AI Embeddings.
"""

from langchain_core.embeddings import Embeddings
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.embeddings import OllamaEmbeddings
from core.config import settings
import logging

logger = logging.getLogger(__name__)

def get_embeddings() -> Embeddings:
    """
    Returns a configured LangChain Embeddings model.
    """
    provider = settings.EMBEDDING_PROVIDER.lower()
    model = settings.EMBEDDING_MODEL
    
    if provider == "google":
        if not settings.GEMINI_API_KEY or "your_" in settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY must be set when EMBEDDING_PROVIDER is 'google'.")
        logger.info(f"Initializing Google Embeddings (Model: {model})")
        return GoogleGenerativeAIEmbeddings(model=model)
        
    elif provider == "ollama":
        logger.info(f"Initializing local Ollama Embeddings (Model: {model})")
        return OllamaEmbeddings(
            model=model,
            base_url=settings.OLLAMA_BASE_URL
        )
    else:
        raise ValueError(f"Unsupported EMBEDDING_PROVIDER: {provider}")
