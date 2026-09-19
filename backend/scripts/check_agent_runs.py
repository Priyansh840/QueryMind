import asyncio
import sys
sys.path.insert(0, '.')
from database.postgres import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("""
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'agent_runs';
        """))
        for row in res.fetchall():
            print("agent_runs col:", row)

if __name__ == "__main__":
    asyncio.run(check())
