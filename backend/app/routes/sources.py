"""Sources routes - file upload and management."""

import json
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.auth.dependencies import get_current_user
from app.config import get_settings
from app.db.database import get_db
from app.db.repositories import SourceRepository, JobRepository
from app.services.document_parser import DocumentParser, get_media_type
from app.services.qdrant_client import qdrant_db
from app.services.background_job import job_service, JobType, JobStatus
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


class JobResponse(BaseModel):
    job_id: str
    status: str
    message: str


@router.post("", response_model=JobResponse)
async def upload_source(
    file: UploadFile,
    current_user: dict = Depends(get_current_user),
):
    """Upload a document for background processing."""
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
        job_id = await job_service.create_job(
            user_id=user_id,
            job_type=JobType.UPLOAD.value,
            metadata={"filename": file.filename},
        )
        
        await job_service.start_job(
            job_id=job_id,
            file_content=file_content,
            filename=file.filename,
            user_id=user_id,
        )
        
        return JobResponse(
            job_id=job_id,
            status=JobStatus.PROCESSING.value,
            message="Document upload started. Use /jobs/{job_id} to check status.",
        )
    except RuntimeError as e:
        if "Too many jobs" in str(e):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=str(e),
            )
        raise
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


@router.get("/jobs/{job_id}", response_model=dict)
async def get_upload_job_status(
    job_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the status of an upload job."""
    user_id = current_user["id"]
    
    job = await job_service.get_job(job_id, user_id)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    
    result = {
        "job_id": job["id"],
        "status": job["status"],
        "progress": job["progress"],
        "total": job["total"],
        "error_message": job["error_message"],
    }
    
    if job["status"] == JobStatus.COMPLETED.value and job["result_id"]:
        result["source_id"] = job["result_id"]
        from app.db.models import Source
        src_result = await db.execute(
            select(Source).where(Source.id == job["result_id"])
        )
        source = src_result.scalar_one_or_none()
        if source:
            result["source"] = {
                "id": source.id,
                "name": source.name,
                "type": source.type,
                "media_type": source.media_type,
                "chunk_count": source.chunk_count,
                "created_at": str(source.created_at),
            }
    
    return result


@router.get("/jobs", response_model=list)
async def list_upload_jobs(
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    limit: int = 20,
):
    """List all upload jobs for the current user."""
    user_id = current_user["id"]
    
    job_status = JobStatus(status) if status else None
    
    return await job_service.get_user_jobs(
        user_id=user_id,
        status=job_status,
        limit=limit,
    )


@router.get("/jobs/{job_id}/stream")
async def stream_job_progress(
    job_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Stream job progress via SSE."""
    user_id = current_user["id"]
    
    job = await job_service.get_job(job_id, user_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    
    async def event_generator():
        import asyncio
        
        last_progress = -1
        while True:
            current_job = await job_service.get_job(job_id, user_id)
            
            if not current_job:
                yield "data: {}\n\n".format(json.dumps({"error": "Job not found"}))
                break
            
            progress = current_job.get("progress", 0)
            
            if progress != last_progress and progress > last_progress:
                yield "data: {}\n\n".format(json.dumps({
                    "progress": progress,
                    "status": current_job.get("status"),
                }))
                last_progress = progress
            
            if current_job.get("status") in [JobStatus.COMPLETED.value, JobStatus.FAILED.value]:
                if current_job.get("status") == JobStatus.COMPLETED.value:
                    yield "data: {}\n\n".format(json.dumps({
                        "progress": 100,
                        "status": "completed",
                        "source_id": current_job.get("result_id"),
                    }))
                else:
                    yield "data: {}\n\n".format(json.dumps({
                        "progress": current_job.get("progress", 0),
                        "status": "failed",
                        "error": current_job.get("error_message"),
                    }))
                break
            
            await asyncio.sleep(1)
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")


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
    db: AsyncSession = Depends(get_db),
):
    """List all sources for the current user."""
    user_id = current_user["id"]
    source_repo = SourceRepository(db)
    
    sources = await source_repo.get_user_sources(user_id)
    
    source_list = [
        SourceResponse(
            id=s.id,
            name=s.name,
            type=s.type,
            media_type=s.media_type,
            chunk_count=s.chunk_count,
            created_at=str(s.created_at),
        )
        for s in sources
    ]
    
    return SourceListResponse(sources=source_list)


@router.get("/{source_id}")
async def get_source(
    source_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific source."""
    user_id = current_user["id"]
    source_repo = SourceRepository(db)
    
    source = await source_repo.get_by_id_and_user(source_id, user_id)
    
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source not found",
        )
    
    return {
        "id": source.id,
        "name": source.name,
        "type": source.type,
        "media_type": source.media_type,
        "file_path": source.file_path,
        "chunk_count": source.chunk_count,
        "created_at": str(source.created_at),
    }


@router.delete("/{source_id}")
async def delete_source(
    source_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a source and its chunks."""
    user_id = current_user["id"]
    source_repo = SourceRepository(db)
    
    source = await source_repo.get_by_id_and_user(source_id, user_id)
    
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source not found",
        )
    
    try:
        await qdrant_db.delete_source(source_id)
    except Exception as e:
        print(f"Warning: Failed to delete from Qdrant: {e}")
    
    file_path = source.file_path
    if file_path:
        try:
            fp = Path(file_path)
            if fp.exists():
                fp.unlink()
        except Exception as e:
            print(f"Warning: Failed to delete file: {e}")
    
    await source_repo.delete(source_id)


class ImageDescriptionResponse(BaseModel):
    description: str
    source_id: str


@router.post("/describe-image", response_model=ImageDescriptionResponse)
async def describe_image_endpoint(
    file: UploadFile,
    current_user: dict = Depends(get_current_user),
):
    """Describe an image using the vision model (LLaVA)."""
    from app.services.handlers.embedder import Embedder
    
    user_id = current_user["id"]
    file_ext = Path(file.filename).suffix.lower().lstrip(".")
    
    if file_ext not in DocumentParser.IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type must be an image. Allowed: {', '.join(sorted(DocumentParser.IMAGE_TYPES))}",
        )
    
    file_content = await file.read()
    
    if len(file_content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file",
        )
    
    try:
        embedder = Embedder()
        description = await embedder.describe_image(file_content)
        
        return ImageDescriptionResponse(
            description=description,
            source_id="",
        )
    except Exception as e:
        if "Vision model" in str(e):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Vision model unavailable: {str(e)}. Please ensure Ollama is running with LLaVA model. Run 'ollama pull llava'",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to describe image: {str(e)}",
        )
    await db.commit()
    
    return {"message": "Source deleted successfully"}