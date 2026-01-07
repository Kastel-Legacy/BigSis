
import asyncio
import json

async def test_stats_api():
    from core.db.database import AsyncSessionLocal
    from core.db.models import Document, Chunk, Procedure
    from sqlalchemy import select, func
    
    async with AsyncSessionLocal() as session:
        doc_count = await session.scalar(select(func.count()).select_from(Document))
        proc_count = await session.scalar(select(func.count()).select_from(Procedure))
        chunk_count = await session.scalar(select(func.count()).select_from(Chunk))
        
        print(f"Internal Database Check:")
        print(f"Documents: {doc_count}")
        print(f"Procedures: {proc_count}")
        print(f"Chunks: {chunk_count}")

if __name__ == "__main__":
    asyncio.run(test_stats_api())
