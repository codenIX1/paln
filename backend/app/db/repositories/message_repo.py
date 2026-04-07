"""Message repository for database operations."""

from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Message


class MessageRepository:
    """Repository for Message model operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        message_id: str,
        session_id: str,
        role: str,
        content: str,
        citations: Optional[str] = None,
    ) -> Message:
        """Create a new message."""
        message = Message(
            id=message_id,
            session_id=session_id,
            role=role,
            content=content,
            citations=citations,
        )
        self.session.add(message)
        await self.session.flush()
        return message

    async def get_by_id(self, message_id: str) -> Optional[Message]:
        """Get message by ID."""
        result = await self.session.execute(
            select(Message).where(Message.id == message_id)
        )
        return result.scalar_one_or_none()

    async def get_session_messages(
        self,
        session_id: str,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Message]:
        """Get all messages for a session."""
        result = await self.session.execute(
            select(Message)
            .where(Message.session_id == session_id)
            .order_by(Message.created_at.asc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def count_session_messages(self, session_id: str) -> int:
        """Count messages in a session."""
        result = await self.session.execute(
            select(func.count(Message.id)).where(Message.session_id == session_id)
        )
        return result.scalar() or 0

    async def delete(self, message_id: str) -> bool:
        """Delete a message."""
        message = await self.get_by_id(message_id)
        if message:
            await self.session.delete(message)
            await self.session.flush()
            return True
        return False

    async def get_session_message_count(self, session_id: str) -> int:
        """Get total message count for session."""
        return await self.count_session_messages(session_id)