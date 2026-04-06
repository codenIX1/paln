"""Chat routes - session and message management."""

import json
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.auth.dependencies import get_current_user
from app.db.sqlite import get_db
from app.graph.graph import run_rag_pipeline
from app.services.ollama_client import ollama_client

router = APIRouter(prefix="/api/chat", tags=["chat"])


def handle_chat_error(error_msg: str) -> None:
    """Helper to handle chat errors and raise appropriate HTTP exceptions."""
    if "Ollama" in error_msg or "ollama" in error_msg:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service unavailable: {error_msg}. Please ensure Ollama is running with required models."
        )
    if "Qdrant" in error_msg or "qdrant" in error_msg:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Vector database unavailable: {error_msg}. Please ensure Qdrant is running."
        )
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Chat processing failed: {error_msg}"
    )


async def get_chat_history(db, session_id: str) -> list[dict]:
    """Helper to get chat history for a session."""
    messages_row = await db.execute(
        """SELECT role, content FROM messages 
           WHERE session_id = ? ORDER BY created_at ASC LIMIT 20""",
        (session_id,),
    )
    messages = await messages_row.fetchall()
    return [
        {"role": m["role"], "content": m["content"]}
        for m in messages
    ]


class CreateSessionRequest(BaseModel):
    title: Optional[str] = None
    source_ids: Optional[list[str]] = None


class SessionResponse(BaseModel):
    id: str
    title: str
    created_at: str
    source_ids: list[str] = []


class SessionListResponse(BaseModel):
    sessions: list[SessionResponse]


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: str


class MessageListResponse(BaseModel):
    messages: list[MessageResponse]


class ChatRequest(BaseModel):
    message: str
    source_ids: Optional[list[str]] = None
    summarize_mode: Optional[str] = None
    modality_focus: Optional[str] = None
    output_format: Optional[str] = None

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "message": "What is this document about?",
                    "source_ids": None,
                }
            ]
        }

    def __init__(self, **data):
        super().__init__(**data)
        if self.message and len(self.message) > 10000:
            raise ValueError("Message too long. Maximum 10000 characters allowed.")


class ChatResponse(BaseModel):
    message: MessageResponse
    title: str
    answer: str
    extractive_summary: list[str] = []
    citations: list[dict] = []
    follow_ups: list[str] = []
    source_anchors: list[dict] = []
    modality_breakdown: dict = {}
    modality_tags: list[str] = []


