import asyncio
from rag.retriever import retrieve_context

async def run():
    res = await retrieve_context('test', 'eea9d3bc-d38e-4abd-ae29-14878860e8af', 'e788c2a5-6234-4697-9d6e-886f6f4d00bd')
    print(f'FOUND: {len(res)} chunks')
    for r in res:
        print(f"SCORE: {r.get('score')}, CONTENT: {r.get('content')[:50]}")

if __name__ == "__main__":
    asyncio.run(run())
