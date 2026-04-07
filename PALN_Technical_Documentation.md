# PALN Project - Complete Technical Documentation

---

## 1. Project Overview

**PALN** (Personal AI Learning Network) is an AI-powered document analysis and chat system that enables users to:
- Upload documents (PDF, TXT, DOCX, images, audio, video)
- Process and chunk content for semantic search
- Chat with their documents using RAG (Retrieval Augmented Generation)
- Track follow-up questions and interactions
- Run background processing for large file uploads

---

## 2. Tech Stack

### Backend
| Component | Technology |
|-----------|------------|
| Web Framework | FastAPI 0.109 |
| Server | Uvicorn |
| Database | SQLite (via SQLAlchemy 2.0 async) |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Vector Database | Qdrant |
| LLM/Embeddings | Ollama (llama3.2, nomic-embed-text) |
| Orchestration | LangGraph |
| PDF Processing | PyMuPDF (fitz) |
| Document Parsing | python-docx |
| OCR | EasyOCR |
| Audio Transcription | Whisper |
| Authentication | JWT (python-jose + passlib) |
| Observability | Opik |

### Frontend
| Component | Technology |
|-----------|------------|
| Framework | Next.js (implied from routes) |
| Auth | NextAuth.js compatible |

### Infrastructure
| Component | Details |
|-----------|---------|
| Database | SQLite (`project_db.db`) |
| Vector Store | Qdrant (localhost:6333) |
| LLM | Ollama (localhost:11434) |

---

## 3. Architecture

### Directory Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI entry point
│   ├── config.py              # Pydantic settings
│   │
│   ├── auth/                  # Authentication
│   │   ├── jwt_handler.py
│   │   ├── models.py
│   │   └── dependencies.py
│   │
│   ├── db/                    # Database layer (NEW - SQLAlchemy)
│   │   ├── __init__.py
│   │   ├── database.py        # Engine & session factory
│   │   ├── models.py          # ORM models (User, Source, Session, Message, etc.)
│   │   ├── repositories/      # Repository pattern
│   │   │   ├── user_repo.py
│   │   │   ├── source_repo.py
│   │   │   ├── session_repo.py
│   │   │   ├── message_repo.py
│   │   │   ├── job_repo.py
│   │   │   └── followup_repo.py
│   │   └── migrations/       # Alembic migrations
│   │       ├── env.py
│   │       └── versions/
│   │
│   ├── routes/               # API endpoints
│   │   ├── auth.py           # /api/auth/*
│   │   ├── sources.py        # /api/sources/*
│   │   ├── chat.py           # /api/chat/*
│   │   ├── admin.py          # /api/admin/*
│   │   └── summarize.py      # /api/summarize/*
│   │
│   ├── services/            # Business logic
│   │   ├── ollama_client.py  # LLM & embedding client
│   │   ├── qdrant_client.py  # Vector DB client
│   │   ├── background_job.py # Async job processing
│   │   ├── document_parser.py
│   │   ├── summarizer.py
│   │   ├── handlers/         # Upload processing
│   │   │   ├── upload_handler.py
│   │   │   ├── embedder.py
│   │   │   ├── chunker.py
│   │   │   ├── cleaner.py
│   │   │   └── __init__.py
│   │   └── extractors/       # Media extractors
│   │       ├── image_extractor.py
│   │       ├── audio_extractor.py
│   │       └── video_extractor.py
│   │
│   └── graph/               # LangGraph RAG pipeline
│       ├── graph.py          # Pipeline definition
│       ├── state.py          # Graph state
│       └── nodes/
│           ├── retrieve.py   # Vector search
│           ├── generate.py  # LLM response
│           └── summarize.py # Summarization
│
├── pyproject.toml            # Poetry dependencies
├── alembic.ini               # Alembic config
└── uploads/                  # Uploaded files & database
    └── project_db.db         # SQLite database
```

---

## 4. API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|-----------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Login & get JWT |
| POST | `/nextauth` | NextAuth-compatible login |
| GET | `/me` | Get current user |

### Sources (`/api/sources`)
| Method | Endpoint | Description |
|--------|-----------|-------------|
| POST | `/` | Upload document (background) |
| POST | `/text` | Upload raw text |
| POST | `/link` | Upload from URL |
| GET | `/` | List user's sources |
| GET | `/{source_id}` | Get source details |
| DELETE | `/{source_id}` | Delete source |
| GET | `/jobs/{job_id}` | Get upload job status |
| GET | `/jobs` | List user jobs |
| GET | `/jobs/{job_id}/stream` | SSE progress stream |

### Chat (`/api/chat`)
| Method | Endpoint | Description |
|--------|-----------|-------------|
| POST | `/sessions` | Create new session |
| GET | `/sessions` | List user's sessions |
| GET | `/sessions/{id}` | Get session messages |
| DELETE | `/sessions/{id}` | Delete session |
| POST | `/sessions/{id}` | Send message |
| POST | `/sessions/{id}/stream` | Stream response |
| POST | `/track-follow-up` | Track follow-up clicks |

### Admin (`/api/admin`)
| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | `/follow-up-stats` | Get follow-up analytics |

### Summarize (`/api/summarize`)
| Method | Endpoint | Description |
|--------|-----------|-------------|
| POST | `/` | Generate summary |

---

## 5. Database Schema

### Tables

```sql
users
├── id (PK)
├── email (UNIQUE)
├── password_hash
└── created_at

