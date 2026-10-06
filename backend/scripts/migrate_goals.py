import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from database.postgres import async_session
from sqlalchemy import text

async def main():
    async with async_session() as s:
        await s.execute(text("ALTER TABLE goals ADD COLUMN IF NOT EXISTS tasks JSONB DEFAULT '[]'::jsonb;"))
        await s.execute(text("ALTER TABLE goals ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'career';"))
        await s.execute(text("ALTER TABLE goals ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium';"))
        await s.execute(text("ALTER TABLE goals ADD COLUMN IF NOT EXISTS target_date VARCHAR(50);"))
        await s.commit()
        print("Goals table columns migrated successfully!")

if __name__ == "__main__":
    asyncio.run(main())
