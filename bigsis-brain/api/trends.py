"""
Trends API - Discover, evaluate, approve, and learn trending topics.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import select, func

import re
import unicodedata
from urllib.parse import unquote

from core.auth import AuthUser, require_admin
from core.db.database import AsyncSessionLocal
from core.db.models import TrendTopic
from core.trends.scout import discover_trends
from core.trends.learning_pipeline import run_learning_iteration, run_full_learning
from core.trends.trs_engine import compute_trs
from core.social.generator import SocialContentGenerator

_fiche_generator = SocialContentGenerator()


def _make_slug(text: str) -> str:
    decoded = text
    for _ in range(3):
        prev = decoded
        decoded = unquote(decoded)
        if decoded == prev:
            break
    normalized = unicodedata.normalize("NFKD", decoded)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = re.sub(r'[^a-z0-9]+', '-', ascii_text).strip('-')
    return re.sub(r'-+', '-', slug)

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
        elif request.action == "reject":
            topic.status = "rejected"
        elif request.action == "defer":
            topic.status = "proposed"
        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: {request.action}")

        await session.commit()
        return {"id": str(topic.id), "status": topic.status, "action": request.action}


@router.post("/trends/topics/{topic_id}/learn")
async def trigger_learning(topic_id: str):
    """
    Trigger one learning iteration for an approved topic.
    Runs PubMed + Semantic Scholar ingestion, then re-computes TRS.
    Detects stagnation if delta < threshold.
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(TrendTopic).where(TrendTopic.id == topic_id)
        )
        topic = result.scalar_one_or_none()
        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found")
        if topic.status not in ("approved", "learning", "ready", "stagnated"):
            raise HTTPException(
                status_code=400,
                detail=f"Topic status '{topic.status}' does not allow learning. Allowed: approved, learning, ready, stagnated."
            )

    try:
        result = await run_learning_iteration(topic_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trends/topics/{topic_id}/learn-full")
async def trigger_full_learning(topic_id: str):
    """
    Run the full learning pipeline: iterate until ready, stagnated, or max iterations.
    """
    try:
        result = await run_full_learning(topic_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



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


async def _run_generate_fiche_bg(titre: str):
    logger = logging.getLogger("uvicorn.error")
    try:
        await _fiche_generator.generate_social_content(titre, force=True)
        logger.info(f"[Trends] Fiche generated for: {titre}")
    except Exception as e:
        logger.error(f"[Trends] Fiche generation failed for '{titre}': {e}")


@router.post("/trends/topics/{topic_id}/generate-fiche")
async def generate_fiche_for_topic(topic_id: str, background_tasks: BackgroundTasks, admin: AuthUser = Depends(require_admin)):
    """
    Trigger fiche generation for an approved/ready trend topic.
    Runs in background. Returns the expected fiche slug immediately.
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(TrendTopic).where(TrendTopic.id == topic_id))
        topic = result.scalar_one_or_none()
        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found")

    slug = _make_slug(topic.titre)
    background_tasks.add_task(_run_generate_fiche_bg, topic.titre)
    return {
        "status": "generating",
        "slug": slug,
        "message": f"Génération de la fiche '{topic.titre}' en cours.",
    }


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
