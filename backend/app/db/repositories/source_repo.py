"""Source repository for database operations."""

from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Source


class SourceRepository:
    """Repository for Source model operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        source_id: str,
        user_id: str,
        name: str,
        type: str,
        media_type: str = "document",
        file_path: Optional[str] = None,
    ) -> Source:
        """Create a new source."""
        source = Source(
            id=source_id,
            user_id=user_id,
            name=name,
            type=type,
            media_type=media_type,
            file_path=file_path,
        )
        self.session.add(source)
        await self.session.flush()
        return source

    async def get_by_id(self, source_id: str) -> Optional[Source]:
        """Get source by ID."""
        result = await self.session.execute(
            select(Source).where(Source.id == source_id)
        )
        return result.scalar_one_or_none()

    async def get_by_id_and_user(self, source_id: str, user_id: str) -> Optional[Source]:
        """Get source by ID and user ID."""
        result = await self.session.execute(
            select(Source).where(
                Source.id == source_id,
                Source.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_user_sources(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Source]:
        """Get all sources for a user."""
        result = await self.session.execute(
            select(Source)
            .where(Source.user_id == user_id)
            .order_by(Source.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def count_user_sources(self, user_id: str) -> int:
        """Count sources for a user."""
        result = await self.session.execute(
            select(func.count(Source.id)).where(Source.user_id == user_id)
        )
        return result.scalar() or 0

    async def update_chunk_count(self, source_id: str, chunk_count: int) -> bool:
        """Update chunk count for a source."""
        source = await self.get_by_id(source_id)
        if source:
            source.chunk_count = chunk_count
            await self.session.flush()
            return True
        return False

    async def delete(self, source_id: str) -> bool:
        """Delete a source."""
        source = await self.get_by_id(source_id)
        if source:
            await self.session.delete(source)
            await self.session.flush()
            return True
        return False