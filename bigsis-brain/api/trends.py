"""
Trends API - Discover, evaluate, approve, and learn trending topics.
"""

import asyncio
import logging
import time
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, List, Optional
from sqlalchemy import select, func

from core.auth import AuthUser, require_admin
from core.db.database import AsyncSessionLocal
from core.db.models import TrendTopic, SocialGeneration
from core.trends.scout import discover_trends
from core.trends.learning_pipeline import run_full_learning
from core.trends.trs_engine import compute_trs, TRS_MINIMUM_FOR_GENERATION

router = APIRouter()


# --- SCHEMAS ---

class TopicActionRequest(BaseModel):
    action: str  # approve, reject, defer


class UpdateQueriesRequest(BaseModel):
    queries: List[str]


class TRSCheckRequest(BaseModel):
    topic: str


# --- ENDPOINTS ---

import uuid
from starlette.concurrency import run_in_threadpool

async def run_discovery_bg(batch_id: str):
    logger = logging.getLogger("uvicorn.error")
    logger.info(f"Starting Background Trend Discovery (Batch {batch_id})")
    try:
        await discover_trends(batch_id=batch_id)
        logger.info(f"Background Trend Discovery Finished (Batch {batch_id})")
    except Exception as e:
        logger.error(f"Background Trend Discovery Failed: {e}")

@router.post("/trends/discover")
async def discover_trending_topics(background_tasks: BackgroundTasks):
    """
    Launch the Trend Scout agent in BACKGROUND.
    Returns a batch_id immediately. Client should poll /trends/topics?batch_id={batch_id}.
    """
    batch_id = str(uuid.uuid4())[:8]
    background_tasks.add_task(run_discovery_bg, batch_id)
    
    return {
        "status": "processing",
        "message": "Trend discovery started in background. Please poll for results.",
        "batch_id": batch_id
    }


@router.get("/trends/topics")
async def list_trend_topics(status: Optional[str] = None, batch_id: Optional[str] = None):
    """
    List all trend topics, optionally filtered by status or batch.
    """
    async with AsyncSessionLocal() as session:
        stmt = select(TrendTopic).order_by(TrendTopic.created_at.desc())
        if status:
            stmt = stmt.where(TrendTopic.status == status)
        if batch_id:
            stmt = stmt.where(TrendTopic.batch_id == batch_id)

        result = await session.execute(stmt)
        topics = result.scalars().all()

        return [
            {
                "id": str(t.id),
                "titre": t.titre,
                "type": t.topic_type,
                "description": t.description,
                "zones": t.zones,
                "search_queries": t.search_queries,
                "score_marketing": t.score_marketing,
                "justification_marketing": t.justification_marketing,
                "score_science": t.score_science,
                "justification_science": t.justification_science,
                "references_suggerees": t.references_suggerees,
                "score_knowledge": t.score_knowledge,
                "justification_knowledge": t.justification_knowledge,
                "score_composite": t.score_composite,
                "recommandation": t.recommandation,
                "status": t.status,
                "trs_current": t.trs_current,
                "trs_details": t.trs_details,
                "learning_iterations": t.learning_iterations,
                "last_learning_delta": t.last_learning_delta,
                "learning_log": t.learning_log,
                "raw_signals": t.raw_signals,
                "batch_id": t.batch_id,
                "created_at": t.created_at,
            }
            for t in topics
        ]


