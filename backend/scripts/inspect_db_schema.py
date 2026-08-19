"""
QueryMind - Inspect Schema for Step 4
"""
import sys
import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from core.config import settings

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.connect() as conn:
        for table in ["documents", "document_chunks", "knowledge", "memories"]:
            res = await conn.execute(text(f"""
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = '{table}'
                ORDER BY ordinal_position;
            """))
            print(f"\n--- TABLE: {table} ---")
            for row in res.fetchall():
                print(f"  {row[0]:20s} {row[1]:20s} nullable={row[2]}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
