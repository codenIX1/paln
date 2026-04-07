"""Background job repository for database operations."""

from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import BackgroundJob


class JobRepository:
    """Repository for BackgroundJob model operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        job_id: str,
        user_id: str,
        job_type: str,
        status: str = "pending",
        job_metadata: Optional[str] = None,
    ) -> BackgroundJob:
        """Create a new background job."""
        job = BackgroundJob(
            id=job_id,
            user_id=user_id,
            job_type=job_type,
            status=status,
            job_metadata=job_metadata,
        )
        self.session.add(job)
        await self.session.flush()
        return job

    async def get_by_id(self, job_id: str) -> Optional[BackgroundJob]:
        """Get job by ID."""
        result = await self.session.execute(
            select(BackgroundJob).where(BackgroundJob.id == job_id)
        )
        return result.scalar_one_or_none()

    async def get_by_id_and_user(self, job_id: str, user_id: str) -> Optional[BackgroundJob]:
        """Get job by ID and user ID."""
        result = await self.session.execute(
            select(BackgroundJob).where(
                BackgroundJob.id == job_id,
                BackgroundJob.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_user_jobs(
        self,
        user_id: str,
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[BackgroundJob]:
        """Get all jobs for a user."""
        query = select(BackgroundJob).where(BackgroundJob.user_id == user_id)
        
        if status:
            query = query.where(BackgroundJob.status == status)
        
        result = await self.session.execute(
            query
            .order_by(BackgroundJob.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def count_user_jobs(
        self,
        user_id: str,
        status: Optional[str] = None,
    ) -> int:
        """Count jobs for a user."""
        query = select(func.count(BackgroundJob.id)).where(BackgroundJob.user_id == user_id)
        
        if status:
            query = query.where(BackgroundJob.status == status)
        
        result = await self.session.execute(query)
        return result.scalar() or 0

    async def update_status(
        self,
        job_id: str,
        status: str,
        progress: Optional[int] = None,
        total: Optional[int] = None,
        result_id: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> bool:
        """Update job status."""
        job = await self.get_by_id(job_id)
        if job:
            job.status = status
            if progress is not None:
                job.progress = progress
            if total is not None:
                job.total = total
            if result_id is not None:
                job.result_id = result_id
            if error_message is not None:
                job.error_message = error_message
            await self.session.flush()
            return True
        return False

    async def delete(self, job_id: str) -> bool:
        """Delete a job."""
        job = await self.get_by_id(job_id)
        if job:
            await self.session.delete(job)
            await self.session.flush()
            return True
        return False

    async def cleanup_stale_jobs(self, status: str = "processing") -> int:
        """Clean up stale jobs (e.g., on server restart)."""
        result = await self.session.execute(
            select(BackgroundJob).where(BackgroundJob.status == status)
        )
        jobs = list(result.scalars().all())
        
        for job in jobs:
            job.status = "failed"
            job.error_message = "Server restarted during processing"
        
        await self.session.flush()
        return len(jobs)