@router.get("/trends/topics/{topic_id}")
async def get_trend_topic(topic_id: str):
    """Get a single trend topic with full details."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(TrendTopic).where(TrendTopic.id == topic_id)
        )
        t = result.scalar_one_or_none()
        if not t:
            raise HTTPException(status_code=404, detail="Topic not found")

        return {
            "id": str(t.id),
            "titre": t.titre,
            "type": t.topic_type,
            "description": t.description,
            "zones": t.zones,
            "search_queries": t.search_queries,
            "score_marketing": t.score_marketing,
            "justification_marketing": t.justification_marketing,
            "score_science": t.score_science,
            "justification_science": t.justification_science,
            "references_suggerees": t.references_suggerees,
            "score_knowledge": t.score_knowledge,
            "justification_knowledge": t.justification_knowledge,
            "score_composite": t.score_composite,
            "recommandation": t.recommandation,
            "status": t.status,
            "trs_current": t.trs_current,
            "trs_details": t.trs_details,
            "learning_iterations": t.learning_iterations,
            "last_learning_delta": t.last_learning_delta,
            "learning_log": t.learning_log,
            "raw_signals": t.raw_signals,
            "batch_id": t.batch_id,
            "created_at": t.created_at,
        }


@router.post("/trends/topics/{topic_id}/action")
async def topic_action(topic_id: str, request: TopicActionRequest, admin: AuthUser = Depends(require_admin)):
    """
    Admin action on a topic: approve, reject, or defer. Admin only.
    - approve: sets status to 'approved', ready for learning pipeline
    - reject: sets status to 'rejected'
    - defer: sets status to 'proposed' (back to queue)
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(TrendTopic).where(TrendTopic.id == topic_id)
        )
        topic = result.scalar_one_or_none()
        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found")

        if request.action == "approve":
            topic.status = "approved"

            # Pre-check TRS: if existing knowledge already covers the topic, skip learning
            trs_result = await compute_trs(topic.titre, stored_details=topic.trs_details)
            topic.trs_current = trs_result["trs"]
            topic.trs_details = trs_result["details"]
            if trs_result["trs"] >= TRS_MINIMUM_FOR_GENERATION:
                topic.status = "ready"

        elif request.action == "reject":
            topic.status = "rejected"
        elif request.action == "defer":
            topic.status = "proposed"
        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: {request.action}")

        await session.commit()
        return {
            "id": str(topic.id),
            "status": topic.status,
            "action": request.action,
            "trs_current": topic.trs_current,
        }


async def run_full_learning_bg(topic_id: str):
    logger = logging.getLogger("uvicorn.error")
    try:
        result = await run_full_learning(topic_id)
        logger.info(f"[Learning] Done for {topic_id}: status={result.get('final_status')}, trs={result.get('final_trs')}")
    except Exception as e:
        logger.error(f"[Learning] Failed for {topic_id}: {e}")


@router.post("/trends/topics/{topic_id}/learn-full")
async def trigger_full_learning(topic_id: str, background_tasks: BackgroundTasks):
    """
    Launch full learning pipeline in BACKGROUND.
    Immediately sets status='learning' and returns. Client should poll GET /trends/topics/{id}.
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(TrendTopic).where(TrendTopic.id == topic_id))
        topic = result.scalar_one_or_none()
        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found")
        if topic.status not in ("approved", "learning", "ready", "stagnated"):
            raise HTTPException(
                status_code=400,
                detail=f"Status '{topic.status}' does not allow learning."
            )
        # Reset iteration counter so the pipeline gets fresh attempts
        topic.learning_iterations = 0
        topic.learning_log = []
        # Pre-set to learning so frontend overlay appears immediately
        topic.status = "learning"
        await session.commit()

    background_tasks.add_task(run_full_learning_bg, topic_id)
    return {"status": "processing", "topic_id": topic_id, "message": "Learning pipeline started in background"}



@router.post("/trends/trs-check")
async def check_trs(request: TRSCheckRequest):
    """
    Ad-hoc TRS check for any topic string.
    Useful for debugging or manual checks.
    """
    try:
        result = await compute_trs(request.topic)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/trends/topics/{topic_id}/queries")
async def update_topic_queries(topic_id: str, request: UpdateQueriesRequest, admin: AuthUser = Depends(require_admin)):
    """
    Update the learning query list for a topic.
    Replaces the existing search_queries array.
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(TrendTopic).where(TrendTopic.id == topic_id))
        topic = result.scalar_one_or_none()
        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found")
        cleaned = [q.strip() for q in request.queries if q.strip()]
        topic.search_queries = cleaned
        await session.commit()
        return {"id": str(topic.id), "search_queries": cleaned}