@router.post("/sessions", response_model=SessionResponse)
async def create_session(
    request: CreateSessionRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a new chat session."""
    user_id = current_user["id"]
    session_id = str(uuid.uuid4())
    title = request.title or f"Chat {session_id[:8]}"
    
    db = await get_db()
    source_ids_json = ",".join(request.source_ids) if request.source_ids else ""
    
    await db.execute(
        """INSERT INTO sessions (id, user_id, title, source_ids, created_at)
           VALUES (?, ?, ?, ?, datetime('now'))""",
        (session_id, user_id, title, source_ids_json),
    )
    await db.commit()
    
    row = await db.execute(
        "SELECT id, title, source_ids, created_at FROM sessions WHERE id = ?",
        (session_id,),
    )
    session = await row.fetchone()
    
    source_ids_list = session["source_ids"].split(",") if session["source_ids"] else []
    
    return SessionResponse(
        id=session["id"],
        title=session["title"],
        created_at=session["created_at"],
        source_ids=source_ids_list,
    )


@router.get("/sessions", response_model=SessionListResponse)
async def list_sessions(
    current_user: dict = Depends(get_current_user),
):
    """List all chat sessions for the current user."""
    user_id = current_user["id"]
    db = await get_db()
    
    row = await db.execute(
        """SELECT id, title, source_ids, created_at FROM sessions 
           WHERE user_id = ? ORDER BY created_at DESC""",
        (user_id,),
    )
    sessions = await row.fetchall()

    return SessionListResponse(
        sessions=[
            SessionResponse(
                id=s["id"],
                title=s["title"],
                created_at=s["created_at"],
                source_ids=s["source_ids"].split(",") if s["source_ids"] else [],
            )
            for s in sessions
        ]
    )


@router.get("/sessions/{session_id}", response_model=MessageListResponse)
async def get_session_messages(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get messages for a specific session."""
    user_id = current_user["id"]
    db = await get_db()
    
    session_row = await db.execute(
        "SELECT * FROM sessions WHERE id = ? AND user_id = ?",
        (session_id, user_id),
    )
    session = await session_row.fetchone()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    messages_row = await db.execute(
        """SELECT id, role, content, created_at FROM messages 
           WHERE session_id = ? ORDER BY created_at ASC""",
        (session_id,),
    )
    messages = await messages_row.fetchall()
    
    return MessageListResponse(
        messages=[
            MessageResponse(
                id=m["id"],
                role=m["role"],
                content=m["content"],
                created_at=m["created_at"],
            )
            for m in messages
        ]
    )


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a chat session and its messages."""
    user_id = current_user["id"]
    db = await get_db()
    
    session_row = await db.execute(
        "SELECT * FROM sessions WHERE id = ? AND user_id = ?",
        (session_id, user_id),
    )
    session = await session_row.fetchone()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    await db.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
    await db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    await db.commit()
    
    return {"message": "Session deleted successfully"}


@router.post("/sessions/{session_id}", response_model=ChatResponse)
async def send_message(
    session_id: str,
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """Send a message and get a response."""
    user_id = current_user["id"]
    db = await get_db()
    
    session_row = await db.execute(
        "SELECT * FROM sessions WHERE id = ? AND user_id = ?",
        (session_id, user_id),
    )
    session = await session_row.fetchone()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    source_ids = request.source_ids or (session["source_ids"].split(",") if session["source_ids"] else [])
    source_ids = [s for s in source_ids if s]
    
    chat_history = await get_chat_history(db, session_id)
    
    message_id = str(uuid.uuid4())
    await db.execute(
        """INSERT INTO messages (id, session_id, role, content, created_at)
           VALUES (?, ?, ?, ?, datetime('now'))""",
        (message_id, session_id, "user", request.message),
    )
    await db.commit()
    
    # Get the created_at timestamp for the user message
    user_msg_row = await db.execute(
        "SELECT created_at FROM messages WHERE id = ?",
        (message_id,),
    )
    user_msg = await user_msg_row.fetchone()
    user_created_at = user_msg["created_at"] if user_msg else ""
    
    try:
        result = await run_rag_pipeline(
            user_id=user_id,
            session_id=session_id,
            question=request.message,
            source_ids=source_ids,
            chat_history=chat_history,
            summarize_mode=request.summarize_mode,
            modality_focus=request.modality_focus,
            output_format=request.output_format,
        )
    except Exception as e:
        handle_chat_error(str(e))
    title = result.get("title", "Chat Response")
    extractive_summary = result.get("extractive_summary", [])
    context_chunks = result.get("context_chunks", [])
    follow_ups = result.get("follow_ups", [])
    source_anchors = result.get("source_anchors", [])
    modality_breakdown = result.get("modality_breakdown", {})
    modality_tags = result.get("modality_tags", [])
    
    citations = [
        {
            "id": chunk.get("id", f"chunk_{i}"),
            "label": f"Chunk {i+1}",
            "sourceName": chunk.get("source_id", "Unknown"),
            "content": chunk.get("chunk_text", ""),
            "page": chunk.get("page_number"),
            "relevance": int(chunk.get("score", 0) * 100),
        }
        for i, chunk in enumerate(context_chunks)
    ]
    
    assistant_message_id = str(uuid.uuid4())
    await db.execute(
        """INSERT INTO messages (id, session_id, role, content, created_at)
           VALUES (?, ?, ?, ?, datetime('now'))""",
        (assistant_message_id, session_id, "assistant", answer),
    )
    await db.commit()
    
    return ChatResponse(
        message=MessageResponse(
            id=message_id,
            role="user",
            content=request.message,
            created_at=user_created_at,
        ),
        title=title,
        answer=answer,
        extractive_summary=extractive_summary,
        citations=citations,
        follow_ups=follow_ups,
        source_anchors=source_anchors,
        modality_breakdown=modality_breakdown,
        modality_tags=modality_tags,
    )


@router.post("/sessions/{session_id}/stream")
async def send_message_stream(
    session_id: str,
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """Stream chat response token by token via SSE (OpenAI-compatible format)."""
    user_id = current_user["id"]
    db = await get_db()
    
    session_row = await db.execute(
        "SELECT * FROM sessions WHERE id = ? AND user_id = ?",
        (session_id, user_id),
    )
    session = await session_row.fetchone()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    source_ids = request.source_ids or (session["source_ids"].split(",") if session["source_ids"] else [])
    source_ids = [s for s in source_ids if s]
    
    chat_history = await get_chat_history(db, session_id)
    
    await db.execute(
        """INSERT INTO messages (id, session_id, role, content, created_at)
           VALUES (?, ?, ?, ?, datetime('now'))""",
        (str(uuid.uuid4()), session_id, "user", request.message),
    )
    await db.commit()
    
    try:
        result = await run_rag_pipeline(
            user_id=user_id,
            session_id=session_id,
            question=request.message,
            source_ids=source_ids,
            chat_history=chat_history,
            summarize_mode=request.summarize_mode,
            modality_focus=request.modality_focus,
            output_format=request.output_format,
        )
    except Exception as e:
        handle_chat_error(str(e))
    
    context_chunks = result.get("context_chunks", [])
    
    context_text = "\n\n".join(
        f"[Source {i+1}]: {c['chunk_text']}" for i, c in enumerate(context_chunks)
    )
    messages = [{"role": "user", "content": f"Context:\n{context_text}\n\nQuestion: {request.message}"}]
    
    async def event_generator():
        full_response = ""
        async for token_data in ollama_client.chat_stream(messages):
            content = token_data.get("content", "")
            done = token_data.get("done", False)
            
            if content:
                full_response += content
                yield f"data: {json.dumps({'content': content, 'done': False})}\n\n"
            
            if done:
                msg_id = str(uuid.uuid4())
                await db.execute(
                    "INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
                    (msg_id, session_id, "assistant", full_response),
                )
                await db.commit()
                yield f"data: {json.dumps({'content': '', 'done': True})}\n\n"
                break
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")


class TrackFollowUpRequest(BaseModel):
    message_id: str
    original_question: str
    follow_up_clicked: str


@router.post("/track-follow-up")
async def track_follow_up(
    request: TrackFollowUpRequest,
    current_user: dict = Depends(get_current_user),
):
    """Track when a user clicks on a follow-up question."""
    user_id = current_user["id"]
    db = await get_db()
    
    # First get the message and verify ownership through session
    row = await db.execute(
        """SELECT m.session_id, s.user_id FROM messages m 
           JOIN sessions s ON m.session_id = s.id 
           WHERE m.id = ?""",
        (request.message_id,),
    )
    message = await row.fetchone()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )
    
    # Verify user owns this session/message
    if message["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to track this message",
        )
    
    interaction_id = str(uuid.uuid4())
    await db.execute(
        """INSERT INTO follow_up_interactions 
           (id, user_id, session_id, message_id, original_question, follow_up_clicked, clicked_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))""",
        (interaction_id, user_id, message["session_id"], request.message_id, 
         request.original_question, request.follow_up_clicked),
    )
    await db.commit()
    
    return {"message": "Follow-up tracked successfully"}
