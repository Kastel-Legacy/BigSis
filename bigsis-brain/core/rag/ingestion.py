import hashlib
from typing import List, Optional
from core.db.database import AsyncSessionLocal
from core.db.models import SourceDocument, EvidenceChunk
from core.rag.embeddings import get_embedding
from sqlalchemy.future import select

async def ingest_document(title: str, content: str, url: str = None, metadata: dict = None):
    """
    Ingests a raw text document, chunks it, embeds it, and saves to DB.
    """
    content_hash = hashlib.md5(content.encode("utf-8")).hexdigest()
    
    async with AsyncSessionLocal() as session:
        # Check duplicate
        result = await session.execute(select(SourceDocument).where(SourceDocument.content_hash == content_hash))
        if result.scalars().first():
            print(f"Document '{title}' already exists.")
            return

        # Create Document
        doc = SourceDocument(
            title=title,
            url=url,
            content_hash=content_hash,
            metadata_json=metadata if metadata else {},
            is_published=True
        )
        session.add(doc)
        await session.flush() # get ID

        # Chunking (Naive splitting for V1)
        chunks = split_text(content, chunk_size=500, overlap=50)
        
        evidence_chunks = []
        for i, chunk_text in enumerate(chunks):
            embedding = await get_embedding(chunk_text)
            evidence_chunks.append(EvidenceChunk(
                document_id=doc.id,
                content_text=chunk_text,
                chunk_index=i,
                embedding=embedding
            ))
        
        session.add_all(evidence_chunks)
        await session.commit()
        print(f"Ingested '{title}' with {len(evidence_chunks)} chunks.")

def split_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    # Simple character splitter for now. 
    # TODO: Use recursive splitter or sentence splitter later.
    chunks = []
    start = 0
    text_len = len(text)
    
    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunks.append(text[start:end])
        start += (chunk_size - overlap)
        
    return chunks
