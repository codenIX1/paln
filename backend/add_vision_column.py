"""Quick script to add vision_description column to sources table."""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "uploads" / "project_db.db"

def add_column():
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    # Check if column exists
    cursor.execute("PRAGMA table_info(sources)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if "vision_description" not in columns:
        cursor.execute("ALTER TABLE sources ADD COLUMN vision_description TEXT")
        conn.commit()
        print("Added vision_description column to sources table")
    else:
        print("vision_description column already exists")
    
    conn.close()

if __name__ == "__main__":
    add_column()
