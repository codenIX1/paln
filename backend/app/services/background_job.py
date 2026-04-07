"""Background job service for async processing."""

import asyncio
import uuid
from enum import Enum
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import async_session_factory, get_db
from app.db.repositories import JobRepository
from app.services.handlers import UploadHandler


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class JobType(str, Enum):
    UPLOAD = "upload"
    REINDEX = "reindex"


class BackgroundJobService:
    """Manages background job processing."""

    _upload_handler = UploadHandler()
    _running_jobs: dict[str, asyncio.Task] = {}
    _max_concurrent = 2

    async def create_job(
        self,
        user_id: str,
        job_type: str,
        metadata: Optional[dict] = None,
    ) -> str:
        """Create a new background job."""
        job_id = str(uuid.uuid4())
        
        async with async_session_factory() as session:
            job_repo = JobRepository(session)
            await job_repo.create(
                job_id=job_id,
                user_id=user_id,
                job_type=job_type,
                status=JobStatus.PENDING.value,
                job_metadata=str(metadata) if metadata else None,
            )
            await session.commit()
        
        return job_id

    async def update_job_status(
        self,
        job_id: str,
        status: JobStatus,
        progress: int = 0,
        total: int = 100,
        result_id: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> None:
        """Update job status."""
        async with async_session_factory() as session:
            job_repo = JobRepository(session)
            await job_repo.update_status(
                job_id=job_id,
                status=status.value,
                progress=progress,
                total=total,
                result_id=result_id,
                error_message=error_message,
            )
            await session.commit()

    async def get_job(self, job_id: str, user_id: str) -> Optional[dict]:
        """Get job details."""
        async with async_session_factory() as session:
            job_repo = JobRepository(session)
            job = await job_repo.get_by_id_and_user(job_id, user_id)
            
            if job:
                return {
                    "id": job.id,
                    "user_id": job.user_id,
                    "job_type": job.job_type,
                    "status": job.status,
                    "progress": job.progress,
                    "total": job.total,
                    "result_id": job.result_id,
                    "error_message": job.error_message,
                    "metadata": job.job_metadata,
                    "created_at": str(job.created_at),
                    "updated_at": str(job.updated_at),
                }
            return None

    async def get_user_jobs(
        self,
        user_id: str,
        status: Optional[JobStatus] = None,
        limit: int = 20,
    ) -> list[dict]:
        """Get all jobs for a user."""
        async with async_session_factory() as session:
            job_repo = JobRepository(session)
            jobs = await job_repo.get_user_jobs(
                user_id=user_id,
                status=status.value if status else None,
                limit=limit,
            )
            
            return [
                {
                    "id": job.id,
                    "user_id": job.user_id,
                    "job_type": job.job_type,
                    "status": job.status,
                    "progress": job.progress,
                    "total": job.total,
                    "result_id": job.result_id,
                    "error_message": job.error_message,
                    "created_at": str(job.created_at),
                }
                for job in jobs
            ]

    async def process_upload_job(
        self,
        job_id: str,
        file_content: bytes,
        filename: str,
        user_id: str,
    ) -> None:
        """Process upload in background with progress updates."""
        try:
            await self.update_job_status(
                job_id, JobStatus.PROCESSING, progress=10, total=100
            )

            await self.update_job_status(
                job_id, JobStatus.PROCESSING, progress=20, total=100
            )

            result = await self._upload_handler.process_file_async(
                file_content=file_content,
                filename=filename,
                user_id=user_id,
                progress_callback=lambda p: asyncio.create_task(
                    self.update_job_status(job_id, JobStatus.PROCESSING, progress=p + 20, total=100)
                ),
            )

            await self.update_job_status(
                job_id,
                JobStatus.COMPLETED,
                progress=100,
                total=100,
                result_id=result.id,
            )

        except Exception as e:
            await self.update_job_status(
                job_id,
                JobStatus.FAILED,
                error_message=str(e),
            )
            raise

    async def start_job(self, job_id: str, file_content: bytes, filename: str, user_id: str) -> None:
        """Start a background job."""
        if len(self._running_jobs) >= self._max_concurrent:
            raise RuntimeError("Too many jobs running. Please wait.")

        task = asyncio.create_task(
            self.process_upload_job(job_id, file_content, filename, user_id)
        )
        self._running_jobs[job_id] = task

        task.add_done_callback(
            lambda t: self._running_jobs.pop(job_id, None)
        )

    async def cancel_job(self, job_id: str) -> bool:
        """Cancel a running job."""
        task = self._running_jobs.get(job_id)
        if task:
            task.cancel()
            await self.update_job_status(
                job_id, JobStatus.FAILED, error_message="Cancelled by user"
            )
            return True
        return False

    async def retry_job(self, job_id: str, user_id: str) -> Optional[str]:
        """Retry a failed job."""
        job = await self.get_job(job_id, user_id)
        
        if not job:
            return None
        
        if job["status"] != JobStatus.FAILED.value:
            return None
        
        import json
        try:
            metadata = json.loads(job["metadata"]) if job.get("metadata") else {}
        except:
            metadata = {}
        
        if job["job_type"] == JobType.UPLOAD.value:
            new_job_id = await self.create_job(
                user_id=user_id,
                job_type=JobType.UPLOAD.value,
                metadata={"retry_of": job_id, **metadata},
            )
            return new_job_id
        
        return None


job_service = BackgroundJobService()