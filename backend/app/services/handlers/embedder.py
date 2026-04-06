"""Embedding handler for upload processing."""

import asyncio
from typing import Optional

from app.config import get_settings
from app.services.ollama_client import ollama_client


class Embedder:
    """Handles embedding generation for chunks."""

    def __init__(self, batch_size: int = 10, max_concurrent: int = 5):
        self.batch_size = batch_size
        self._semaphore = asyncio.Semaphore(max_concurrent)

    async def _get_embed_model(self, media_type: str) -> str:
        """Get embedding model based on media type."""
        settings = get_settings()
        
        model_map = {
            "image": settings.ollama_image_embed_model,
            "audio": settings.ollama_audio_embed_model,
            "video": settings.ollama_video_embed_model,
        }
        
        return model_map.get(media_type, settings.ollama_embed_model)

    async def embed_chunks(
        self,
        chunks: list[dict],
        media_type: str,
    ) -> list[list[float]]:
        """Generate embeddings for chunks.
        
        Args:
            chunks: List of chunks with 'text' key
            media_type: Media type for model selection
            
        Returns:
            List of embeddings (list of floats)
        """
        MODALITY_PREFIX = {
            "text": "",
            "document": "",
            "image": "[Image content] ",
            "audio": "[Audio transcription] ",
            "video": "[Video transcription] ",
        }
        
        prefix = MODALITY_PREFIX.get(media_type, "")
        chunk_texts = [prefix + c["text"] for c in chunks]
        embed_model = await self._get_embed_model(media_type)
        
        return await self.embed_batch(chunk_texts, embed_model)

    async def _embed_with_limit(self, text: str, model: str) -> list[float]:
        """Embed a single text with concurrency limiting."""
        async with self._semaphore:
            return await ollama_client.get_embedding(text, model)

    async def embed_batch(
        self,
        texts: list[str],
        model: str,
    ) -> list[list[float]]:
        """Batch embed texts with batching.
        
        Args:
            texts: List of text strings to embed
            model: Embedding model to use
            
        Returns:
            List of embeddings
        """
        if not texts:
            return []
        
        all_embeddings = []
        
        for i in range(0, len(texts), self.batch_size):
            batch = texts[i:i + self.batch_size]
            batch_embeddings = await asyncio.gather(
                *[self._embed_with_limit(text, model) for text in batch]
            )
            all_embeddings.extend(batch_embeddings)
        
        return all_embeddings

    async def embed_single(self, text: str, media_type: str) -> list[float]:
        """Generate embedding for a single text.
        
        Args:
            text: Text to embed
            media_type: Media type for model selection
            
        Returns:
            Embedding (list of floats)
        """
        embed_model = await self._get_embed_model(media_type)
        return await ollama_client.get_embedding(text, embed_model)