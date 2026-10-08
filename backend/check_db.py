import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from core.config import settings
from database.postgres import Base
import models

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE goals ADD COLUMN IF NOT EXISTS document_ids JSONB DEFAULT '[]'::jsonb;"))
        print("Successfully added document_ids to goals table.")

if __name__ == "__main__":
    asyncio.run(main())

