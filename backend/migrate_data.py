"""Migration script to copy data from old paln.db to new project_db.db"""

import asyncio
import aiosqlite
from pathlib import Path


async def migrate_data():
    """Copy all data from old database to new database."""
    
    old_db_path = Path("./uploads/paln.db")
    new_db_path = Path("./uploads/project_db.db")
    
    if not old_db_path.exists():
        print("Old database not found. Starting fresh.")
        return
    
    print(f"Migrating data from {old_db_path} to {new_db_path}")
    
    async with aiosqlite.connect(old_db_path) as old_db:
        async with aiosqlite.connect(new_db_path) as new_db:
            
            await migrate_table(old_db, new_db, "users", [
                "id", "email", "password_hash", "created_at"
            ])
            
            await migrate_table(old_db, new_db, "sources", [
                "id", "user_id", "name", "type", "file_path", "chunk_count", "created_at", "media_type"
            ])
            
            await migrate_table(old_db, new_db, "sessions", [
                "id", "user_id", "title", "source_ids", "created_at"
            ])
            
            await migrate_table(old_db, new_db, "messages", [
                "id", "session_id", "role", "content", "citations", "created_at"
            ])
            
            await migrate_table(old_db, new_db, "follow_up_interactions", [
                "id", "user_id", "session_id", "message_id", "original_question", "follow_up_clicked", "clicked_at"
            ])
            
            print("Migration complete!")


async def migrate_table(old_db: aiosqlite.Connection, new_db: aiosqlite.Connection, table: str, columns: list[str]):
    """Migrate a single table."""
    cols_str = ", ".join(columns)
    
    cursor = await old_db.execute(f"SELECT {cols_str} FROM {table}")
    rows = await cursor.fetchall()
    
    if not rows:
        print(f"No data to migrate for {table}")
        return
    
    placeholders = ", ".join(["?" for _ in columns])
    insert_sql = f"INSERT OR IGNORE INTO {table} ({cols_str}) VALUES ({placeholders})"
    
    for row in rows:
        try:
            await new_db.execute(insert_sql, row)
        except Exception as e:
            print(f"Error inserting into {table}: {e}")
    
    print(f"Migrated {len(rows)} rows to {table}")


if __name__ == "__main__":
    asyncio.run(migrate_data())