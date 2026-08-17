import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from database.config import settings

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
        tables = [row[0] for row in res.fetchall()]
        print("TABLES:", tables)

if __name__ == "__main__":
    asyncio.run(main())
