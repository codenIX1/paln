# PALN (Personal AI Learning Network) - Project Documentation

## 1. Introduction / Objectives of the Project

### 1.1 Project Overview
PALN (Personal AI Learning Network), also known as SourceSync, is a multimodal document analysis and summarization system that enables users to upload various document types (PDF, DOCX, images, audio, video) and receive AI-powered answers, summaries, and insights.

### 1.2 Objectives
- **Multimodal Input Support**: Accept and process PDF, DOCX, images, audio, and video files
- **Intelligent Summarization**: Generate extractive and abstractive summaries from uploaded content
- **Conversational Interface**: Enable users to ask questions about their documents using natural language
- **Context-Aware Responses**: Provide accurate answers based on retrieved document context
- **Source Citation**: Track and display sources for generated responses
- **Follow-up Suggestions**: Generate relevant follow-up questions for deeper exploration
- **Session Management**: Maintain chat history with per-session sources isolation

### 1.3 Key Features
- User authentication (register/login)
- Document upload with automatic embedding
- Vector-based semantic search using Qdrant
- Streaming responses via Server-Sent Events (SSE)
- Session-based chat history
- Confidence scoring for retrieved chunks
- Rate limiting for embedder parallel requests
- Stop generation capability for long-running requests

---

## 2. System Analysis

### 2.1 Architecture Overview
The system follows a client-server architecture with:

**Frontend (Next.js 16)**
- Pages: Landing, Login, Register, Dashboard, Chats, Admin
- Components: ChatPane, Sidebar, ContextViewer, UploadModal, SessionCard
- State management: React useState/useRef

**Backend (FastAPI)**
- REST API endpoints for authentication, sources, chat, admin
- LangGraph-based RAG pipeline (retrieve → generate → summarize)
- Ollama integration for embeddings and chat

**Database & Storage**
- SQLite: User data, sessions, messages, sources metadata
- Qdrant: Vector storage for document embeddings
- Local filesystem: Uploaded file storage

### 2.2 Data Flow
1. User uploads document → Backend extracts text/chunks → Embedder generates vectors → Stored in Qdrant
2. User asks question → Retrieve node finds relevant chunks → Generate node creates response
3. Response streamed to frontend via SSE → Displayed in ChatPane

### 2.3 Key Modules

**Backend Modules:**
| Module | Purpose |
|--------|---------|
| `app/routes/auth.py` | User registration, login, JWT token generation |
| `app/routes/sources.py` | Document upload, listing, deletion |
| `app/routes/chat.py` | Message handling, SSE streaming, session management |
| `app/routes/summarize.py` | Dedicated summarization endpoint |
| `app/routes/admin.py` | Analytics and tracking |
| `app/services/ollama_client.py` | Ollama API wrapper, embedding cache |
| `app/services/qdrant_client.py` | Vector search operations |
| `app/services/summarizer.py` | Summary generation with composite scoring |
| `app/services/document_parser.py` | Text extraction from various formats |
| `app/services/handlers/embedder.py` | Embedding generation with rate limiting |
| `app/graph/nodes/retrieve.py` | Semantic retrieval from vector DB |
| `app/graph/nodes/generate.py` | Answer generation from context |

---

## 3. Feasibility Study

### 3.1 Technical Feasibility
- **COMPLETED**: All core features implemented
- Next.js 16 + FastAPI are well-supported frameworks
- Ollama provides free local LLM inference
- Qdrant offers efficient vector search

### 3.2 Operational Feasibility
- **COMPLETED**: Application runs locally
- No external API dependencies (all local)
- Simple deployment with Docker Compose

### 3.3 Economic Feasibility
- **COMPLETED**: Open-source components only
- No licensing costs
- Requires local GPU/CPU for Ollama

### 3.4 Schedule Feasibility
- **COMPLETED**: Core development finished
- Remaining: Testing, documentation, deployment

---

## 4. Software and Hardware Requirement Specifications

