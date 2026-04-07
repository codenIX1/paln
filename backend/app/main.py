"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db.database import init_db, close_db
from app.db.repositories import JobRepository
from app.db.database import async_session_factory
from app.routes import auth, sources, chat, admin, summarize
from app.services.qdrant_client import qdrant_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    
    await init_db()
    
    try:
        await qdrant_db.create_collection()
    except Exception as e:
        print(f"Warning: Could not initialize Qdrant: {e}")
    
    try:
        async with async_session_factory() as session:
            job_repo = JobRepository(session)
            cleaned = await job_repo.cleanup_stale_jobs()
            if cleaned > 0:
                print(f"Cleaned up {cleaned} stale jobs")
            await session.commit()
    except Exception as e:
        print(f"Warning: Could not cleanup stale jobs: {e}")
    
    yield
    
    await close_db()


app = FastAPI(
    title="PALN API",
    description="AI-powered document analysis API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/")
async def root():
    return {"message": "PALN API is running"}


app.include_router(auth.router)
app.include_router(sources.router)
app.include_router(chat.router)
app.include_router(admin.router)
app.include_router(summarize.router)
