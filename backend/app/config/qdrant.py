"""
QueryMind - Qdrant Vector Database Configuration
"""

from qdrant_client import QdrantClient

from app.config.settings import settings

# Initialize Qdrant client
qdrant_client = QdrantClient(
    host=settings.QDRANT_HOST,
    port=settings.QDRANT_PORT,
)


def get_qdrant() -> QdrantClient:
    """Dependency to get the Qdrant client."""
    return qdrant_client