sources
├── id (PK)
├── user_id (FK → users.id)
├── name
├── type
├── media_type
├── file_path
├── chunk_count
└── created_at

sessions
├── id (PK)
├── user_id (FK → users.id)
├── source_id (FK → sources.id, nullable)
├── title
├── source_ids (TEXT - comma-separated)
└── created_at

messages
├── id (PK)
├── session_id (FK → sessions.id)
├── role (user/assistant)
├── content
├── citations (JSON)
└── created_at

follow_up_interactions
├── id (PK)
├── user_id (FK → users.id)
├── session_id (FK → sessions.id)
├── message_id
├── original_question
├── follow_up_clicked
└── clicked_at

background_jobs
├── id (PK)
├── user_id (FK → users.id)
├── job_type
├── status (pending/processing/completed/failed)
├── progress
├── total
├── result_id
├── error_message
├── job_metadata (TEXT - JSON)
├── created_at
└── updated_at
```

---

## 6. What Has Been Done

### Phase 1: Initial Setup (Completed)
- [x] FastAPI project structure
- [x] SQLite database with aiosqlite
- [x] Basic auth (JWT)
- [x] Document upload and parsing
- [x] Chunking and embedding
- [x] Qdrant vector storage
- [x] Chat with RAG pipeline

### Phase 2: Performance Optimizations (Completed)
- [x] Embedding caching (global LRU cache)
- [x] Local cache with deduplication in embedder
- [x] Rate limiting on retrieval (semaphore)
- [x] Rate limiting on upload (semaphore)
- [x] Removed duplicate code (`generate_follow_ups`, redundant `search`)

### Phase 3: Background Processing (Completed)
- [x] Async file processing with `asyncio.to_thread()`
- [x] Background job system with status tracking
- [x] SSE progress streaming
- [x] Job retry capability
- [x] Startup cleanup for stale jobs
- [x] Separate DB table for jobs

### Phase 4: SQLAlchemy Migration (Completed)
- [x] Replaced raw SQL with SQLAlchemy 2.0 ORM
- [x] Created ORM models (User, Source, Session, Message, BackgroundJob, FollowUpInteraction)
- [x] Implemented Repository pattern
- [x] Set up Alembic migrations
- [x] Migrated data from old `paln.db` to new `project_db.db`
- [x] Updated all routes to use SQLAlchemy
- [x] Fixed `await get_db()` issues (use `Depends(get_db)`)
- [x] Added missing `source_ids` column to Session model

---

## 7. Key Features

### Embedding & Caching
- **Global cache**: 500 entries LRU in `ollama_client`
- **Local cache**: 200 entries in `Embedder`
- **Deduplication**: Text deduplication before API calls

### Background Processing
- Max 2 concurrent jobs
- Progress tracking (0-100%)
- SSE stream for real-time updates
- Auto-cleanup of stale jobs on restart

### RAG Pipeline
- LangGraph workflow: retrieve → generate/summarize
- Semantic search with Qdrant
- Multi-source search (parallel)
- Modality filtering (text/image/audio)

### Security
- JWT authentication
- User-owned data isolation
- Role-based admin access
- File type validation

---

## 8. Configuration

Environment variables (`.env`):
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_CHAT_MODEL=llama3.2
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_GRPC_PORT=6334
UPLOAD_DIR=./uploads
API_HOST=0.0.0.0
API_PORT=8000
JWT_SECRET=change-me-in-production
DB_NAME=project_db
```

---

## 9. Running the Project

```bash
# Install dependencies
cd backend
poetry install

# Initialize database (creates tables)
poetry run python -c "from app.db.database import init_db; import asyncio; asyncio.run(init_db())"

# Migrate existing data (if upgrading)
poetry run python migrate_data.py

# Start server
poetry run uvicorn app.main:app --reload
```

---

## 10. Known Issues / TODOs

| Priority | Issue | Status |
|----------|-------|--------|
| Medium | Streaming endpoint bypasses RAG pipeline | Not fixed |
| Low | No query result caching | Not implemented |
| Low | No fusion logic (RRF hybrid search) | Not implemented |
| Low | Structured logging | Basic only |

---

## 11. Future Enhancements

1. **Query Result Caching** - Cache RAG results for repeated questions
2. **Fusion Search** - Implement RRF (Reciprocal Rank Fusion) for better recall
3. **Cross-encoder Reranking** - Improve retrieval quality
4. **Structured Logging** - Move beyond print statements
5. **Metrics/Observability** - Add monitoring
6. **Celery Migration** - For true background workers (if needed)

---

*Document generated: April 2026*
*Project: PALN - Personal AI Learning Network*