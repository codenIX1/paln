# AGENTS.md - Backend Developer Guidelines

## Project Overview

**SourceSync Backend** is a FastAPI-based AI document analysis API that uses:
- **FastAPI** - Web framework
- **LangGraph** - AI workflow orchestration
- **Qdrant** - Vector database for embeddings
- **Ollama** - Local LLM and embeddings
- **SQLite** - Metadata and chat history storage
- **Poetry** - Dependency management

## Tech Stack

| Component | Technology |
|-----------|------------|
| Web Framework | FastAPI 0.109 |
| API Server | Uvicorn |
| Database | SQLite (aiosqlite) |
| Vector DB | Qdrant |
| LLM/Embeddings | Ollama (llama3.2, nomic-embed-text) |
| Orchestration | LangGraph |
| PDF Processing | PyMuPDF |

## Project Structure

```
backend/
├── pyproject.toml           # Poetry config
├── .env                     # Environment variables
├── app/
│   ├── __init__.py
│   ├── config.py            # Settings (Pydantic)
│   ├── db/
│   │   ├── sqlite.py        # Database connection
│   │   └── init_db.py      # Schema creation
│   ├── services/
│   │   ├── qdrant_client.py # Vector DB client
│   │   └── ollama_client.py # LLM client
│   └── graph/
│       ├── __init__.py
│       └── nodes/           # LangGraph nodes
│           └── __init__.py
```

## IMPORTANT: Virtual Environment

**ALWAYS activate the Poetry virtual environment before working on the backend.**

```bash
cd backend
poetry env use "C:\Program Files\Python311\python.exe"  # Set Python version (first time only)
poetry install          # Install dependencies
```

Then run commands inside the venv using `poetry run`:

```bash
poetry run python -c "print('hello')"
poetry run uvicorn app.main:app --reload
```

## Commands

### Development
```bash
cd backend
poetry install          # Install dependencies
poetry run uvicorn app.main:app --reload  # Start server
```

### Environment Variables (.env)
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
```

## Prerequisites

1. **Ollama installed** with models:
   ```bash
   ollama pull llama3.2
   ollama pull nomic-embed-text
   ```

2. **Qdrant** running via Docker:
   ```bash
   docker run -d -p 6333:6333 -p 6334:6334 qdrant/qdrant
   ```

## Python/Backend Conventions

### Async/Await
- Use `async def` for all route handlers
- Use `await` for database and external API calls
- Use `aiosqlite` for async SQLite operations

### Type Hints
- Always define return types for functions
- Use Pydantic models for request/response validation

### Error Handling
- Use try/except with meaningful error messages
- Return appropriate HTTP status codes

### Dependencies
- Managed via Poetry in pyproject.toml
- Always explain new dependencies before adding