### 4.1 Software Requirements

**Frontend:**
```
- Node.js 18+
- Next.js 16.x
- React 19.x
- TypeScript 6.x
- Tailwind CSS 4.x
- next-auth 4.x
- lucide-react (icons)
```

**Backend:**
```
- Python 3.11+
- FastAPI 0.109+
- LangGraph 0.2+
- Qdrant Client 1.7+
- PyMuPDF 1.23+
- python-docx 1.1+
- whisper 1.0+
- Pillow 10.0+
- aiosqlite 0.19+
```

**External Services:**
```
- Ollama (local) - LLM and embeddings
- Qdrant (local) - Vector database
```

### 4.2 Hardware Requirements

**Minimum:**
- CPU: 4 cores
- RAM: 8 GB
- Storage: 20 GB
- GPU: Optional (for faster inference)

**Recommended:**
- CPU: 8+ cores
- RAM: 16 GB
- Storage: 50 GB SSD
- GPU: NVIDIA 8GB+ VRAM (for Ollama models)

---

## 5. System Design

### 5.1 Database Schema

**SQLite Tables:**
```sql
-- Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Session sources junction table
CREATE TABLE session_sources (
    session_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    PRIMARY KEY (session_id, source_id)
);

-- Sources table
CREATE TABLE sources (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    modality TEXT,
    file_path TEXT,
    content_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Messages table
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    title TEXT,
    extractive_summary TEXT,
    citations TEXT,
    follow_ups TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Follow-up tracking table
CREATE TABLE follow_ups (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    original_question TEXT NOT NULL,
    follow_up_clicked TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5.2 API Endpoints

**Authentication:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (returns JWT)

**Sources:**
- `POST /api/sources/upload` - Upload document
- `GET /api/sources` - List user sources
- `DELETE /api/sources/{id}` - Delete source

**Chat:**
- `GET /api/chat/sessions` - List user sessions
- `POST /api/chat/sessions` - Create session
- `GET /api/chat/sessions/{id}` - Get session details
- `GET /api/chat/sessions/{id}/messages` - Get session messages
- `POST /api/chat/sessions/{id}/messages` - Send message (non-streaming)
- `POST /api/chat/sessions/{id}/stream` - Send message (SSE streaming)
- `DELETE /api/chat/sessions/{id}` - Delete session
- `POST /api/chat/track-follow-up` - Track follow-up clicks

**Summarize:**
- `POST /api/summarize` - Generate document summary

**Admin:**
- `GET /api/admin/analytics` - Get usage analytics
- `GET /api/admin/follow-ups` - Get follow-up tracking data

### 5.3 RAG Pipeline Design

```
User Query
    ↓
[Retrieve Node] → Qdrant semantic search (top 3 chunks per source)
    ↓
[Generate Node] → Ollama LLM with context + question
    ↓
[Summarize Node] → Extract key points, generate follow-ups
    ↓
