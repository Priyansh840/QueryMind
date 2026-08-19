"""
QueryMind - Knowledge Table Migration Script
Safely adds document_id, source_chunk_id, page_number, and metadata_json to public.knowledge table.
"""

import sys
import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from core.config import settings


async def main():
    print("Applying Knowledge schema migration to PostgreSQL...")
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        # 1. Add missing columns safely
        await conn.execute(text("""
            ALTER TABLE public.knowledge 
            ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE;
        """))
        await conn.execute(text("""
            ALTER TABLE public.knowledge 
            ADD COLUMN IF NOT EXISTS source_chunk_id UUID REFERENCES public.document_chunks(id) ON DELETE SET NULL;
        """))
        await conn.execute(text("""
            ALTER TABLE public.knowledge 
            ADD COLUMN IF NOT EXISTS page_number INTEGER;
        """))
        await conn.execute(text("""
            ALTER TABLE public.knowledge 
            ADD COLUMN IF NOT EXISTS metadata_json JSONB;
        """))
        print("  - Columns document_id, source_chunk_id, page_number, metadata_json added/verified.")

        # 2. Add performance indexes for space_id, document_id, user_id, source_chunk_id
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_knowledge_user_id ON public.knowledge(user_id);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_knowledge_space_id ON public.knowledge(space_id);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_knowledge_document_id ON public.knowledge(document_id);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_knowledge_source_chunk_id ON public.knowledge(source_chunk_id);"))
        print("  - Indexes for user_id, space_id, document_id, source_chunk_id created/verified.")

    await engine.dispose()
    print("Knowledge table migration completed successfully 🟢")


if __name__ == "__main__":
    asyncio.run(main())