@router.delete("/trends/topics/{topic_id}")
async def delete_trend_topic(topic_id: str, admin: AuthUser = Depends(require_admin)):
    """
    Delete a specific trend topic by ID. Admin only.
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(TrendTopic).where(TrendTopic.id == topic_id)
        )
        topic = result.scalar_one_or_none()
        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found")
            
        from sqlalchemy import delete
        await session.execute(delete(TrendTopic).where(TrendTopic.id == topic_id))
        await session.commit()
        
        return {"message": f"Topic {topic_id} deleted successfully"}


@router.delete("/trends/cleanup")
async def cleanup_rejected_topics(admin: AuthUser = Depends(require_admin)):
    """
    Delete all topics with status 'rejected'. Admin only.
    Returns the count of deleted topics.
    """
    async with AsyncSessionLocal() as session:
        try:
            # Check count first
            stmt_count = select(func.count(TrendTopic.id)).where(TrendTopic.status == "rejected")
            count = (await session.execute(stmt_count)).scalar() or 0
            
            if count > 0:
                # Delete
                from sqlalchemy import delete
                stmt = delete(TrendTopic).where(TrendTopic.status == "rejected")
                await session.execute(stmt)
                await session.commit()
                
            return {"deleted_count": count, "message": f"Successfully deleted {count} rejected topics."}
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Batch fiche generation for all "ready" topics without fiches
# ---------------------------------------------------------------------------

logger = logging.getLogger("uvicorn.error")

_fiche_jobs: Dict[str, dict] = {}


async def _run_generate_all_fiches(job_id: str, topics: List[dict], delay: int = 8):
    """Background: generate fiches for topics that don't have one yet."""
    from core.social.generator import SocialContentGenerator
    from core.prompts import APP_SYSTEM_PROMPT

    job = _fiche_jobs[job_id]
    job["status"] = "running"
    job["started_at"] = time.time()
    gen = SocialContentGenerator()

    for i, t in enumerate(topics):
        job["current_index"] = i
        job["current_topic"] = t["titre"]
        job["progress"] = f"{i + 1}/{len(topics)}"

        try:
            cache_topic = f"[SOCIAL] {t['titre']}"
            logger.info(f"[BATCH-FICHE-ALL {job_id}] Generating: {cache_topic}")
            result = await gen.generate_social_content(
                cache_topic, system_prompt=APP_SYSTEM_PROMPT, force=True
            )
            has_error = isinstance(result, dict) and "error" in result
            job["results"].append({
                "topic_id": t["id"],
                "topic": t["titre"],
                "status": "error" if has_error else "ok",
                "error": result.get("error") if has_error else None,
            })
        except Exception as e:
            logger.error(f"[BATCH-FICHE-ALL {job_id}] Error on '{t['titre']}': {e}")
            job["results"].append({
                "topic_id": t["id"],
                "topic": t["titre"],
                "status": "error",
                "error": str(e),
            })

        if i < len(topics) - 1:
            await asyncio.sleep(delay)

    job["status"] = "completed"
    job["completed_at"] = time.time()
    ok_count = sum(1 for r in job["results"] if r["status"] == "ok")
    job["total_generated"] = ok_count
    logger.info(f"[BATCH-FICHE-ALL {job_id}] Done: {ok_count}/{len(topics)} fiches generated")


@router.post("/trends/generate-all-fiches")
async def generate_all_missing_fiches(background_tasks: BackgroundTasks):
    """
    Find all topics with status='ready' that DON'T have a published fiche,
    then generate fiches for them in background.
    Returns immediately with job_id for polling.
    """
    async with AsyncSessionLocal() as session:
        # Get all "ready" topics
        ready_result = await session.execute(
            select(TrendTopic).where(TrendTopic.status == "ready")
        )
        ready_topics = ready_result.scalars().all()

        if not ready_topics:
            return {"status": "nothing_to_do", "message": "Aucun topic ready."}

        # Get all existing fiche topics
        fiches_result = await session.execute(
            select(SocialGeneration.topic)
        )
        existing_fiche_topics = {
            row[0] for row in fiches_result.all()
        }

        # Filter: topics without a fiche
        missing = []
        for t in ready_topics:
            fiche_topic = f"[SOCIAL] {t.titre}"
            if fiche_topic not in existing_fiche_topics:
                missing.append({"id": str(t.id), "titre": t.titre})

        if not missing:
            return {
                "status": "nothing_to_do",
                "message": f"Les {len(ready_topics)} topics ready ont deja une fiche.",
            }

    import uuid as _uuid
    job_id = str(_uuid.uuid4())[:8]
    _fiche_jobs[job_id] = {
        "status": "pending",
        "total": len(missing),
        "topics": [m["titre"] for m in missing],
        "current_index": 0,
        "current_topic": "",
        "progress": f"0/{len(missing)}",
        "results": [],
        "created_at": time.time(),
    }

    background_tasks.add_task(_run_generate_all_fiches, job_id, missing)

    return {
        "status": "accepted",
        "job_id": job_id,
        "total": len(missing),
        "topics": [m["titre"] for m in missing],
        "message": f"Generation de {len(missing)} fiches lancee en arriere-plan.",
    }


@router.get("/trends/fiche-job/{job_id}")
async def get_fiche_job_status(job_id: str):
    """Poll the status of a batch fiche generation job."""
    job = _fiche_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "job_id": job_id,
        "status": job["status"],
        "progress": job["progress"],
        "current_topic": job.get("current_topic", ""),
        "total": job["total"],
        "results": job["results"],
        "total_generated": job.get("total_generated"),
    }