Response + Citations + Follow-ups → Frontend
```

---

## 6. Coding

### 6.1 Project Structure

```
paln/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── config.py            # Settings management
│   │   ├── auth/                # Authentication modules
│   │   ├── db/                  # Database initialization
│   │   ├── routes/              # API route handlers
│   │   ├── services/            # Business logic
│   │   │   ├── ollama_client.py
│   │   │   ├── qdrant_client.py
│   │   │   ├── summarizer.py
│   │   │   └── handlers/
│   │   │       ├── embedder.py
│   │   │       ├── chunker.py
│   │   │       └── upload_handler.py
│   │   └── graph/               # LangGraph pipeline
│   │       ├── graph.py
│   │       └── nodes/
│   └── pyproject.toml
│
├── paln-app/
│   ├── src/
│   │   ├── app/                 # Next.js pages
│   │   │   ├── page.tsx         # Landing page
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── dashboard/
│   │   │   ├── chats/
│   │   │   └── admin/
│   │   ├── components/          # React components
│   │   │   ├── ChatPane.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ContextViewer.tsx
│   │   │   ├── UploadModal.tsx
│   │   │   └── SessionCard.tsx
│   │   └── lib/
│   │       └── api.ts           # API client
│   ├── package.json
│   └── tailwind.config.ts
│
└── README.md
```

### 6.2 Key Implementation Details

**Embedding Cache (ollama_client.py):**
- Uses OrderedDict for LRU cache
- Cache size: 1000 entries
- Cache key: MD5 hash of (model + text)

**Rate Limiting (embedder.py):**
- Semaphore-based concurrency control
- Max 5 concurrent embedding requests
- Batch size: 10 texts per batch

**Composite Scoring (summarizer.py):**
```
_composite_score = Qdrant_score × segment_weight × confidence
```
- Segment weights: paragraph=0.8, heading=1.0, list=0.6
- Confidence from OCR (0-1)

**SSE Streaming (chat.py):**
- OpenAI-compatible format
- Token-by-token streaming
- Automatic message persistence on completion

---

## 7. Validation Checks

### 7.1 Input Validation

| Field | Validation |
|-------|------------|
| Email | Pydantic email format |
| Password | Minimum 6 characters |
| Message | Maximum 10000 characters |
| File Upload | Size limit: 50MB |
| Source IDs | Must belong to user |

### 7.2 Authentication Validation
- JWT token expiration: 7 days
- Token passed in Authorization header
- User ID verified for all endpoints

### 7.3 Error Handling
- Try/catch around all async operations
- User-friendly error messages
- Fallback to non-streaming on SSE failure

---

## 8. Implementation and Maintenance

### 8.1 Implementation Status

**Completed:**
- ✅ User authentication (register/login)
- ✅ Document upload (PDF, DOCX, images, audio, video)
- ✅ Text extraction and chunking
- ✅ Embedding generation with rate limiting
- ✅ Vector storage in Qdrant
- ✅ Semantic retrieval
- ✅ LLM response generation
- ✅ SSE streaming
- ✅ Session management
- ✅ Follow-up tracking
- ✅ Summarization endpoint

### 8.2 Maintenance Plan
- Regular dependency updates (npm audit, poetry update)
- Database backup strategy
- Log monitoring
- Performance profiling

### 8.3 Future Enhancements
- Database indexing for query optimization
- Migration system for schema changes
- User settings/preferences
- Export functionality
- Multi-language support

---

## 9. Testing

### 9.1 Testing Techniques

| Technique | Application |
|-----------|-------------|
| Unit Testing | Individual function validation |
| Integration Testing | API endpoint testing |
| Manual Testing | Frontend UI flow |
| Error Handling | Exception paths |

### 9.2 Testing Strategies

**Backend Testing:**
- Manual API testing with curl/Postman
- Type checking with mypy
- Linting with ruff

**Frontend Testing:**
- TypeScript type checking
- ESLint validation

### 9.3 Test Data

**Test Users:**
```
Email: test@example.com
Password: test123
```

**Test Documents:**
- PDF files with text
- DOCX files with paragraphs
- Images with text (for OCR)
- Audio files (for transcription)

### 9.4 Known Issues and Fixes

| Issue | Fix |
|-------|-----|
| Empty created_at in chat response | Fetch from DB after insert |
| SSL verify=False in upload | Changed to verify=True |
| Missing user_id check in track_follow_up | Added user validation |
| Duplicate error handling | Extracted to helper functions |
| Cache eviction bug | Implemented proper LRU with move_to_end |
| N+1 query in retrieve | Reduced limit from 5 to 3 per source |
| No rate limiting on embedder | Added asyncio.Semaphore |

---

## 10. Conclusion

PALN (SourceSync) is a fully functional multimodal document analysis system with:
- Complete authentication flow
- Document processing pipeline
- RAG-based question answering
- Session management
- Analytics tracking

The system is ready for deployment with local Ollama and Qdrant services.
