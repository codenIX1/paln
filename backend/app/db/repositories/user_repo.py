"""User repository for database operations."""

from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User


class UserRepository:
    """Repository for User model operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, user_id: str, email: str, password_hash: str) -> User:
        """Create a new user."""
        user = User(
            id=user_id,
            email=email,
            password_hash=password_hash,
        )
        self.session.add(user)
        await self.session.flush()
        return user

    async def get_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def update_password(self, user_id: str, password_hash: str) -> bool:
        """Update user password."""
        user = await self.get_by_id(user_id)
        if user:
            user.password_hash = password_hash
            await self.session.flush()
            return True
        return False

    async def delete(self, user_id: str) -> bool:
        """Delete a user."""
        user = await self.get_by_id(user_id)
        if user:
            await self.session.delete(user)
            await self.session.flush()
            return True
        return False