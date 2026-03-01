import os
import shutil
import tempfile
import logging
import asyncio
import time
import uuid
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy import select, func, delete

from core.auth import AuthUser, require_admin
from core.db.database import AsyncSessionLocal
from core.db.models import Document, DocumentVersion, Chunk, Procedure, SocialGeneration, Source
from core.utils.pdf import extract_text_from_pdf
from core.rag.ingestion import ingest_document
from core.pubmed import ingest_pubmed_results
from core.semantic_scholar import ingest_semantic_results
from core.sources.openfda import get_fda_adverse_events
from core.sources.clinical import get_ongoing_trials
from core.sources.pubchem import get_chemical_safety
from core.sources.crossref import get_crossref_studies, ingest_crossref_results

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory progress tracker for batch operations
_batch_jobs: Dict[str, dict] = {}


# =============================================
# REQUEST SCHEMAS
# =============================================

class PubMedRequest(BaseModel):
    query: str

class SemanticRequest(BaseModel):
    query: str

class ProcedureCreate(BaseModel):
    name: str
    description: str
    downtime: str
    price_range: str
    tags: list[str] = []

class ProcedureUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    downtime: str | None = None
    price_range: str | None = None
    category: str | None = None
    tags: list[str] | None = None

class BatchIngestRequest(BaseModel):
    queries: list[str]
    sources: list[str] = ["pubmed", "semantic", "crossref"]  # which sources to query
    delay_seconds: int = 5  # delay between each query

class BatchFicheRequest(BaseModel):
    topics: list[str]
    delay_seconds: int = 10  # delay between each fiche generation


# =============================================
# STATS
# =============================================

@router.get("/knowledge/stats")
async def get_knowledge_stats():
    """Returns real stats about the Brain's knowledge base."""
    async with AsyncSessionLocal() as session:
        doc_count = (await session.execute(select(func.count(Document.id)))).scalar() or 0
        proc_count = (await session.execute(select(func.count(Procedure.id)))).scalar() or 0
        chunk_count = (await session.execute(select(func.count(Chunk.id)))).scalar() or 0

        fiches_res = await session.execute(
            select(SocialGeneration)
            .filter(SocialGeneration.topic.like("[SOCIAL]%"))
            .limit(100)
        )
        fiches = fiches_res.scalars().all()

        trs_scores = []
        sources_count = 0
        zones_distribution: Dict[str, int] = {}
        for g in fiches:
            content = g.content if isinstance(g.content, dict) else {}
            em = content.get("evidence_metadata", {})
            if em.get("trs_score") is not None:
                trs_scores.append(em["trs_score"])
            sources_count += len(content.get("annexe_sources_retenues", []))
            for z in (content.get("meta") or {}).get("zones_concernees", []):
                zones_distribution[z] = zones_distribution.get(z, 0) + 1

        def _score(value, target):
            return min(100, round((value / target) * 100)) if target > 0 else 0

        radar_data = [
            {"subject": "Etudes", "A": _score(doc_count, 50), "fullMark": 100},
            {"subject": "Procedures", "A": _score(proc_count, 20), "fullMark": 100},
            {"subject": "Fragments", "A": _score(chunk_count, 500), "fullMark": 100},
            {"subject": "Fiches", "A": _score(len(fiches), 30), "fullMark": 100},
            {"subject": "Sources", "A": _score(sources_count, 100), "fullMark": 100},
            {"subject": "Zones", "A": _score(len(zones_distribution), 8), "fullMark": 100},
        ]

        return {
            "documents_read": doc_count,
            "procedures_indexed": proc_count,
            "chunks_indexed": chunk_count,
            "fiches_generated": len(fiches),
            "avg_trs_score": round(sum(trs_scores) / len(trs_scores)) if trs_scores else None,
            "total_sources_cited": sources_count,
            "zones_distribution": zones_distribution,
            "radar_data": radar_data,
            "status": "Online",
            "v": "3.0"
        }


# =============================================
# DOCUMENTS CRUD
# =============================================

@router.get("/knowledge/documents")
async def list_documents():
    """List all ingested documents with real source names."""
    async with AsyncSessionLocal() as session:
        stmt = select(Document, Source.name.label("source_name")).outerjoin(
            Source, Document.source_id == Source.id
        ).order_by(Document.created_at.desc())
        result = await session.execute(stmt)
        rows = result.all()
        return [
            {
                "id": str(doc.id),
                "title": doc.title,
                "created_at": doc.created_at,
                "metadata": {"type": doc.external_type, "source": source_name or "Unknown"}
            }
            for doc, source_name in rows
        ]


