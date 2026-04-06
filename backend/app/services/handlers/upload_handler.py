"""Upload handler - coordinates the full upload processing pipeline."""

import uuid
from pathlib import Path
from typing import Optional

import httpx
from bs4 import BeautifulSoup
from fastapi import HTTPException, status
from pydantic import BaseModel

from app.config import get_settings
from app.db.sqlite import get_db
from app.services.document_parser import DocumentParser, get_media_type
from app.services.qdrant_client import qdrant_db

from .cleaner import TextCleaner, MediaCleaner
from .chunker import TextChunker, ModalityAwareChunker
from .embedder import Embedder


class SourceResponse(BaseModel):
    """Response model for source creation."""
    id: str
    name: str
    type: str
    media_type: str
    chunk_count: int
    created_at: str


class UploadHandler:
    """Coordinates upload pipeline: Parse → Clean → Normalize → Deduplicate → Chunk → Embed → Store."""

    def __init__(self):
        self.text_cleaner = TextCleaner()
        self.media_cleaner = MediaCleaner()
        self.chunker = TextChunker()
        self.embedder = Embedder()

    async def process_file(
        self,
        file_content: bytes,
        filename: str,
        user_id: str,
    ) -> SourceResponse:
        """Process file upload: Parse → Clean → Chunk → Embed → Store.
        
        Pipeline:
            1. Parse document (PDF, TXT, DOCX, etc.)
            2. Clean each page's text
            3. Chunk pages
            4. Embed chunks
            5. Store in vector DB
            6. Save metadata to SQLite
        """
        settings = get_settings()
        media_type = get_media_type(filename)
        
        pages = DocumentParser.parse(file_content, filename, settings.whisper_model)
        
        if not pages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No text content found in document",
            )
        
        pages = self._clean_pages(pages, media_type)
        
        aware_chunker = ModalityAwareChunker()
        if media_type in ("audio", "video") and pages and pages[0].get("segments"):
            chunks = aware_chunker.chunk_audio_segments(pages[0]["segments"], modality=media_type)
        else:
            chunks = aware_chunker.chunk_pages_with_metadata(pages, modality=media_type)
        
        if not chunks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to chunk document",
            )
        
        return await self._store_source(
            source_id=str(uuid.uuid4()),
            name=filename,
            media_type=media_type,
            file_content=file_content,
            filename=filename,
            chunks=chunks,
            user_id=user_id,
        )

    async def process_text(
        self,
        title: str,
        content: str,
        user_id: str,
    ) -> SourceResponse:
        """Process text upload: Clean → Chunk → Embed → Store.
        
        Pipeline:
            1. Clean text
            2. Chunk text
            3. Embed chunks
            4. Store in vector DB
            5. Save metadata to SQLite
        """
        cleaned_text = self.media_cleaner.clean(content, "document")
        
        if not cleaned_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No text content to process",
            )
        
        chunks = self.chunker.chunk_text_with_pages(cleaned_text, page=1)
        
        return await self._store_source(
            source_id=str(uuid.uuid4()),
            name=title,
            media_type="document",
            file_content=None,
            filename=None,
            chunks=chunks,
            user_id=user_id,
        )

    async def process_link(
        self,
        url: str,
        user_id: str,
    ) -> SourceResponse:
        """Process link upload: Scrape → Clean → Chunk → Embed → Store.
        
        Pipeline:
            1. Fetch URL content
            2. Extract text with BeautifulSoup
            3. Clean text
            4. Chunk text
            5. Embed chunks
            6. Store in vector DB
            7. Save metadata to SQLite
        """
        try:
            async with httpx.AsyncClient(
                timeout=30.0,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                },
                verify=True,
            ) as client:
                response = await client.get(url)
                response.raise_for_status()
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to fetch URL: {str(e)}",
            )
        
        soup = BeautifulSoup(response.text, "html.parser")
        
        for script in soup(["script", "style"]):
            script.decompose()
        
        title = soup.title.string if soup.title else url
        text_content = soup.get_text(separator="\n", strip=True)
        
        if not text_content or len(text_content) < 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="URL content is too short or empty",
            )
        
        cleaned_text = self.media_cleaner.clean(text_content, "document")
        chunks = self.chunker.chunk_text_with_pages(cleaned_text, page=1)
        
        return await self._store_source(
            source_id=str(uuid.uuid4()),
            name=title,
            media_type="document",
            file_content=None,
            filename=None,
            chunks=chunks,
            user_id=user_id,
        )

    def _clean_pages(self, pages: list[dict], media_type: str = "document") -> list[dict]:
        """Clean all pages based on media type."""
        return self.media_cleaner.clean_pages(pages, media_type)

    async def _store_source(
        self,
        source_id: str,
        name: str,
        media_type: str,
        file_content: Optional[bytes],
        filename: Optional[str],
        chunks: list[dict],
        user_id: str,
    ) -> SourceResponse:
        """Store source: embed chunks, save to DB, save file if applicable."""
        settings = get_settings()
        file_ext = Path(filename).suffix.lower().lstrip(".") if filename else "text"
        
        if file_content and filename:
            user_upload_dir = settings.upload_dir / user_id
            user_upload_dir.mkdir(parents=True, exist_ok=True)
            file_path = user_upload_dir / f"{source_id}.{file_ext}"
            with open(file_path, "wb") as f:
                f.write(file_content)
            file_path_str = str(file_path)
        else:
            file_path_str = None
        
        db = await get_db()
        await db.execute(
            """INSERT INTO sources (id, user_id, name, type, media_type, file_path, created_at)
               VALUES (?, ?, ?, ?, ?, ?, datetime('now'))""",
            (source_id, user_id, name, file_ext, media_type, file_path_str),
        )
        await db.commit()
        
        try:
            embeddings = await self.embedder.embed_chunks(chunks, media_type)
            await qdrant_db.add_chunks(source_id, chunks, embeddings)
            chunk_count = len(chunks)
        except Exception as e:
            await db.execute("DELETE FROM sources WHERE id = ?", (source_id,))
            await db.commit()
            if file_path_str:
                try:
                    Path(file_path_str).unlink(missing_ok=True)
                except Exception:
                    pass
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to embed/store chunks: {str(e)}",
            )
        
        await db.execute(
            "UPDATE sources SET chunk_count = ? WHERE id = ?",
            (chunk_count, source_id),
        )
        await db.commit()
        
        row = await db.execute(
            "SELECT id, name, type, media_type, chunk_count, created_at FROM sources WHERE id = ?",
            (source_id,),
        )
        source = await row.fetchone()
        
        return SourceResponse(
            id=source["id"],
            name=source["name"],
            type=source["type"],
            media_type=source["media_type"],
            chunk_count=source["chunk_count"],
            created_at=source["created_at"],
        )


upload_handler = UploadHandler()