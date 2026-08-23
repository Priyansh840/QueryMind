import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from core.config import settings
from database.postgres import Base
import models

async def main():
    print("Creating missing tables...")
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully.")

if __name__ == "__main__":
    asyncio.run(main())
