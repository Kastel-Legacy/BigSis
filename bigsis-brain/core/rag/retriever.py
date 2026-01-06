from typing import List, Tuple
from sqlalchemy import select
from core.db.database import AsyncSessionLocal
from core.db.models import Chunk, DocumentVersion, Document
from core.rag.embeddings import get_embedding

async def retrieve_evidence(query: str, limit: int = 3, threshold: float = 0.7) -> List[dict]:
    """
    Retrieves most similar chunks to the query.
    Returns a list of dicts with content, score, and source metadata.
    """
    query_embedding = await get_embedding(query)
    
    async with AsyncSessionLocal() as session:
        # Join Chunk -> Version -> Document
        # We use explicit joins.
        stmt = select(Chunk, Document).join(
            DocumentVersion, Chunk.document_version_id == DocumentVersion.id
        ).join(
            Document, DocumentVersion.document_id == Document.id
        ).order_by(
            Chunk.embedding.cosine_distance(query_embedding)
        ).limit(limit)
            
        result = await session.execute(stmt)
        
        results = []
        for chunk, doc in result:
            results.append({
                "text": chunk.text,
                "source": doc.title,
                "url": doc.external_id if doc.external_type == 'url' else None,
                "chunk_id": str(chunk.id),
                "source_type": doc.doc_type
            })
            
        return results
