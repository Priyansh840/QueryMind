from typing import List
from langchain_core.embeddings import Embeddings
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.embeddings import OllamaEmbeddings
from core.config import settings
from ingestion.embeddings import embedding_service
import logging

logger = logging.getLogger(__name__)


class FallbackEmbeddings(Embeddings):
    """Fallback local embeddings model using BGE-small / dummy embeddings."""

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return embedding_service.embed_texts(texts)

    def embed_query(self, text: str) -> List[float]:
        return embedding_service.embed_query(text)

    async def aembed_documents(self, texts: List[str]) -> List[List[float]]:
        return self.embed_documents(texts)

    async def aembed_query(self, text: str) -> List[float]:
        return self.embed_query(text)


class SafeEmbeddings(Embeddings):
    """Wrapper that tries primary Embeddings provider and falls back to BGE/dummy embeddings on failure."""

    def __init__(self, primary: Embeddings):
        self.primary = primary
        self.fallback = FallbackEmbeddings()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        try:
            return self.primary.embed_documents(texts)
        except Exception as e:
            logger.warning(f"Primary embedding failed ({e}). Using FallbackEmbeddings.")
            return self.fallback.embed_documents(texts)

    def embed_query(self, text: str) -> List[float]:
        try:
            return self.primary.embed_query(text)
        except Exception as e:
            logger.warning(f"Primary query embedding failed ({e}). Using FallbackEmbeddings.")
            return self.fallback.embed_query(text)

    async def aembed_documents(self, texts: List[str]) -> List[List[float]]:
        try:
            return await self.primary.aembed_documents(texts)
        except Exception as e:
            logger.warning(f"Primary async embedding failed ({e}). Using FallbackEmbeddings.")
            return await self.fallback.aembed_documents(texts)

    async def aembed_query(self, text: str) -> List[float]:
        try:
            return await self.primary.aembed_query(text)
        except Exception as e:
            logger.warning(f"Primary async query embedding failed ({e}). Using FallbackEmbeddings.")
            return await self.fallback.aembed_query(text)


def get_embeddings() -> Embeddings:
    """
    Returns a configured LangChain Embeddings model with automatic fallback.
    """
    provider = settings.EMBEDDING_PROVIDER.lower()
    model = settings.EMBEDDING_MODEL
    
    if provider == "google" and settings.GEMINI_API_KEY and "your_" not in settings.GEMINI_API_KEY:
        try:
            logger.info(f"Initializing Google Embeddings (Model: {model})")
            return SafeEmbeddings(GoogleGenerativeAIEmbeddings(model=model, google_api_key=settings.GEMINI_API_KEY))
        except Exception as e:
            logger.warning(f"Failed to initialize Google Embeddings: {e}. Falling back to local BGE embeddings.")

    if provider == "ollama":
        try:
            logger.info(f"Initializing Ollama Embeddings (Model: {model}, URL: {settings.OLLAMA_BASE_URL})")
            try:
                from langchain_ollama import OllamaEmbeddings as LangOllamaEmbeddings
            except ImportError:
                from langchain_community.embeddings import OllamaEmbeddings as LangOllamaEmbeddings
            return SafeEmbeddings(LangOllamaEmbeddings(
                model=model,
                base_url=settings.OLLAMA_BASE_URL
            ))
        except Exception as e:
            logger.warning(f"Failed to initialize Ollama Embeddings: {e}.")

    logger.info("Using FallbackEmbeddings (BAAI/bge-small-en-v1.5) for vector embeddings.")
    return FallbackEmbeddings()
