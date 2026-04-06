"""Sources routes - file upload and management."""

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.auth.dependencies import get_current_user
from app.config import get_settings
from app.db.sqlite import get_db
from app.services.document_parser import DocumentParser, get_media_type
from app.services.qdrant_client import qdrant_db
from app.services.handlers import UploadHandler, TextCleaner

router = APIRouter(prefix="/api/sources", tags=["sources"])

ALLOWED_TYPES = DocumentParser.SUPPORTED_TYPES

SOURCE_TYPE_MAP = {
    "image": "image",
    "audio": "audio",
    "video": "video",
    "document": "document",
}


class SourceResponse(BaseModel):
    id: str
    name: str
    type: str
    media_type: str
    chunk_count: int
    created_at: str


class SourceListResponse(BaseModel):
    sources: list[SourceResponse]


class TextSourceRequest(BaseModel):
    title: str
    content: str


class LinkSourceRequest(BaseModel):
    url: str


upload_handler = UploadHandler()
text_cleaner = TextCleaner()


@router.post("", response_model=SourceResponse)
async def upload_source(
    file: UploadFile,
    current_user: dict = Depends(get_current_user),
):
    """Upload a document for ingestion."""
    user_id = current_user["id"]
    
    file_ext = Path(file.filename).suffix.lower().lstrip(".")
    
    if file_ext not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not supported. Allowed: {', '.join(sorted(ALLOWED_TYPES))}",
        )
    
    file_content = await file.read()
    
    if len(file_content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file",
        )
    
    if len(file_content) > 100 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Max 100MB",
        )
    
    try:
        return await upload_handler.process_file(
            file_content=file_content,
            filename=file.filename,
            user_id=user_id,
        )
    except Exception as e:
        error_msg = str(e)
        if "Ollama" in error_msg or "ollama" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI service unavailable: {error_msg}. Please ensure Ollama is running."
            )
        if "No text content" in error_msg or "Failed to chunk" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process document: {error_msg}",
        )


@router.post("/text", response_model=SourceResponse)
async def upload_text(
    request: TextSourceRequest,
    current_user: dict = Depends(get_current_user),
):
    """Upload raw text for ingestion."""
    user_id = current_user["id"]
    
    try:
        return await upload_handler.process_text(
            title=request.title,
            content=request.content,
            user_id=user_id,
        )
    except Exception as e:
        error_msg = str(e)
        if "Ollama" in error_msg or "ollama" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI service unavailable: {error_msg}. Please ensure Ollama is running."
            )
        if "No text content" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process text: {error_msg}",
        )


@router.post("/link", response_model=SourceResponse)
async def upload_link(
    request: LinkSourceRequest,
    current_user: dict = Depends(get_current_user),
):
    """Scrape URL and ingest content."""
    user_id = current_user["id"]
    
    try:
        return await upload_handler.process_link(
            url=request.url,
            user_id=user_id,
        )
    except Exception as e:
        error_msg = str(e)
        if "Ollama" in error_msg or "ollama" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI service unavailable: {error_msg}. Please ensure Ollama is running."
            )
        if "Failed to fetch" in error_msg or "too short" in error_msg or "content is too short" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process link: {error_msg}",
        )


@router.get("", response_model=SourceListResponse)
async def list_sources(
    current_user: dict = Depends(get_current_user),
):
    """List all sources for the current user."""
    user_id = current_user["id"]
    db = await get_db()
    
    row = await db.execute(
        """SELECT s.id, s.name, s.type, s.media_type, s.chunk_count, s.created_at
           FROM sources s WHERE s.user_id = ?
           ORDER BY s.created_at DESC""",
        (user_id,),
    )
    sources = await row.fetchall()
    
    source_list = []
    for s in sources:
        source_dict = dict(s)
        source_list.append(
            SourceResponse(
                id=source_dict["id"],
                name=source_dict["name"],
                type=source_dict["type"],
                media_type=source_dict.get("media_type", "document"),
                chunk_count=source_dict.get("chunk_count", 0),
                created_at=source_dict["created_at"],
            )
        )
    
    return SourceListResponse(sources=source_list)


@router.get("/{source_id}")
async def get_source(
    source_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a specific source."""
    user_id = current_user["id"]
    db = await get_db()
    
    row = await db.execute(
        "SELECT * FROM sources WHERE id = ? AND user_id = ?",
        (source_id, user_id),
    )
    source = await row.fetchone()
    
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source not found",
        )
    
    return source


@router.delete("/{source_id}")
async def delete_source(
    source_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a source and its chunks."""
    user_id = current_user["id"]
    db = await get_db()
    
    row = await db.execute(
        "SELECT * FROM sources WHERE id = ? AND user_id = ?",
        (source_id, user_id),
    )
    source = await row.fetchone()
    
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source not found",
        )
    
    try:
        await qdrant_db.delete_source(source_id)
    except Exception as e:
        print(f"Warning: Failed to delete from Qdrant: {e}")
    
    file_path = source["file_path"]
    if file_path:
        try:
            fp = Path(file_path)
            if fp.exists():
                fp.unlink()
        except Exception as e:
            print(f"Warning: Failed to delete file: {e}")
    
    await db.execute("DELETE FROM sources WHERE id = ?", (source_id,))
    await db.commit()
    
    return {"message": "Source deleted successfully"}