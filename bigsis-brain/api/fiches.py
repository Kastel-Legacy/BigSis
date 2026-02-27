import logging
import re
import unicodedata
from typing import Dict, Optional
from urllib.parse import unquote

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, delete

from core.auth import AuthUser, require_admin, get_optional_user
from core.social.generator import SocialContentGenerator
from core.db.database import AsyncSessionLocal
from core.db.models import SocialGeneration, FicheFeedback, TrendTopic
from api.schemas import SocialGenerationResponse, FicheFeedbackRequest
from sqlalchemy import func as sa_func

router = APIRouter()
generator = SocialContentGenerator()


class GenerateFicheRequest(BaseModel):
    titre: str


def _make_slug(text: str) -> str:
    """Generate a clean URL-safe slug from any text."""
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


@router.get("/fiches")
async def list_fiches(
    include_drafts: bool = False,
    user: Optional[AuthUser] = Depends(get_optional_user),
):
    """Returns deduplicated fiches with clean slugs."""
    show_drafts = include_drafts and user and user.role == "admin"

    async with AsyncSessionLocal() as session:
        query = (
            select(SocialGeneration)
            .filter(SocialGeneration.topic.like("[SOCIAL]%"))
        )
        if not show_drafts:
            query = query.filter(SocialGeneration.status == "published")
        query = query.order_by(SocialGeneration.created_at.desc()).limit(200)

        result = await session.execute(query)

        seen_titles: Dict[str, str] = {}
        seen_slugs: Dict[str, dict] = {}

        for g in result.scalars().all():
            content = g.content if isinstance(g.content, dict) else {}
            if "error" in content:
                continue

            topic_raw = g.topic.replace("[SOCIAL] ", "")
            slug = _make_slug(topic_raw)
            if not slug or slug in seen_slugs:
                continue

            title = content.get("nom_commercial_courant") or content.get("titre_officiel") or topic_raw
            title_key = _make_slug(title)
            if title_key in seen_titles:
                continue

            seen_titles[title_key] = slug
            scores = content.get("score_global", {})
            seen_slugs[slug] = {
                "topic": topic_raw,
                "slug": slug,
                "title": title,
                "scientific_name": content.get("nom_scientifique", ""),
                "score_efficacite": scores.get("note_efficacite_sur_10"),
                "score_securite": scores.get("note_securite_sur_10"),
                "zones": (content.get("meta") or {}).get("zones_concernees", []),
                "created_at": str(g.created_at.date()) if g.created_at else "",
                "trs_score": (content.get("evidence_metadata") or {}).get("trs_score"),
                "status": getattr(g, "status", "published"),
            }

        return list(seen_slugs.values())


@router.get("/fiches/ready-topics")
async def list_ready_topics(admin: AuthUser = Depends(require_admin)):
    """List TrendTopics that are 'ready' (TRS >= 70) but don't have a [SOCIAL] fiche yet."""
    async with AsyncSessionLocal() as session:
        # Get all ready topics
        topics_result = await session.execute(
            select(TrendTopic)
            .filter(TrendTopic.status == "ready")
            .order_by(TrendTopic.trs_current.desc())
        )
        ready_topics = topics_result.scalars().all()

        # Get all existing [SOCIAL] fiches topics
        fiches_result = await session.execute(
            select(SocialGeneration.topic)
            .filter(SocialGeneration.topic.like("[SOCIAL]%"))
        )
        existing_fiche_slugs = set()
        for (topic_str,) in fiches_result.all():
            raw = topic_str.replace("[SOCIAL] ", "")
            existing_fiche_slugs.add(_make_slug(raw))

        # Return topics that have no fiche yet
        pending = []
        for t in ready_topics:
            slug = _make_slug(t.titre)
            if slug not in existing_fiche_slugs:
                pending.append({
                    "id": str(t.id),
                    "titre": t.titre,
                    "slug": slug,
                    "trs_current": t.trs_current,
                    "learning_iterations": t.learning_iterations,
                    "status": t.status,
                })
        return pending


async def _run_generate_fiche_bg(titre: str):
    """Background task: generate a fiche for the given topic title."""
    logger = logging.getLogger("uvicorn.error")
    try:
        cache_topic = f"[SOCIAL] {titre}"
        await generator.generate_social_content(cache_topic, force=True)
        logger.info(f"[Fiches] Fiche generated for: {titre}")
    except Exception as e:
        logger.error(f"[Fiches] Fiche generation failed for '{titre}': {e}")


@router.post("/fiches/generate")
async def generate_fiche(
    body: GenerateFicheRequest,
    background_tasks: BackgroundTasks,
    admin: AuthUser = Depends(require_admin),
):
    """
    Generate a fiche for any topic by name. Admin only.
    Decoupled from trends — works with just a titre string.
    Runs in background. Returns the expected slug immediately.
    """
    titre = body.titre.strip()
    if not titre:
        raise HTTPException(status_code=400, detail="Le titre est requis")

    slug = _make_slug(titre)

    # Check if fiche already exists
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SocialGeneration)
            .filter(SocialGeneration.topic.like("[SOCIAL]%"))
            .limit(200)
        )
        for g in result.scalars().all():
            topic_raw = g.topic.replace("[SOCIAL] ", "")
            if _make_slug(topic_raw) == slug:
                raise HTTPException(
                    status_code=409,
                    detail=f"Une fiche existe deja pour '{titre}' (slug: {slug})",
                )

    background_tasks.add_task(_run_generate_fiche_bg, titre)
    return {
        "status": "generating",
        "slug": slug,
        "message": f"Generation de la fiche '{titre}' en cours.",
    }


