"""LangGraph state definitions."""

from typing import TypedDict


class GraphState(TypedDict):
    """State for the RAG graph."""

    user_id: str
    session_id: str
    question: str
    context_chunks: list[dict]
    answer: str
    title: str
    extractive_summary: list[str]
    source_ids: list[str]
    chat_history: list[dict]
    follow_ups: list[str]
    summarize_mode: str
    modality_focus: str
    output_format: str
    source_anchors: list[dict]
    modality_breakdown: dict
    modality_tags: list[str]
