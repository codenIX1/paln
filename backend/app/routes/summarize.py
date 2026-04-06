"""Summarize routes — dedicated endpoint with user controls."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth.dependencies import get_current_user
from app.graph.graph import run_rag_pipeline

router = APIRouter(prefix="/api/summarize", tags=["summarize"])


class SummarizeRequest(BaseModel):
    source_ids: list[str]
    query: Optional[str] = None
    mode: str = "medium"
    focus: str = "all"
    format: str = "hybrid"


class SummarizeResponse(BaseModel):
    summary: str
    bullets: list[str]
    source_anchors: list[dict]
    modality_breakdown: dict
    modality_tags: list[str]


@router.post("", response_model=SummarizeResponse)
async def summarize_sources(
    request: SummarizeRequest,
    current_user: dict = Depends(get_current_user),
):
    """3-pass hybrid multimodal summarization with user controls."""
    if not request.source_ids:
        raise HTTPException(status_code=400, detail="At least one source_id required")
    if request.mode not in ("short", "medium", "detailed"):
        raise HTTPException(status_code=400, detail="mode: short|medium|detailed")
    if request.focus not in ("all", "text_only", "visual_only", "audio_only"):
        raise HTTPException(status_code=400, detail="focus: all|text_only|visual_only|audio_only")
    if request.format not in ("bullets", "narrative", "hybrid"):
        raise HTTPException(status_code=400, detail="format: bullets|narrative|hybrid")

    result = await run_rag_pipeline(
        user_id=current_user["id"],
        session_id="summarize",
        question=request.query or "Summarize the content across all sources.",
        source_ids=request.source_ids,
        summarize_mode=request.mode,
        modality_focus=request.focus,
        output_format=request.format,
    )
    return SummarizeResponse(
        summary=result.get("answer", ""),
        bullets=result.get("extractive_summary", []),
        source_anchors=result.get("source_anchors", []),
        modality_breakdown=result.get("modality_breakdown", {}),
        modality_tags=result.get("modality_tags", []),
    )