@router.get("/fiches/{slug:path}", response_model=SocialGenerationResponse)
async def get_fiche(
    slug: str,
    user: Optional[AuthUser] = Depends(get_optional_user),
):
    """Get a Fiche by slug. Matches against all cached generations."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SocialGeneration)
            .filter(SocialGeneration.topic.like("[SOCIAL]%"))
            .order_by(SocialGeneration.created_at.desc())
            .limit(200)
        )
        for g in result.scalars().all():
            topic_raw = g.topic.replace("[SOCIAL] ", "")
            if _make_slug(topic_raw) == slug:
                content = g.content if isinstance(g.content, dict) else {}
                if "error" in content:
                    continue
                # Draft fiches are only visible to admins
                if getattr(g, "status", "published") == "draft":
                    if not (user and user.role == "admin"):
                        continue
                return {"data": content}

        raise HTTPException(status_code=404, detail="Fiche not found")


@router.delete("/fiches")
async def delete_all_fiches(admin: AuthUser = Depends(require_admin)):
    """Delete ALL cached fiche generations. Admin only."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            delete(SocialGeneration).where(SocialGeneration.topic.like("[SOCIAL]%"))
        )
        await session.commit()
        return {"deleted": result.rowcount}


@router.delete("/fiches/{slug}")
async def delete_fiche(slug: str, admin: AuthUser = Depends(require_admin)):
    """Delete a specific fiche by slug. Admin only."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SocialGeneration).filter(SocialGeneration.topic.like("[SOCIAL]%"))
        )
        deleted = 0
        for g in result.scalars().all():
            topic_raw = g.topic.replace("[SOCIAL] ", "")
            if _make_slug(topic_raw) == slug:
                await session.delete(g)
                deleted += 1
        await session.commit()
        if deleted == 0:
            raise HTTPException(status_code=404, detail="Fiche not found")
        return {"deleted": deleted, "slug": slug}


@router.patch("/fiches/{slug}/publish")
async def publish_fiche(slug: str, admin: AuthUser = Depends(require_admin)):
    """Publish a draft fiche. Admin only."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SocialGeneration).filter(SocialGeneration.topic.like("[SOCIAL]%"))
        )
        updated = 0
        for g in result.scalars().all():
            topic_raw = g.topic.replace("[SOCIAL] ", "")
            if _make_slug(topic_raw) == slug:
                g.status = "published"
                updated += 1
        await session.commit()
        if updated == 0:
            raise HTTPException(status_code=404, detail="Fiche not found")
        return {"slug": slug, "status": "published"}


@router.patch("/fiches/{slug}/unpublish")
async def unpublish_fiche(slug: str, admin: AuthUser = Depends(require_admin)):
    """Unpublish a fiche (set back to draft). Admin only."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SocialGeneration).filter(SocialGeneration.topic.like("[SOCIAL]%"))
        )
        updated = 0
        for g in result.scalars().all():
            topic_raw = g.topic.replace("[SOCIAL] ", "")
            if _make_slug(topic_raw) == slug:
                g.status = "draft"
                updated += 1
        await session.commit()
        if updated == 0:
            raise HTTPException(status_code=404, detail="Fiche not found")
        return {"slug": slug, "status": "draft"}


@router.get("/fiches/{slug}/versions")
async def list_fiche_versions(slug: str, admin: AuthUser = Depends(require_admin)):
    """List all versions of a fiche. Admin only."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SocialGeneration)
            .filter(SocialGeneration.topic.like("[SOCIAL]%"))
            .order_by(SocialGeneration.created_at.desc())
        )
        versions = []
        for g in result.scalars().all():
            topic_raw = g.topic.replace("[SOCIAL] ", "")
            if _make_slug(topic_raw) == slug:
                content = g.content if isinstance(g.content, dict) else {}
                versions.append({
                    "id": str(g.id),
                    "created_at": str(g.created_at) if g.created_at else "",
                    "status": getattr(g, "status", "published"),
                    "trs_score": (content.get("evidence_metadata") or {}).get("trs_score"),
                })
        if not versions:
            raise HTTPException(status_code=404, detail="Fiche not found")
        # Add version numbers (newest = highest)
        total = len(versions)
        for i, v in enumerate(versions):
            v["version"] = total - i
        return versions


@router.post("/fiches/{slug}/feedback")
async def submit_feedback(
    slug: str,
    body: FicheFeedbackRequest,
    user: Optional[AuthUser] = Depends(get_optional_user),
):
    """Submit feedback for a fiche. Auth optional."""
    if body.rating not in (1, 5):
        raise HTTPException(status_code=400, detail="Rating must be 1 or 5")
    async with AsyncSessionLocal() as session:
        feedback = FicheFeedback(
            fiche_slug=slug,
            user_id=user.sub if user else None,
            rating=body.rating,
            comment=body.comment,
        )
        session.add(feedback)
        await session.commit()
        return {"ok": True}


@router.get("/fiches/{slug}/feedback")
async def get_feedback_summary(slug: str):
    """Get aggregated feedback for a fiche."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(FicheFeedback.rating, sa_func.count())
            .where(FicheFeedback.fiche_slug == slug)
            .group_by(FicheFeedback.rating)
        )
        counts = {row[0]: row[1] for row in result.all()}
        return {
            "thumbs_up": counts.get(5, 0),
            "thumbs_down": counts.get(1, 0),
            "total": sum(counts.values()),
        }
