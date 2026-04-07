"""Chat routes - session and message management."""

import json
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.db.repositories import SessionRepository, MessageRepository
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


async def get_chat_history(db: AsyncSession, session_id: str) -> list[dict]:
    """Helper to get chat history for a session."""
    from app.db.models import Message
    result = await db.execute(
        select(Message).where(Message.session_id == session_id).order_by(Message.created_at.asc()).limit(20)
    )
    messages = result.scalars().all()
    return [
        {"role": m.role, "content": m.content}
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
    db: AsyncSession = Depends(get_db),
):
    """Create a new chat session."""
    user_id = current_user["id"]
    session_id = str(uuid.uuid4())
    title = request.title or f"Chat {session_id[:8]}"
    
    source_ids_json = ",".join(request.source_ids) if request.source_ids else ""
    
    from app.db.models import Session
    session = Session(
        id=session_id,
        user_id=user_id,
        title=title,
        source_ids=source_ids_json,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    source_ids_list = session.source_ids.split(",") if session.source_ids else []
    
    return SessionResponse(
        id=session.id,
        title=session.title,
        created_at=str(session.created_at),
        source_ids=source_ids_list,
    )


@router.get("/sessions", response_model=SessionListResponse)
async def list_sessions(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all chat sessions for the current user."""
    user_id = current_user["id"]
    
    from app.db.models import Session
    result = await db.execute(
        select(Session).where(Session.user_id == user_id).order_by(Session.created_at.desc())
    )
    sessions = result.scalars().all()

    return SessionListResponse(
        sessions=[
            SessionResponse(
                id=s.id,
                title=s.title,
                created_at=str(s.created_at),
                source_ids=s.source_ids.split(",") if s.source_ids else [],
            )
            for s in sessions
        ]
    )


@router.get("/sessions/{session_id}", response_model=MessageListResponse)
async def get_session_messages(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get messages for a specific session."""
    user_id = current_user["id"]
    
    from app.db.models import Session
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == user_id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    from app.db.models import Message
    msg_result = await db.execute(
        select(Message).where(Message.session_id == session_id).order_by(Message.created_at.asc())
    )
    messages = msg_result.scalars().all()
    
    return MessageListResponse(
        messages=[
            MessageResponse(
                id=m.id,
                role=m.role,
                content=m.content,
                created_at=str(m.created_at),
            )
            for m in messages
        ]
    )


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a chat session and its messages."""
    user_id = current_user["id"]
    
    from app.db.models import Session
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == user_id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    from app.db.models import Message
    await db.execute(
        select(Message).where(Message.session_id == session_id)
    )
    await db.execute(
        select(Session).where(Session.id == session_id)
    )
    await db.commit()
    
    return {"message": "Session deleted successfully"}


@router.post("/sessions/{session_id}", response_model=ChatResponse)
async def send_message(
    session_id: str,
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message and get a response."""
    user_id = current_user["id"]
    
    from app.db.models import Session
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == user_id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    source_ids = request.source_ids or (session.source_ids.split(",") if session.source_ids else [])
    source_ids = [s for s in source_ids if s]
    
    chat_history = await get_chat_history(db, session_id)
    
    message_id = str(uuid.uuid4())
    from app.db.models import Message
    user_msg = Message(
        id=message_id,
        session_id=session_id,
        role="user",
        content=request.message,
    )
    db.add(user_msg)
    await db.commit()
    await db.refresh(user_msg)
    user_created_at = str(user_msg.created_at)
    
    try:
        rag_result = await run_rag_pipeline(
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
    
    title = rag_result.get("title", "Chat Response")
    answer = rag_result.get("answer", "")
    extractive_summary = rag_result.get("extractive_summary", [])
    context_chunks = rag_result.get("context_chunks", [])
    follow_ups = rag_result.get("follow_ups", [])
    source_anchors = rag_result.get("source_anchors", [])
    modality_breakdown = rag_result.get("modality_breakdown", {})
    modality_tags = rag_result.get("modality_tags", [])
    
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
    assistant_msg = Message(
        id=assistant_message_id,
        session_id=session_id,
        role="assistant",
        content=answer,
    )
    db.add(assistant_msg)
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
    db: AsyncSession = Depends(get_db),
):
    """Stream chat response token by token via SSE (OpenAI-compatible format)."""
    user_id = current_user["id"]
    
    from app.db.models import Session
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == user_id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    source_ids = request.source_ids or (session.source_ids.split(",") if session.source_ids else [])
    source_ids = [s for s in source_ids if s]
    
    chat_history = await get_chat_history(db, session_id)
    
    from app.db.models import Message
    user_msg = Message(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role="user",
        content=request.message,
    )
    db.add(user_msg)
    await db.commit()
    
    try:
        rag_result = await run_rag_pipeline(
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
    
    context_chunks = rag_result.get("context_chunks", [])
    
    # Guard: if no context found, don't let Ollama hallucinate from general knowledge
    if not context_chunks:
        no_ctx_msg = "⚠️ No relevant context found. Please select at least one document source before asking a question."
        async def empty_generator():
            yield f"data: {json.dumps({'content': no_ctx_msg, 'done': False})}\n\n"
            yield f"data: {json.dumps({'content': '', 'done': True})}\n\n"
        return StreamingResponse(empty_generator(), media_type="text/event-stream")
    
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
                assistant_msg = Message(
                    id=msg_id,
                    session_id=session_id,
                    role="assistant",
                    content=full_response,
                )
                db.add(assistant_msg)
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
    db: AsyncSession = Depends(get_db),
):
    """Track when a user clicks on a follow-up question."""
    user_id = current_user["id"]
    
    from app.db.models import Message, Session
    msg_result = await db.execute(
        select(Message).where(Message.id == request.message_id)
    )
    message = msg_result.scalar_one_or_none()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )
    
    session_result = await db.execute(
        select(Session).where(Session.id == message.session_id)
    )
    session = session_result.scalar_one_or_none()
    
    if session.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to track this message",
        )
    
    from app.db.models import FollowUpInteraction
    interaction = FollowUpInteraction(
        id=str(uuid.uuid4()),
        user_id=user_id,
        session_id=message.session_id,
        message_id=request.message_id,
        original_question=request.original_question,
        follow_up_clicked=request.follow_up_clicked,
    )
    db.add(interaction)
    await db.commit()
    
    return {"message": "Follow-up tracked successfully"}