@router.get("/knowledge/documents/{doc_id}")
async def get_document(doc_id: str):
    """Get a single document and its chunks."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Document).where(Document.id == doc_id))
        doc = result.scalars().first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        result_ver = await session.execute(
            select(DocumentVersion)
            .where(DocumentVersion.document_id == doc.id)
            .order_by(DocumentVersion.version_no.desc())
        )
        version = result_ver.scalars().first()

        chunks_data = []
        if version:
            result_chunks = await session.execute(
                select(Chunk)
                .where(Chunk.document_version_id == version.id)
                .order_by(Chunk.chunk_no)
            )
            chunks = result_chunks.scalars().all()
            chunks_data = [{"index": c.chunk_no, "text": c.text} for c in chunks]

        return {
            "id": str(doc.id),
            "title": doc.title,
            "created_at": doc.created_at,
            "metadata": {"type": doc.external_type},
            "chunks": chunks_data
        }


@router.delete("/knowledge/documents/{doc_id}")
async def delete_document(doc_id: str, admin: AuthUser = Depends(require_admin)):
    """Delete a document (cascade deletes versions/chunks). Admin only."""
    async with AsyncSessionLocal() as session:
        try:
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


# =============================================
# INGESTION
# =============================================

@router.post("/ingest/pdf")
async def ingest_pdf(file: UploadFile = File(...), admin: AuthUser = Depends(require_admin)):
    """Ingest a PDF into the knowledge base. Admin only."""
    temp_file_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_file_path = temp_file.name

        content = extract_text_from_pdf(temp_file_path)
        if not content.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF or file is empty")

        filename = file.filename
        title = filename.replace(".pdf", "").replace("_", " ").title()
        metadata = {
            "source": "pdf",
            "filename": filename,
            "original_filename": file.filename
        }
        await ingest_document(title=title, content=content, metadata=metadata)
        return {"status": "success", "message": f"Successfully ingested {filename}"}

    except Exception as e:
        logger.error(f"Error ingesting PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)


@router.post("/ingest/pubmed")
async def trigger_pubmed_ingestion(request: PubMedRequest, background_tasks: BackgroundTasks, admin: AuthUser = Depends(require_admin)):
    """Trigger background PubMed search and ingestion. Admin only."""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    background_tasks.add_task(ingest_pubmed_results, request.query)
    return {"status": "accepted", "message": f"PubMed ingestion started for query: {request.query}"}


@router.post("/ingest/semantic")
async def trigger_semantic_ingestion(request: SemanticRequest, background_tasks: BackgroundTasks, admin: AuthUser = Depends(require_admin)):
    """Trigger background Semantic Scholar search and ingestion. Admin only."""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    background_tasks.add_task(ingest_semantic_results, request.query)
    return {"status": "accepted", "message": f"Semantic Scholar ingestion started for query: {request.query}"}


# =============================================
# PROCEDURES
# =============================================

@router.post("/knowledge/procedures")
async def create_procedure(proc: ProcedureCreate, admin: AuthUser = Depends(require_admin)):
    """Adds a new medical procedure to the Knowledge Base. Admin only."""
    from core.rag.embeddings import get_embedding
    async with AsyncSessionLocal() as session:
        embedding = await get_embedding(proc.name)
        new_proc = Procedure(
            name=proc.name,
            description=proc.description,
            downtime=proc.downtime,
            price_range=proc.price_range,
            tags=proc.tags,
            embedding=embedding,
        )
        session.add(new_proc)
        await session.commit()
        return {"status": "created", "name": new_proc.name}


@router.get("/knowledge/procedures")
async def list_procedures():
    """List all medical procedures in the Knowledge Base."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Procedure).order_by(Procedure.name))
        return result.scalars().all()


@router.patch("/knowledge/procedures/{proc_id}")
async def update_procedure(proc_id: str, updates: ProcedureUpdate, admin: AuthUser = Depends(require_admin)):
    """Update a procedure in the Knowledge Base. Admin only."""
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(select(Procedure).where(Procedure.id == proc_id))
            proc = result.scalars().first()
            if not proc:
                raise HTTPException(status_code=404, detail="Procedure not found")
            for field, value in updates.dict(exclude_unset=True).items():
                setattr(proc, field, value)
            await session.commit()
            await session.refresh(proc)
            return {"status": "updated", "name": proc.name}
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=str(e))


@router.delete("/knowledge/procedures/{proc_id}")
async def delete_procedure(proc_id: str, admin: AuthUser = Depends(require_admin)):
    """Delete a procedure from the Knowledge Base. Admin only."""
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(select(Procedure).where(Procedure.id == proc_id))
            proc = result.scalars().first()
            if not proc:
                raise HTTPException(status_code=404, detail="Procedure not found")
            name = proc.name
            await session.delete(proc)
            await session.commit()
            return {"status": "success", "message": f"Procedure '{name}' deleted"}
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=str(e))


