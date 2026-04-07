import asyncio
import aiosqlite

async def add_source_ids_column():
    """Add source_ids column to sessions table."""
    db_path = "uploads/project_db.db"
    
    async with aiosqlite.connect(db_path) as db:
        try:
            await db.execute("ALTER TABLE sessions ADD COLUMN source_ids TEXT")
            await db.commit()
            print("Added source_ids column to sessions table!")
        except Exception as e:
            print(f"Column may already exist: {e}")

asyncio.run(add_source_ids_column())