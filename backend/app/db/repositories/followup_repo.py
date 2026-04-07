"""Follow-up interaction repository for database operations."""

from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import FollowUpInteraction


class FollowUpRepository:
    """Repository for FollowUpInteraction model operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        interaction_id: str,
        user_id: str,
        session_id: str,
        message_id: str,
        original_question: str,
        follow_up_clicked: str,
    ) -> FollowUpInteraction:
        """Create a new follow-up interaction."""
        interaction = FollowUpInteraction(
            id=interaction_id,
            user_id=user_id,
            session_id=session_id,
            message_id=message_id,
            original_question=original_question,
            follow_up_clicked=follow_up_clicked,
        )
        self.session.add(interaction)
        await self.session.flush()
        return interaction

    async def get_by_id(self, interaction_id: str) -> Optional[FollowUpInteraction]:
        """Get follow-up interaction by ID."""
        result = await self.session.execute(
            select(FollowUpInteraction).where(FollowUpInteraction.id == interaction_id)
        )
        return result.scalar_one_or_none()

    async def get_user_interactions(
        self,
        user_id: str,
        limit: int = 100,
        offset: int = 0,
    ) -> list[FollowUpInteraction]:
        """Get all follow-up interactions for a user."""
        result = await self.session.execute(
            select(FollowUpInteraction)
            .where(FollowUpInteraction.user_id == user_id)
            .order_by(FollowUpInteraction.clicked_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def count_user_interactions(self, user_id: str) -> int:
        """Count follow-up interactions for a user."""
        result = await self.session.execute(
            select(func.count(FollowUpInteraction.id)).where(FollowUpInteraction.user_id == user_id)
        )
        return result.scalar() or 0

    async def get_follow_up_stats(self, user_id: str) -> dict:
        """Get follow-up click statistics."""
        result = await self.session.execute(
            select(FollowUpInteraction).where(FollowUpInteraction.user_id == user_id)
        )
        interactions = list(result.scalars().all())
        
        total_clicks = len(interactions)
        unique_questions = len(set(i.original_question for i in interactions))
        unique_follow_ups = len(set(i.follow_up_clicked for i in interactions))
        
        return {
            "total_clicks": total_clicks,
            "unique_questions": unique_questions,
            "unique_follow_ups": unique_follow_ups,
            "interactions": interactions,
        }