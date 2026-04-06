"""Generate node for LangGraph RAG pipeline."""

from app.graph.state import GraphState
from app.services.ollama_client import ollama_client


async def generate(state: GraphState) -> GraphState:
    """Generate answer using retrieved context with structured response."""
    question = state["question"]
    context_chunks = state.get("context_chunks", [])
    chat_history = state.get("chat_history", [])
    
    try:
        result = await ollama_client.generate_chat_response(
            question=question,
            context_chunks=context_chunks,
            chat_history=chat_history,
        )
    except Exception as e:
        print(f"Generate error: {e}")
        return {
            **state,
            "title": "Error",
            "answer": f"Failed to generate response: {str(e)}",
            "extractive_summary": [],
            "follow_ups": [],
        }
    
    return {
        **state,
        "title": result.get("title", ""),
        "answer": result.get("answer", ""),
        "extractive_summary": result.get("extractive_summary", []),
        "follow_ups": result.get("follow_ups", []),
    }