# =============================================
# SCOUT TEST ENDPOINTS (read-only, no ingestion)
# =============================================

class ScoutRequest(BaseModel):
    query: str

@router.post("/scout/fda")
async def test_fda(request: ScoutRequest, admin: AuthUser = Depends(require_admin)):
    """Test OpenFDA adverse events lookup. Admin only."""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    try:
        result = get_fda_adverse_events(request.query)
        return {"source": "OpenFDA", "query": request.query, "result": result}
    except Exception as e:
        return {"source": "OpenFDA", "query": request.query, "error": str(e)}

@router.post("/scout/trials")
async def test_trials(request: ScoutRequest, admin: AuthUser = Depends(require_admin)):
    """Test ClinicalTrials.gov lookup. Admin only."""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    try:
        result = get_ongoing_trials(request.query)
        return {"source": "ClinicalTrials.gov", "query": request.query, "result": result}
    except Exception as e:
        return {"source": "ClinicalTrials.gov", "query": request.query, "error": str(e)}

@router.post("/scout/pubchem")
async def test_pubchem(request: ScoutRequest, admin: AuthUser = Depends(require_admin)):
    """Test PubChem chemical safety lookup. Admin only."""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    try:
        result = get_chemical_safety(request.query)
        return {"source": "PubChem", "query": request.query, "result": result}
    except Exception as e:
        return {"source": "PubChem", "query": request.query, "error": str(e)}

@router.post("/scout/crossref")
async def test_crossref(request: ScoutRequest, admin: AuthUser = Depends(require_admin)):
    """Test CrossRef article search. Admin only."""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    try:
        studies = get_crossref_studies(request.query)
        return {"source": "CrossRef", "query": request.query, "count": len(studies), "results": studies}
    except Exception as e:
        return {"source": "CrossRef", "query": request.query, "error": str(e)}


# =============================================
# BATCH INGESTION (rate-limit safe)
# =============================================

async def _run_batch_ingest(job_id: str, queries: list, sources: list, delay: int):
    """Background task: ingest queries one by one with delays."""
    job = _batch_jobs[job_id]
    job["status"] = "running"
    job["started_at"] = time.time()

    for i, query in enumerate(queries):
        if job.get("cancelled"):
            job["status"] = "cancelled"
            return
        job["current_index"] = i
        job["current_query"] = query
        job["progress"] = f"{i + 1}/{len(queries)}"

        try:
            if "pubmed" in sources:
                logger.info(f"[BATCH {job_id}] PubMed ingesting: {query}")
                count = await ingest_pubmed_results(query)
                job["results"].append({"query": query, "source": "pubmed", "count": count or 0})
                await asyncio.sleep(delay)

            if "semantic" in sources:
                logger.info(f"[BATCH {job_id}] Semantic Scholar ingesting: {query}")
                count = await ingest_semantic_results(query)
                job["results"].append({"query": query, "source": "semantic", "count": count or 0})
                await asyncio.sleep(delay)

            if "crossref" in sources:
                logger.info(f"[BATCH {job_id}] CrossRef ingesting: {query}")
                count = await ingest_crossref_results(query)
                job["results"].append({"query": query, "source": "crossref", "count": count or 0})
                await asyncio.sleep(delay)
        except Exception as e:
            logger.error(f"[BATCH {job_id}] Error on query '{query}': {e}")
            job["results"].append({"query": query, "error": str(e)})

    job["status"] = "completed"
    job["completed_at"] = time.time()
    total = sum(r.get("count", 0) for r in job["results"])
    job["total_ingested"] = total
    logger.info(f"[BATCH {job_id}] Completed: {total} documents ingested from {len(queries)} queries")


async def _run_batch_fiches(job_id: str, topics: list, delay: int):
    """Background task: generate fiches one by one with delays."""
    from core.social.generator import SocialContentGenerator
    from core.prompts import APP_SYSTEM_PROMPT

    job = _batch_jobs[job_id]
    job["status"] = "running"
    job["started_at"] = time.time()
    gen = SocialContentGenerator()

    for i, topic in enumerate(topics):
        if job.get("cancelled"):
            job["status"] = "cancelled"
            return
        job["current_index"] = i
        job["current_query"] = topic
        job["progress"] = f"{i + 1}/{len(topics)}"

        try:
            cache_topic = f"[SOCIAL] {topic}"
            logger.info(f"[BATCH-FICHE {job_id}] Generating: {cache_topic}")
            result = await gen.generate_social_content(cache_topic, system_prompt=APP_SYSTEM_PROMPT, force=True)
            has_error = isinstance(result, dict) and "error" in result
            job["results"].append({
                "topic": topic,
                "status": "error" if has_error else "ok",
                "error": result.get("error") if has_error else None,
            })
        except Exception as e:
            logger.error(f"[BATCH-FICHE {job_id}] Error on '{topic}': {e}")
            job["results"].append({"topic": topic, "status": "error", "error": str(e)})

        if i < len(topics) - 1:
            await asyncio.sleep(delay)

    job["status"] = "completed"
    job["completed_at"] = time.time()
    ok_count = sum(1 for r in job["results"] if r.get("status") == "ok")
    job["total_generated"] = ok_count
    logger.info(f"[BATCH-FICHE {job_id}] Completed: {ok_count}/{len(topics)} fiches generated")


