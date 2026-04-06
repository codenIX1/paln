"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db.init_db import init_tables
from app.db.sqlite import db
from app.routes import auth, sources, chat, admin, summarize
from app.services.qdrant_client import qdrant_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    
    await db.connect()
    await init_tables()
    
    try:
        await qdrant_db.create_collection()
    except Exception as e:
        print(f"Warning: Could not initialize Qdrant: {e}")
    
    yield
    
    await db.disconnect()


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
