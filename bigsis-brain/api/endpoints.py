from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks
from core.orchestrator import Orchestrator
from api.schemas import AnalyzeRequest, AnalyzeResponse, SocialGenerationRequest, SocialGenerationResponse
import shutil
import tempfile
import os
from core.utils.pdf import extract_text_from_pdf
from core.rag.ingestion import ingest_document
from core.pubmed import ingest_pubmed_results
from core.db.database import AsyncSessionLocal
from core.db.models import SourceDocument, EvidenceChunk
from sqlalchemy.future import select
from sqlalchemy import delete, func
from core.social_agent import SocialAgent
from pydantic import BaseModel

class PubMedRequest(BaseModel):
    query: str

router = APIRouter()
orchestrator = Orchestrator()
social_agent = SocialAgent()

@router.post("/generate/social", response_model=SocialGenerationResponse)
async def generate_social_content(request: SocialGenerationRequest):
    """
    Generate the social media content JSON for a given topic.
    """
    result = await social_agent.generate(request.topic, request.problem)
    return {"data": result}

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_wrinkles(request: AnalyzeRequest):
    try:
        # Convert Pydantic model to dict
        input_data = request.dict()
        session_id = input_data.pop("session_id")
        
        result = await orchestrator.process_request(session_id, input_data)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check():
    return {"status": "ok"}

@router.post("/ingest/pdf")
async def ingest_pdf(file: UploadFile = File(...)):
    temp_file_path = None
    try:
        # Create a temporary file to save the uploaded PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_file_path = temp_file.name

        # Extract text
        content = extract_text_from_pdf(temp_file_path)
        if not content.strip():
             raise HTTPException(status_code=400, detail="Could not extract text from PDF or file is empty")

        # Prepare metadata
        filename = file.filename
        title = filename.replace(".pdf", "").replace("_", " ").title()
        
        metadata = {
            "source": "pdf",
            "filename": filename,
            "original_filename": file.filename
        }

        # Ingest
        await ingest_document(title=title, content=content, metadata=metadata)
        
        return {"status": "success", "message": f"Successfully ingested {filename}"}

    except Exception as e:
        print(f"Error ingesting PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up the temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@router.post("/ingest/pubmed")
async def trigger_pubmed_ingestion(request: PubMedRequest, background_tasks: BackgroundTasks):
    """
    Trigger a background job to search PubMed and ingest results.
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
        
    background_tasks.add_task(ingest_pubmed_results, request.query)
    
    return {"status": "accepted", "message": f"PubMed ingestion started for query: {request.query}"}

@router.get("/knowledge/documents")
async def list_documents():
    """
    List all ingested documents with metadata.
    """
    async with AsyncSessionLocal() as session:
        # Query docs and count chunks
        # This is a bit complex in async SQLAlchemy, keeping it simple for V1:
        # Just fetch docs and let's assume we want to show basic info.
        # Ideally we'd do a join to count chunks.
        
        stmt = select(SourceDocument).order_by(SourceDocument.created_at.desc())
        result = await session.execute(stmt)
        docs = result.scalars().all()
        
        output = []
        for doc in docs:
            # We can do a separate query or lazy load if configured, 
            # but for list view let's just return doc info
            output.append({
                "id": doc.id,
                "title": doc.title,
                "created_at": doc.created_at,
                "version": doc.version,
                "metadata": doc.metadata_json,
                # "chunk_count": ... (omitted for speed in V1)
            })
            
        return output

@router.delete("/knowledge/documents/{doc_id}")
async def delete_document(doc_id: int):
    """
    Delete a document and its associated chunks.
    """
    async with AsyncSessionLocal() as session:
        try:
            # 1. Delete Chunks
            await session.execute(delete(EvidenceChunk).where(EvidenceChunk.document_id == doc_id))
            
            # 2. Delete Document
            await session.execute(delete(SourceDocument).where(SourceDocument.id == doc_id))
            
            await session.commit()
            return {"status": "success", "message": f"Document {doc_id} deleted"}
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=str(e))

@router.get("/knowledge/documents/{doc_id}")
async def get_document(doc_id: int):
    """
    Get a single document and its chunks (content).
    """
    async with AsyncSessionLocal() as session:
        # Fetch Document
        result = await session.execute(select(SourceDocument).where(SourceDocument.id == doc_id))
        doc = result.scalars().first()
        
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
            
        # Fetch Chunks
        result_chunks = await session.execute(select(EvidenceChunk).where(EvidenceChunk.document_id == doc_id).order_by(EvidenceChunk.chunk_index))
        chunks = result_chunks.scalars().all()
        
        return {
            "id": doc.id,
            "title": doc.title,
            "created_at": doc.created_at,
            "metadata": doc.metadata_json,
            "chunks": [{"index": c.chunk_index, "text": c.content_text} for c in chunks]
        }
