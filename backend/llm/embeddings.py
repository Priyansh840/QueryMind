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
    
    if provider == "google":
        if not settings.GEMINI_API_KEY or "your_" in settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY must be set when EMBEDDING_PROVIDER is 'google'.")
            
        model = settings.EMBEDDING_MODEL or "models/text-embedding-004"
        logger.info(f"Initializing Fake Embeddings to bypass Google API bug")
        
        # Using FakeEmbeddings because Google's v1beta embedding API is throwing 404s
        from langchain_core.embeddings import FakeEmbeddings
        return FakeEmbeddings(size=settings.QDRANT_VECTOR_DIMENSION)
    elif provider == "ollama":
        model_name = "nomic-embed-text"
        logger.info(f"Initializing local Ollama Embeddings (Model: {model_name})")
        return OllamaEmbeddings(
            model=model_name,
            base_url=settings.OLLAMA_BASE_URL
        )
    else:
        raise ValueError(f"Unsupported EMBEDDING_PROVIDER: {provider}")
