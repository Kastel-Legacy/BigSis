from typing import List, Tuple
from sqlalchemy import select, text
from core.db.database import AsyncSessionLocal
from core.db.models import EvidenceChunk, SourceDocument
from core.rag.embeddings import get_embedding

async def retrieve_evidence(query: str, limit: int = 3, threshold: float = 0.7) -> List[dict]:
    """
    Retrieves most similar chunks to the query.
    Returns a list of dicts with content, score, and source metadata.
    """
    query_embedding = await get_embedding(query)
    
    async with AsyncSessionLocal() as session:
        # Cosine distance operator (<=>).
        # We want similarity, so we order by distance ASC.
        # pgvector l2_distance (<->) or cosine_distance (<=>). 
        # Ada-002 is normalized, so dot product and cosine are similar, but usually <=> is safest for cosine.
        stmt = select(EvidenceChunk, SourceDocument).join(SourceDocument)\
            .order_by(EvidenceChunk.embedding.cosine_distance(query_embedding))\
            .limit(limit)
            
        result = await session.execute(stmt)
        
        results = []
        for chunk, doc in result:
            # Re-calculate similarity? Or just trust the order.
            # pgvector doesn't return score easily in ORM sort, unless we select it explicitly.
            # For V1, we just return the top K.
            
            results.append({
                "text": chunk.content_text,
                "source": doc.title,
                "url": doc.url,
                "chunk_id": chunk.id
                # "score": ... (Left for optimization)
            })
            
        return results
