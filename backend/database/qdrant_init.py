"""
QueryMind - Qdrant Initialization
Connects to Qdrant Cloud and initializes the three core collections
with dynamic vector dimensions and specific payload indexes.
"""

import sys
import os
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams
from qdrant_client.http.exceptions import UnexpectedResponse

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from core.config import settings

def init_qdrant():
    """Initializes Qdrant collections and payload indexes."""
    
    if not settings.QDRANT_URL or not settings.QDRANT_API_KEY:
        print("ERROR: QDRANT_URL or QDRANT_API_KEY is not set.")
        sys.exit(1)

    print(f"Connecting to Qdrant Cloud at {settings.QDRANT_URL}...")
    client = QdrantClient(
        url=settings.QDRANT_URL,
        api_key=settings.QDRANT_API_KEY,
    )
    
    dimension = settings.QDRANT_VECTOR_DIMENSION
    print(f"Configured Vector Dimension: {dimension} (Model: {settings.EMBEDDING_MODEL})")

    collections_to_create = [
        settings.QDRANT_COLLECTION_DOCUMENTS,
        settings.QDRANT_COLLECTION_MEMORIES,
        settings.QDRANT_COLLECTION_KNOWLEDGE
    ]

    for collection_name in collections_to_create:
        try:
            collection_info = client.get_collection(collection_name)
            # Verify dimensions if it exists
            existing_dim = collection_info.config.params.vectors.size
            if existing_dim != dimension:
                print(f"FATAL: Collection '{collection_name}' exists with dimension {existing_dim}, "
                      f"but configuration requires {dimension}. "
                      f"Failing loudly to prevent data corruption.")
                sys.exit(1)
            print(f"Collection '{collection_name}' already exists and dimensions match ({dimension}).")
            
        except UnexpectedResponse as e:
            if "Not found" in str(e):
                print(f"Creating collection '{collection_name}' with dimension {dimension}...")
                client.create_collection(
                    collection_name=collection_name,
                    vectors_config=VectorParams(size=dimension, distance=Distance.COSINE),
                )
            else:
                raise

    # -----------------------------------------------------
    # Create Payload Indexes
    # Only creating indexes for fields actually used by retrieval filters.
    # -----------------------------------------------------
    
    print("Ensuring payload indexes exist...")

    # 1. Document Chunks
    client.create_payload_index(
        collection_name=settings.QDRANT_COLLECTION_DOCUMENTS,
        field_name="user_id", field_schema="keyword"
    )
    client.create_payload_index(
        collection_name=settings.QDRANT_COLLECTION_DOCUMENTS,
        field_name="space_id", field_schema="keyword"
    )
    client.create_payload_index(
        collection_name=settings.QDRANT_COLLECTION_DOCUMENTS,
        field_name="document_id", field_schema="keyword"
    )

    # 2. Memories
    client.create_payload_index(
        collection_name=settings.QDRANT_COLLECTION_MEMORIES,
        field_name="user_id", field_schema="keyword"
    )
    client.create_payload_index(
        collection_name=settings.QDRANT_COLLECTION_MEMORIES,
        field_name="memory_type", field_schema="keyword"
    )

    # 3. Knowledge
    client.create_payload_index(
        collection_name=settings.QDRANT_COLLECTION_KNOWLEDGE,
        field_name="user_id", field_schema="keyword"
    )
    client.create_payload_index(
        collection_name=settings.QDRANT_COLLECTION_KNOWLEDGE,
        field_name="space_id", field_schema="keyword"
    )
    client.create_payload_index(
        collection_name=settings.QDRANT_COLLECTION_KNOWLEDGE,
        field_name="source_type", field_schema="keyword"
    )

    print("Qdrant initialization complete! All collections and indexes are ready.")

if __name__ == "__main__":
    init_qdrant()
