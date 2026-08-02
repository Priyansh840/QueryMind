"""
QueryMind - Vector Store Service
Manages vector operations with Qdrant (create collection, upsert, search).
"""

import uuid
from typing import List, Dict, Optional

from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)

from app.config.settings import settings
from app.config.qdrant import qdrant_client
from app.ai.embeddings import embedding_service, EmbeddingService


class VectorStoreService:
    """
    Manages vector operations with Qdrant.
    - Create collections for documents and memories
    - Upsert document chunk embeddings
    - Perform ANN (Approximate Nearest Neighbor) search
    """

    def __init__(
        self,
        client: QdrantClient = qdrant_client,
        embedder: EmbeddingService = embedding_service,
    ):
        self.client = client
        self.embedder = embedder
        self.doc_collection = settings.QDRANT_COLLECTION_DOCUMENTS
        self.memory_collection = settings.QDRANT_COLLECTION_MEMORIES

    def initialize_collections(self):
        """Create Qdrant collections if they don't exist."""
        collections = [name.name for name in self.client.get_collections().collections]

        for collection_name in [self.doc_collection, self.memory_collection]:
            if collection_name not in collections:
                self.client.create_collection(
                    collection_name=collection_name,
                    vectors_config=VectorParams(
                        size=EmbeddingService.EMBEDDING_DIM,  # 384 for BGE-Small
                        distance=Distance.COSINE,
                    ),
                )
                print(f"Created Qdrant collection: {collection_name}")
            else:
                print(f"Qdrant collection already exists: {collection_name}")

    def upsert_chunks(
        self,
        chunks: List[Dict],
        user_id: str,
        document_id: str,
        document_title: str,
    ) -> List[str]:
        """
        Embed and store document chunks in Qdrant.

        Args:
            chunks: List of dicts with 'content', 'chunk_index', 'page_number'
            user_id: Owner's user ID
            document_id: Parent document ID
            document_title: Document title for metadata

        Returns:
            List of Qdrant point IDs
        """
        # Batch embed all chunk texts
        texts = [chunk["content"] for chunk in chunks]
        embeddings = self.embedder.embed_texts(texts)

        # Create Qdrant points
        points = []
        point_ids = []

        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            point_id = str(uuid.uuid4())
            point_ids.append(point_id)

            points.append(
                PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload={
                        "user_id": user_id,
                        "document_id": document_id,
                        "document_title": document_title,
                        "chunk_index": chunk.get("chunk_index", i),
                        "page_number": chunk.get("page_number"),
                        "content": chunk["content"],
                    },
                )
            )

        # Upsert to Qdrant
        self.client.upsert(
            collection_name=self.doc_collection,
            points=points,
        )

        print(f"Upserted {len(points)} chunks for document: {document_title}")
        return point_ids

    def search_similar(
        self,
        query: str,
        user_id: str,
        collection: Optional[str] = None,
        top_k: int = 5,
        score_threshold: float = 0.3,
    ) -> List[Dict]:
        """
        Perform ANN semantic search using cosine similarity.

        Args:
            query: Natural language search query
            user_id: Filter results to this user only
            collection: Which collection to search (defaults to documents)
            top_k: Number of top results to return
            score_threshold: Minimum similarity score

        Returns:
            List of dicts with 'content', 'score', 'document_id', etc.
        """
        collection_name = collection or self.doc_collection

        # Embed the query
        query_vector = self.embedder.embed_query(query)

        # Search with user filter
        results = self.client.search(
            collection_name=collection_name,
            query_vector=query_vector,
            query_filter=Filter(
                must=[
                    FieldCondition(
                        key="user_id",
                        match=MatchValue(value=user_id),
                    )
                ]
            ),
            limit=top_k,
            score_threshold=score_threshold,
        )

        # Format results
        return [
            {
                "point_id": str(result.id),
                "score": result.score,
                "content": result.payload.get("content", ""),
                "document_id": result.payload.get("document_id", ""),
                "document_title": result.payload.get("document_title", ""),
                "chunk_index": result.payload.get("chunk_index", 0),
                "page_number": result.payload.get("page_number"),
            }
            for result in results
        ]

    def delete_document_vectors(self, document_id: str):
        """Delete all vectors associated with a document."""
        self.client.delete(
            collection_name=self.doc_collection,
            points_selector=Filter(
                must=[
                    FieldCondition(
                        key="document_id",
                        match=MatchValue(value=document_id),
                    )
                ]
            ),
        )
        print(f"Deleted vectors for document: {document_id}")


# Singleton instance
vector_store = VectorStoreService()
