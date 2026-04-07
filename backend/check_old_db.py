import aiosqlite
import asyncio

async def check_schema():
    db = await aiosqlite.connect('uploads/paln.db')
    
    tables = ['users', 'sessions', 'messages', 'sources', 'follow_up_interactions', 'background_jobs']
    
    for table in tables:
        print(f"\n=== {table} ===")
        cur = await db.execute(f"PRAGMA table_info({table})")
        cols = await cur.fetchall()
        for col in cols:
            print(f"  {col[1]}: {col[2]}")
    
    await db.close()

asyncio.run(check_schema())