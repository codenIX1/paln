"""Summarize node — hybrid multimodal summarization."""

from app.graph.state import GraphState
from app.services.summarizer import HybridSummarizer
from app.services.ollama_client import ollama_client


async def summarize(state: GraphState) -> GraphState:
    """Run hybrid multimodal summarization."""
    summarizer = HybridSummarizer(ollama_client)
    result = await summarizer.run(
        chunks=state.get("context_chunks", []),
        mode=state.get("summarize_mode", "medium"),
        focus=state.get("modality_focus", "all"),
        fmt=state.get("output_format", "hybrid"),
        query=state.get("question"),
    )
    return {
        **state,
        "answer": result.narrative,
        "extractive_summary": result.bullets,
        "source_anchors": result.anchors,
        "modality_breakdown": result.breakdown,
        "modality_tags": result.modality_tags,
    }
