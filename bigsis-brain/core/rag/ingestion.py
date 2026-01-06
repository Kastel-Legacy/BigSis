from sqlalchemy.future import select
from core.db.database import AsyncSessionLocal
from core.db.models import Source, Document, DocumentVersion, Chunk
from core.llm.embeddings import get_embedding
from langchain.text_splitter import RecursiveCharacterTextSplitter
import hashlib

async def ingest_document(title: str, content: str, metadata: dict):
    """
    Ingests a document into the V2 Database Schema:
    Source -> Document -> DocumentVersion -> Chunks
    """
    async with AsyncSessionLocal() as session:
        # 1. Start Transaction
        async with session.begin():
            # 2. Get or Create Source
            source_name = metadata.get("source", "Unknown")
            result = await session.execute(select(Source).where(Source.name == source_name))
            source_obj = result.scalars().first()
            if not source_obj:
                source_obj = Source(name=source_name, source_type="internal")
                session.add(source_obj)
                await session.flush() # get ID

            # 3. Get or Create Document (by external_id)
            # Use filename or title as pseudo-external-id for now if not provided
            ext_id = metadata.get("filename") or metadata.get("url") or hashlib.md5(title.encode()).hexdigest()
            ext_type = "file" if metadata.get("filename") else ("url" if metadata.get("url") else "internal")

            result = await session.execute(select(Document).where(Document.external_id == ext_id))
            doc_obj = result.scalars().first()
            
            if not doc_obj:
                doc_obj = Document(
                    source_id=source_obj.id,
                    external_type=ext_type,
                    external_id=ext_id,
                    title=title,
                    doc_type="paper" # Default
                )
                session.add(doc_obj)
                await session.flush()

            # 4. Create Document Version (Always new version for V1 simplicity? Or increment?)
            # For this impl, we'll check if a version exists and increment
            result = await session.execute(
                select(DocumentVersion).where(DocumentVersion.document_id == doc_obj.id).order_by(DocumentVersion.version_no.desc())
            )
            latest_version = result.scalars().first()
            new_version_no = (latest_version.version_no + 1) if latest_version else 1
            
            content_hash = hashlib.sha256(content.encode()).hexdigest()
            
            version_obj = DocumentVersion(
                document_id=doc_obj.id,
                version_no=new_version_no,
                status="published", # Auto-publish for now
                content_hash=content_hash,
                extracted_text=content
            )
            session.add(version_obj)
            await session.flush()

            # 5. Chunking
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            chunks_text = text_splitter.split_text(content)

            for i, chunk_text in enumerate(chunks_text):
                embedding = await get_embedding(chunk_text)
                chunk_obj = Chunk(
                    document_version_id=version_obj.id,
                    chunk_no=i+1,
                    text=chunk_text,
                    text_hash=hashlib.sha256(chunk_text.encode()).hexdigest(),
                    embedding=embedding
                )
                session.add(chunk_obj)

            print(f"Ingested {title} (v{new_version_no}) with {len(chunks_text)} chunks.")
