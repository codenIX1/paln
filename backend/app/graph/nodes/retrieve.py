"""Retrieve node for LangGraph RAG pipeline."""

import asyncio
from app.graph.state import GraphState
from app.services.ollama_client import ollama_client
from app.services.qdrant_client import qdrant_db

_retrieval_semaphore = asyncio.Semaphore(3)


async def retrieve(state: GraphState) -> GraphState:
    """Retrieve relevant chunks from vector database with rate limiting."""
    question = state["question"]
    source_ids = state.get("source_ids", [])
    modality_focus = state.get("modality_focus", "all")
    
    modality_filter = {
        "text_only": "text",
        "visual_only": "image",
        "audio_only": "audio",
    }.get(modality_focus)
    
    async with _retrieval_semaphore:
        query_embedding = await ollama_client.get_embedding_cached(question)
    
    results_per_source = 3
    final_limit = 5
    
    if not source_ids:
        # Avoid searching the entire database if no sources are selected
        chunks = []
    else:
        search_tasks = [
            qdrant_db.search_by_modality(
                query_embedding=query_embedding,
                limit=results_per_source,
                source_id=sid,
                modality=modality_filter,
            )
            for sid in source_ids
        ]
        results = await asyncio.gather(*search_tasks)
        chunks = [c for r in results for c in r]
        chunks = sorted(chunks, key=lambda x: x["score"], reverse=True)[:final_limit]
    
    return {**state, "context_chunks": chunks}
