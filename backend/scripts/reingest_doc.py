import asyncio
import uuid
from database.postgres import async_session
from models.knowledge import Document
from rag.ingestion import IngestionEngine

async def main():
    async with async_session() as db:
        doc = await db.get(Document, uuid.UUID("bc4203f0-fb70-4b94-a237-a21b41f40d61"))
        if not doc:
            print("Document not found!")
            return
        print(f"Re-ingesting doc: {doc.title}, file_url={doc.file_url}")
        engine = IngestionEngine()
        await engine.run_ingestion(
            document_id=str(doc.id),
            file_path=doc.file_url,
            filename=doc.title,
            content_type="application/pdf",
            user_id=str(doc.user_id) if hasattr(doc, 'user_id') and doc.user_id else "3cca0a89-39b3-4408-a060-fa433b9d49c1",
            space_id=str(doc.space_id),
        )
    async with async_session() as db:
        doc = await db.get(Document, uuid.UUID("bc4203f0-fb70-4b94-a237-a21b41f40d61"))
        print(f"Final status: {doc.status}, error: {doc.error_message}")

if __name__ == "__main__":
    asyncio.run(main())
