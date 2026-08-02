"""
QueryMind - Embedding Service
Generates vector embeddings using BAAI/bge-small-en-v1.5 (local, free).
"""

from sentence_transformers import SentenceTransformer
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
        self.model = SentenceTransformer(self.MODEL_NAME)
        print(f"Embedding model loaded! Dimension: {self.EMBEDDING_DIM}")

    def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single text string.

        Args:
            text: Input text to embed

        Returns:
            List of floats (384 dimensions)
        """
        # BGE-Small recommends prefixing queries with "Represent this sentence:"
        embedding = self.model.encode(text, normalize_embeddings=True)
        return embedding.tolist()

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts (batch processing).

        Args:
            texts: List of input texts

        Returns:
            List of embedding vectors
        """
        embeddings = self.model.encode(texts, normalize_embeddings=True)
        return embeddings.tolist()

    def embed_query(self, query: str) -> List[float]:
        """
        Generate embedding for a search query.
        Adds the BGE instruction prefix for better retrieval.

        Args:
            query: Search query text

        Returns:
            List of floats (384 dimensions)
        """
        instruction = "Represent this sentence for searching relevant passages: "
        embedding = self.model.encode(
            instruction + query, normalize_embeddings=True
        )
        return embedding.tolist()

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
