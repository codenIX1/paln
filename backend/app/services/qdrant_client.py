"""Qdrant vector database client."""

import uuid
from typing import Optional
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from qdrant_client.http.exceptions import UnexpectedResponse

from app.config import get_settings


class QdrantDB:
    """Qdrant vector database manager."""

    _instance: Optional["QdrantDB"] = None
    _client: Optional[AsyncQdrantClient] = None

    COLLECTION_NAME = "document_chunks"

    def __new__(cls) -> "QdrantDB":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def get_client(self) -> AsyncQdrantClient:
        """Get client with automatic reconnection on failure."""
        if self._client is None:
            await self._connect()
        
        try:
            await self._client.get_collections()
        except Exception:
            self._client = None
            await self._connect()
        
        return self._client

    async def _connect(self) -> None:
        """Establish connection to Qdrant."""
        settings = get_settings()
        self._client = AsyncQdrantClient(
            host=settings.qdrant_host,
            port=settings.qdrant_port,
            grpc_port=settings.qdrant_grpc_port,
        )

    async def create_collection(self) -> None:
        """Create the document_chunks collection if it doesn't exist."""
        client = await self.get_client()
        
        try:
            await client.get_collection(self.COLLECTION_NAME)
        except UnexpectedResponse:
            await client.create_collection(
                collection_name=self.COLLECTION_NAME,
                vectors_config=VectorParams(
                    size=768,
                    distance=Distance.COSINE,
                ),
            )

    async def delete_collection(self) -> None:
        """Delete the entire collection (for re-indexing)."""
        client = await self.get_client()
        try:
            await client.delete_collection(collection_name=self.COLLECTION_NAME)
        except Exception as e:
            print(f"Qdrant delete_collection error: {e}")

    async def add_chunks(
        self,
        source_id: str,
        chunks: list[dict],
        embeddings: list[list[float]],
    ) -> None:
        """Add document chunks with embeddings to Qdrant."""
        client = await self.get_client()
        
        points = [
            PointStruct(
                id=str(uuid.uuid4()),
                vector=embeddings[i],
                payload={
                    "source_id": source_id,
                    "chunk_text": chunks[i]["text"],
                    "chunk_index": i,
                    "page_number": chunks[i].get("page"),
                    "modality": chunks[i].get("modality", "text"),
                    "segment_type": chunks[i].get("segment_type", "paragraph"),
                    "confidence": chunks[i].get("confidence", 1.0),
                    "source_anchor": chunks[i].get("source_anchor", {}),
                },
            )
            for i in range(len(chunks))
        ]
        
        await client.upsert(
            collection_name=self.COLLECTION_NAME,
            points=points,
        )

    async def search(
        self,
        query_embedding: list[float],
        limit: int = 5,
        source_id: Optional[str] = None,
    ) -> list[dict]:
        """Search for similar chunks."""
        client = await self.get_client()
        
        filter_condition = None
        if source_id:
            from qdrant_client.models import Filter, FieldCondition, MatchValue
            filter_condition = Filter(
                must=[FieldCondition(key="source_id", match=MatchValue(value=source_id))]
            )
        
        results = await client.query_points(
            collection_name=self.COLLECTION_NAME,
            query=query_embedding,
            limit=limit,
            query_filter=filter_condition,
        )
        
        return [
            {
                "id": result.id,
                "score": result.score,
                "source_id": result.payload["source_id"],
                "chunk_text": result.payload["chunk_text"],
                "chunk_index": result.payload["chunk_index"],
                "page_number": result.payload.get("page_number"),
                "modality": result.payload.get("modality", "text"),
                "segment_type": result.payload.get("segment_type", "paragraph"),
                "confidence": result.payload.get("confidence", 1.0),
                "source_anchor": result.payload.get("source_anchor", {}),
            }
            for result in results.points
        ]

    async def search_by_modality(
        self,
        query_embedding: list[float],
        limit: int = 5,
        source_id: Optional[str] = None,
        modality: Optional[str] = None,
    ) -> list[dict]:
        """Search with optional modality filter."""
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        
        conditions = []
        if source_id:
            conditions.append(FieldCondition(key="source_id", match=MatchValue(value=source_id)))
        if modality:
            conditions.append(FieldCondition(key="modality", match=MatchValue(value=modality)))
        filter_condition = Filter(must=conditions) if conditions else None

        client = await self.get_client()
        results = await client.query_points(
            collection_name=self.COLLECTION_NAME,
            query=query_embedding,
            limit=limit,
            query_filter=filter_condition,
        )
        return [
            {
                "id": r.id, "score": r.score,
                "source_id": r.payload["source_id"],
                "chunk_text": r.payload["chunk_text"],
                "chunk_index": r.payload["chunk_index"],
                "page_number": r.payload.get("page_number"),
                "modality": r.payload.get("modality", "text"),
                "segment_type": r.payload.get("segment_type", "paragraph"),
                "confidence": r.payload.get("confidence", 1.0),
                "source_anchor": r.payload.get("source_anchor", {}),
            }
            for r in results.points
        ]

    async def delete_source(self, source_id: str) -> None:
        """Delete all chunks for a source."""
        try:
            client = await self.get_client()
            
            from qdrant_client.models import Filter, FieldCondition, MatchValue
            
            await client.delete(
                collection_name=self.COLLECTION_NAME,
                points_selector=Filter(
                    must=[FieldCondition(key="source_id", match=MatchValue(value=source_id))]
                ),
            )
        except Exception as e:
            print(f"Qdrant delete_source error: {e}")
            raise


qdrant_db = QdrantDB()
