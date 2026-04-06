"""SQLite database connection and operations."""

import aiosqlite
from pathlib import Path
from typing import Optional

from app.config import get_settings


class Database:
    """Async SQLite database connection manager."""

    _instance: Optional["Database"] = None
    _connection: Optional[aiosqlite.Connection] = None

    def __new__(cls) -> "Database":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def connect(self) -> aiosqlite.Connection:
        """Connect to the SQLite database."""
        settings = get_settings()
        
        db_path = settings.upload_dir / "paln.db"
        db_path.parent.mkdir(parents=True, exist_ok=True)

        if self._connection is None:
            self._connection = await aiosqlite.connect(str(db_path))
            self._connection.row_factory = aiosqlite.Row

        return self._connection

    async def disconnect(self) -> None:
        """Close the database connection."""
        if self._connection is not None:
            await self._connection.close()
            self._connection = None

    async def get_connection(self) -> aiosqlite.Connection:
        """Get the database connection, creating if needed."""
        if self._connection is None:
            await self.connect()
        return self._connection


db = Database()


async def get_db() -> aiosqlite.Connection:
    """Dependency to get database connection."""
    return await db.get_connection()
