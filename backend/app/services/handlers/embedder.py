"""Embedding handler for upload processing."""

import asyncio
import base64
import io
from collections import OrderedDict
from typing import Optional

from PIL import Image

from app.config import get_settings
from app.services.ollama_client import ollama_client, OllamaError


class Embedder:
    """Handles embedding generation for chunks."""

    def __init__(self, batch_size: int = 10, max_concurrent: int = 5):
        self.batch_size = batch_size
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._local_cache: OrderedDict[str, list[float]] = OrderedDict()
        self._LOCAL_CACHE_MAX = 200

    async def _get_embed_model(self, media_type: str) -> str:
        """Get embedding model based on media type."""
        settings = get_settings()
        
        model_map = {
            "image": settings.ollama_image_embed_model,
            "audio": settings.ollama_audio_embed_model,
            "video": settings.ollama_video_embed_model,
        }
        
        return model_map.get(media_type, settings.ollama_embed_model)

    def _get_local_cache_key(self, text: str, model: str) -> str:
        """Generate local cache key."""
        return f"{model}:{text[:100]}"

    async def _get_embedding_with_local_cache(
        self, text: str, model: str
    ) -> list[float]:
        """Check local cache first, then global cache, then API."""
        cache_key = self._get_local_cache_key(text, model)
        
        if cache_key in self._local_cache:
            self._local_cache.move_to_end(cache_key)
            return self._local_cache[cache_key]
        
        embedding = await ollama_client.get_embedding_cached(text, model)
        
        self._local_cache[cache_key] = embedding
        if len(self._local_cache) > self._LOCAL_CACHE_MAX:
            self._local_cache.popitem(last=False)
        
        return embedding

    async def embed_chunks(
        self,
        chunks: list[dict],
        media_type: str,
    ) -> list[list[float]]:
        """Generate embeddings for chunks with deduplication.
        
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
        
        texts_with_indices = []
        seen_texts = set()
        for i, c in enumerate(chunks):
            text = prefix + c["text"]
            if text not in seen_texts:
                seen_texts.add(text)
                texts_with_indices.append((i, text))
        
        embed_model = await self._get_embed_model(media_type)
        
        unique_texts = [t for _, t in texts_with_indices]
        unique_embeddings = await self.embed_batch_dedup(unique_texts, embed_model)
        
        text_to_embedding = dict(zip(unique_texts, unique_embeddings))
        
        return [text_to_embedding[prefix + c["text"]] for c in chunks]

    async def _embed_with_limit(self, text: str, model: str) -> list[float]:
        """Embed a single text with concurrency limiting."""
        async with self._semaphore:
            return await self._get_embedding_with_local_cache(text, model)

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

    async def embed_batch_dedup(
        self,
        texts: list[str],
        model: str,
    ) -> list[list[float]]:
        """Batch embed with deduplication - minimizes API calls.
        
        Args:
            texts: List of text strings (will be deduplicated)
            model: Embedding model to use
            
        Returns:
            List of embeddings in same order as input
        """
        if not texts:
            return []
        
        unique_texts = []
        seen = set()
        for t in texts:
            if t not in seen:
                seen.add(t)
                unique_texts.append(t)
        
        unique_embeddings = await self.embed_batch(unique_texts, model)
        text_to_embedding = dict(zip(unique_texts, unique_embeddings))
        
        return [text_to_embedding[t] for t in texts]

    async def embed_single(self, text: str, media_type: str) -> list[float]:
        """Generate embedding for a single text.
        
        Args:
            text: Text to embed
            media_type: Media type for model selection
            
        Returns:
            Embedding (list of floats)
        """
        embed_model = await self._get_embed_model(media_type)
        return await ollama_client.get_embedding_cached(text, embed_model)

    async def describe_image(self, image_bytes: bytes) -> str:
        """Generate natural language description for an image using vision model.
        
        Args:
            image_bytes: Raw image bytes
            
        Returns:
            Natural language description of the image
        """
        try:
            image = Image.open(io.BytesIO(image_bytes))
            if image.mode != "RGB":
                image = image.convert("RGB")
            
            buffered = io.BytesIO()
            image.save(buffered, format="PNG")
            image_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
            
            description = await ollama_client.describe_image(image_b64)
            return description
        except OllamaError:
            raise
        except Exception as e:
            raise ValueError(f"Failed to describe image: {str(e)}")

    async def embed_image_hybrid(
        self,
        image_bytes: bytes,
        ocr_text: str,
    ) -> tuple[list[float], str]:
        """Generate hybrid embeddings for images - both vision description + OCR.
        
        Args:
            image_bytes: Raw image bytes
            ocr_text: OCR extracted text from the image
            
        Returns:
            Tuple of (embeddings list, vision_description)
        """
        settings = get_settings()
        
        vision_description = None
        
        try:
            vision_description = await self.describe_image(image_bytes)
        except OllamaError as e:
            print(f"Vision model unavailable: {e}. Using OCR only.")
            vision_description = None
        
        embed_model = settings.ollama_image_embed_model
        embeddings = []
        
        if vision_description:
            vision_prefix = "[Image description] "
            vision_text = vision_prefix + vision_description
            vision_emb = await ollama_client.get_embedding_cached(vision_text, embed_model)
            embeddings.append(vision_emb)
        
        if ocr_text:
            ocr_prefix = "[Image text (OCR)] "
            ocr_text_with_prefix = ocr_prefix + ocr_text
            ocr_emb = await ollama_client.get_embedding_cached(ocr_text_with_prefix, embed_model)
            embeddings.append(ocr_emb)
        
        if not embeddings and not ocr_text:
            raise ValueError("No content to embed: both vision description and OCR failed")
        
        return embeddings, vision_description or ""