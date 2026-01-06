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
from core.db.models import Source, Document, DocumentVersion, Chunk
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
    List all ingested documents (showing latest version info).
    """
    async with AsyncSessionLocal() as session:
        stmt = select(Document).order_by(Document.created_at.desc())
        result = await session.execute(stmt)
        docs = result.scalars().all()
        
        output = []
        for doc in docs:
            # For V1 compat, we return basic info. 
            # Ideally we join with latest version to get status etc.
            output.append({
                "id": str(doc.id), # UUID to string
                "title": doc.title,
                "created_at": doc.created_at,
                "metadata": {"type": doc.external_type, "source_id": str(doc.source_id)}
            })
            
        return output

@router.delete("/knowledge/documents/{doc_id}")
async def delete_document(doc_id: str): # UUID string
    """
    Delete a document and provided (cascade deletes versions/chunks).
    """
    async with AsyncSessionLocal() as session:
        try:
            # Cascade delete handle by SQLAlchemy rel
            stmt = select(Document).where(Document.id == doc_id)
            result = await session.execute(stmt)
            doc = result.scalars().first()
            
            if not doc:
                 raise HTTPException(status_code=404, detail="Document not found")

            await session.delete(doc)
            await session.commit()
            return {"status": "success", "message": f"Document {doc_id} deleted"}
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=str(e))

@router.get("/knowledge/documents/{doc_id}")
async def get_document(doc_id: str): # UUID string
    """
    Get a single document and its chunks (content of latest version).
    """
    async with AsyncSessionLocal() as session:
        # Fetch Document
        result = await session.execute(select(Document).where(Document.id == doc_id))
        doc = result.scalars().first()
        
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
            
        # Fetch Latest Version
        result_ver = await session.execute(
            select(DocumentVersion).where(DocumentVersion.document_id == doc.id).order_by(DocumentVersion.version_no.desc())
        )
        version = result_ver.scalars().first()
        
        chunks_data = []
        if version:
             # Fetch Chunks of that version
            result_chunks = await session.execute(select(Chunk).where(Chunk.document_version_id == version.id).order_by(Chunk.chunk_no))
            chunks = result_chunks.scalars().all()
            chunks_data = [{"index": c.chunk_no, "text": c.text} for c in chunks]
        
        return {
            "id": str(doc.id),
            "title": doc.title,
            "created_at": doc.created_at,
            "metadata": {"type": doc.external_type},
            "chunks": chunks_data
        }
