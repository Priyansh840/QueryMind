"""
QueryMind - Embedding Service
Generates vector embeddings using BAAI/bge-small-en-v1.5 (local, free).
"""

try:
    from sentence_transformers import SentenceTransformer
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False
    print("Warning: sentence_transformers not installed. Using fallback dummy EmbeddingService.")

from typing import List
import numpy as np


class EmbeddingService:
    """
    Generates 384-dimensional dense vector embeddings using BGE-Small.
    Runs locally — no API key or internet required.
    """

    MODEL_NAME = "BAAI/bge-small-en-v1.5"
    EMBEDDING_DIM = 384

    def __init__(self):
        print(f"Loading embedding model: {self.MODEL_NAME}...")
        if HAS_SENTENCE_TRANSFORMERS:
            try:
                self.model = SentenceTransformer(self.MODEL_NAME)
                print(f"Embedding model loaded! Dimension: {self.EMBEDDING_DIM}")
            except Exception as e:
                print(f"Failed to load sentence_transformers model: {e}. Using fallback.")
                self.model = None
        else:
            self.model = None
            print("Running in fallback mode (dummy embeddings).")

    def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single text string.

        Args:
            text: Input text to embed

        Returns:
            List of floats (384 dimensions)
        """
        if self.model:
            embedding = self.model.encode(text, normalize_embeddings=True)
            return embedding.tolist()
        return [0.01] * self.EMBEDDING_DIM

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts (batch processing).

        Args:
            texts: List of input texts

        Returns:
            List of embedding vectors
        """
        if self.model:
            embeddings = self.model.encode(texts, normalize_embeddings=True)
            return embeddings.tolist()
        return [[0.01] * self.EMBEDDING_DIM for _ in texts]

    def embed_query(self, query: str) -> List[float]:
        """
        Generate embedding for a search query.
        Adds the BGE instruction prefix for better retrieval.

        Args:
            query: Search query text

        Returns:
            List of floats (384 dimensions)
        """
        if self.model:
            instruction = "Represent this sentence for searching relevant passages: "
            embedding = self.model.encode(
                instruction + query, normalize_embeddings=True
            )
            return embedding.tolist()
        return [0.01] * self.EMBEDDING_DIM

    @staticmethod
    def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        """
        Calculate cosine similarity between two vectors.

        Args:
            vec_a: First vector
            vec_b: Second vector

        Returns:
            Similarity score between -1 and 1
        """
        a = np.array(vec_a)
        b = np.array(vec_b)
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


# Singleton instance
embedding_service = EmbeddingService()