@router.post("/knowledge/batch-ingest")
async def start_batch_ingest(
    request: BatchIngestRequest,
    background_tasks: BackgroundTasks,
    admin: AuthUser = Depends(require_admin),
):
    """Start batch ingestion of multiple queries with built-in delays. Admin only."""
    if not request.queries:
        raise HTTPException(status_code=400, detail="Queries list cannot be empty")

    job_id = str(uuid.uuid4())[:8]
    _batch_jobs[job_id] = {
        "type": "ingest",
        "status": "pending",
        "total": len(request.queries),
        "queries": request.queries,
        "sources": request.sources,
        "delay": request.delay_seconds,
        "current_index": 0,
        "current_query": "",
        "progress": f"0/{len(request.queries)}",
        "results": [],
        "created_at": time.time(),
    }
    background_tasks.add_task(_run_batch_ingest, job_id, request.queries, request.sources, request.delay_seconds)
    return {"status": "accepted", "job_id": job_id, "total_queries": len(request.queries)}


@router.post("/knowledge/batch-fiches")
async def start_batch_fiches(
    request: BatchFicheRequest,
    background_tasks: BackgroundTasks,
    admin: AuthUser = Depends(require_admin),
):
    """Start batch fiche generation with built-in delays. Admin only."""
    if not request.topics:
        raise HTTPException(status_code=400, detail="Topics list cannot be empty")

    job_id = str(uuid.uuid4())[:8]
    _batch_jobs[job_id] = {
        "type": "fiches",
        "status": "pending",
        "total": len(request.topics),
        "topics": request.topics,
        "delay": request.delay_seconds,
        "current_index": 0,
        "current_query": "",
        "progress": f"0/{len(request.topics)}",
        "results": [],
        "created_at": time.time(),
    }
    background_tasks.add_task(_run_batch_fiches, job_id, request.topics, request.delay_seconds)
    return {"status": "accepted", "job_id": job_id, "total_topics": len(request.topics)}


@router.get("/knowledge/batch-status/{job_id}")
async def get_batch_status(job_id: str):
    """Poll the status of a batch job."""
    job = _batch_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "job_id": job_id,
        "type": job["type"],
        "status": job["status"],
        "progress": job["progress"],
        "current": job.get("current_query", ""),
        "total": job["total"],
        "results": job["results"],
        "total_ingested": job.get("total_ingested"),
        "total_generated": job.get("total_generated"),
    }


@router.post("/knowledge/batch-cancel/{job_id}")
async def cancel_batch_job(job_id: str, admin: AuthUser = Depends(require_admin)):
    """Cancel a running batch job. Admin only."""
    job = _batch_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] != "running":
        return {"status": "already_done", "job_status": job["status"]}
    job["cancelled"] = True
    return {"status": "cancelling", "job_id": job_id}


# =============================================
# ADMIN RESET ENDPOINTS
# =============================================

@router.delete("/admin/reset/knowledge")
async def reset_knowledge(admin: AuthUser = Depends(require_admin)):
    """Wipe all knowledge base data (documents, chunks, sources). Admin only."""
    async with AsyncSessionLocal() as session:
        try:
            # Order matters: chunks -> doc_scope_map -> versions -> documents -> sources
            await session.execute(delete(Chunk))
            await session.execute(delete(DocumentVersion))
            await session.execute(delete(Document))
            await session.execute(delete(Source))
            await session.commit()

            logger.info(f"[ADMIN RESET] Knowledge base wiped by {admin.email}")
            return {"status": "success", "message": "Knowledge base reset: all documents, chunks and sources deleted."}
        except Exception as e:
            await session.rollback()
            logger.error(f"[ADMIN RESET] Knowledge reset failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))


@router.delete("/admin/reset/fiches")
async def reset_fiches(admin: AuthUser = Depends(require_admin)):
    """Wipe all generated fiches (social_generations). Admin only."""
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(delete(SocialGeneration))
            deleted = result.rowcount
            await session.commit()

            logger.info(f"[ADMIN RESET] {deleted} fiches wiped by {admin.email}")
            return {"status": "success", "message": f"{deleted} fiches deleted.", "count": deleted}
        except Exception as e:
            await session.rollback()
            logger.error(f"[ADMIN RESET] Fiches reset failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))
