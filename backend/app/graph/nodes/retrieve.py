"""Retrieve node for LangGraph RAG pipeline."""

import asyncio
from app.graph.state import GraphState
from app.services.ollama_client import ollama_client
from app.services.qdrant_client import qdrant_db


async def retrieve(state: GraphState) -> GraphState:
    """Retrieve relevant chunks from vector database."""
    question = state["question"]
    source_ids = state.get("source_ids", [])
    modality_focus = state.get("modality_focus", "all")
    
    modality_filter = {
        "text_only": "text",
        "visual_only": "image",
        "audio_only": "audio",
    }.get(modality_focus)
    
    query_embedding = await ollama_client.get_embedding_cached(question)
    
    # Optimize: use fewer results per source to avoid wasted processing
    # With 3 sources at limit=3, we get 9 total, take top 5
    # Instead of 15 total (5 per source), take top 5
    results_per_source = 3
    final_limit = 5
    
    if source_ids:
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
    else:
        chunks = await qdrant_db.search_by_modality(
            query_embedding=query_embedding,
            limit=final_limit,
            modality=modality_filter,
        )
    
    return {**state, "context_chunks": chunks}
