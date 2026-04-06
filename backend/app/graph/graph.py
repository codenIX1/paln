"""LangGraph workflow for RAG pipeline."""

from langgraph.graph import StateGraph, END

from app.graph.state import GraphState
from app.graph.nodes import retrieve, generate, summarize


def create_rag_graph() -> StateGraph:
    """Create the RAG graph."""
    graph = StateGraph(GraphState)
    
    graph.add_node("retrieve", retrieve)
    graph.add_node("generate", generate)
    graph.add_node("summarize", summarize)
    
    graph.set_entry_point("retrieve")
    
    def should_summarize(state: GraphState) -> str:
        return "summarize" if state.get("summarize_mode") else "generate"
    
    graph.add_conditional_edges(
        "retrieve",
        should_summarize,
        {"summarize": "summarize", "generate": "generate"},
    )
    graph.add_edge("summarize", END)
    graph.add_edge("generate", END)
    
    return graph.compile()


rag_graph = create_rag_graph()


async def run_rag_pipeline(
    user_id: str,
    session_id: str,
    question: str,
    source_ids: list[str] | None = None,
    chat_history: list[dict] | None = None,
    summarize_mode: str | None = None,
    modality_focus: str | None = None,
    output_format: str | None = None,
) -> dict:
    """Run the RAG pipeline."""
    initial_state: GraphState = {
        "user_id": user_id,
        "session_id": session_id,
        "question": question,
        "context_chunks": [],
        "answer": "",
        "title": "",
        "extractive_summary": [],
        "source_ids": source_ids or [],
        "chat_history": chat_history or [],
        "follow_ups": [],
        "summarize_mode": summarize_mode or "",
        "modality_focus": modality_focus or "all",
        "output_format": output_format or "hybrid",
        "source_anchors": [],
        "modality_breakdown": {},
        "modality_tags": [],
    }
    
    result = await rag_graph.ainvoke(initial_state)
    return result
