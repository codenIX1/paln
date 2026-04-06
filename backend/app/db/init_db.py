"""Database initialization and schema creation."""

from app.db.sqlite import db


async def init_tables() -> None:
    """Initialize database tables."""
    conn = await db.connect()
    
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT,
            source_ids TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS sources (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            media_type TEXT DEFAULT 'document',
            file_path TEXT,
            chunk_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            citations TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        )
    """)
    
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS follow_up_interactions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            session_id TEXT NOT NULL,
            message_id TEXT NOT NULL,
            original_question TEXT NOT NULL,
            follow_up_clicked TEXT NOT NULL,
            clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    await conn.commit()
    
    await _create_indexes(conn)
    await _migrate_sources_media_type(conn)


async def _create_indexes(conn) -> None:
    """Create indexes for better query performance."""
    indexes = [
        ("idx_sessions_user_id", "sessions", "user_id"),
        ("idx_sessions_created_at", "sessions", "created_at"),
        ("idx_sources_user_id", "sources", "user_id"),
        ("idx_sources_created_at", "sources", "created_at"),
        ("idx_messages_session_id", "messages", "session_id"),
        ("idx_messages_created_at", "messages", "created_at"),
        ("idx_follow_up_user_id", "follow_up_interactions", "user_id"),
        ("idx_follow_up_clicked_at", "follow_up_interactions", "clicked_at"),
    ]
    
    for idx_name, table, column in indexes:
        try:
            await conn.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table} ({column})")
        except Exception:
            pass
    
    await conn.commit()


async def _migrate_sources_media_type(conn) -> None:
    """Add media_type column if it doesn't exist."""
    try:
        await conn.execute("ALTER TABLE sources ADD COLUMN media_type TEXT DEFAULT 'document'")
        await conn.commit()
    except Exception:
        pass


async def drop_tables() -> None:
    """Drop all tables (for testing)."""
    conn = await db.get_connection()
    await conn.execute("DROP TABLE IF EXISTS messages")
    await conn.execute("DROP TABLE IF EXISTS sources")
    await conn.commit()
