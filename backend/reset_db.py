import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from core.config import settings

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        # Get all tables in public schema
        res = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
        tables = [row[0] for row in res.fetchall()]
        
        print(f"Found {len(tables)} tables to drop.")
        
        for table in tables:
            print(f"Dropping table {table}...")
            await conn.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE'))
            
        print("Database tables reset successfully.")

if __name__ == "__main__":
    asyncio.run(main())
