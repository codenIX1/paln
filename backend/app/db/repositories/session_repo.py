"""Session repository for database operations."""

from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Session


class SessionRepository:
    """Repository for Session model operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        session_id: str,
        user_id: str,
        source_id: Optional[str] = None,
        title: Optional[str] = None,
    ) -> Session:
        """Create a new session."""
        session = Session(
            id=session_id,
            user_id=user_id,
            source_id=source_id,
            title=title,
        )
        self.session.add(session)
        await self.session.flush()
        return session

    async def get_by_id(self, session_id: str) -> Optional[Session]:
        """Get session by ID."""
        result = await self.session.execute(
            select(Session).where(Session.id == session_id)
        )
        return result.scalar_one_or_none()

    async def get_by_id_and_user(self, session_id: str, user_id: str) -> Optional[Session]:
        """Get session by ID and user ID."""
        result = await self.session.execute(
            select(Session).where(
                Session.id == session_id,
                Session.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_user_sessions(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Session]:
        """Get all sessions for a user."""
        result = await self.session.execute(
            select(Session)
            .where(Session.user_id == user_id)
            .order_by(Session.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def count_user_sessions(self, user_id: str) -> int:
        """Count sessions for a user."""
        result = await self.session.execute(
            select(func.count(Session.id)).where(Session.user_id == user_id)
        )
        return result.scalar() or 0

    async def update_title(self, session_id: str, title: str) -> bool:
        """Update session title."""
        session = await self.get_by_id(session_id)
        if session:
            session.title = title
            await self.session.flush()
            return True
        return False

    async def delete(self, session_id: str) -> bool:
        """Delete a session."""
        session = await self.get_by_id(session_id)
        if session:
            await self.session.delete(session)
            await self.session.flush()
            return True
        return False