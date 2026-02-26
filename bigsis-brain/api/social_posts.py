"""
Social Posts API — Generate, manage, and publish Instagram carousel posts
from published Fiches Verite.
"""

import uuid
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from core.auth import AuthUser, require_admin
from core.db.database import AsyncSessionLocal
from core.db.models import SocialPost, SocialGeneration
from core.social.post_generator import SocialPostGenerator, VALID_TEMPLATES, TEMPLATE_LABELS

logger = logging.getLogger(__name__)
router = APIRouter()

_generator = SocialPostGenerator()


# --- SCHEMAS ---

class GeneratePostRequest(BaseModel):
    fiche_id: str
    template_type: str


class UpdateStatusRequest(BaseModel):
    status: str  # draft, approved, published


class UpdateSlidesRequest(BaseModel):
    slides: list


# --- ENDPOINTS ---

@router.post("/social-posts/generate")
async def generate_social_post(
    request: GeneratePostRequest,
    admin: AuthUser = Depends(require_admin),
):
    """Generate an Instagram carousel post from a published fiche."""
    if request.template_type not in VALID_TEMPLATES:
        raise HTTPException(
            status_code=400,
            detail=f"Template invalide: {request.template_type}. Valides: {VALID_TEMPLATES}"
        )

    # 1. Fetch the fiche
    try:
        fiche_uuid = uuid.UUID(request.fiche_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="fiche_id invalide")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SocialGeneration).where(SocialGeneration.id == fiche_uuid)
        )
        fiche = result.scalar_one_or_none()

    if not fiche:
        raise HTTPException(status_code=404, detail="Fiche non trouvee")
    if not isinstance(fiche.content, dict) or "error" in fiche.content:
        raise HTTPException(status_code=400, detail="La fiche n'a pas de contenu valide")

    # 2. Generate via LLM (hybrid: fiche structure + RAG evidence chunks)
    logger.info(f"Generating social post: fiche={request.fiche_id}, template={request.template_type}")
    gen_result = await _generator.generate_post(
        fiche.content,
        request.template_type,
        procedure_topic=fiche.topic or "",
    )

    if isinstance(gen_result, dict) and "error" in gen_result:
        raise HTTPException(status_code=500, detail=gen_result["error"])

    # 3. Store in DB
    title = gen_result.get("slides", [{}])[0].get("headline", "Sans titre")
    async with AsyncSessionLocal() as session:
        post = SocialPost(
            fiche_id=fiche_uuid,
            template_type=request.template_type,
            title=title,
            slides=gen_result.get("slides", []),
            caption=gen_result.get("caption", ""),
            hashtags=gen_result.get("hashtags", []),
            status="draft",
        )
        session.add(post)
        await session.commit()
        await session.refresh(post)

        return _serialize_post_detail(post)


@router.get("/social-posts")
async def list_social_posts(
    status: Optional[str] = None,
    template_type: Optional[str] = None,
    admin: AuthUser = Depends(require_admin),
):
    """List all social posts with fiche titles. Filterable by status and template."""
    async with AsyncSessionLocal() as session:
        stmt = select(SocialPost).order_by(SocialPost.created_at.desc())
        if status:
            stmt = stmt.where(SocialPost.status == status)
        if template_type:
            stmt = stmt.where(SocialPost.template_type == template_type)
        result = await session.execute(stmt.limit(200))
        posts = result.scalars().all()

        # Fetch fiche titles for display
        fiche_ids = {p.fiche_id for p in posts}
        fiche_map = {}
        if fiche_ids:
            fiches_result = await session.execute(
                select(SocialGeneration).where(SocialGeneration.id.in_(fiche_ids))
            )
            for f in fiches_result.scalars().all():
                content = f.content if isinstance(f.content, dict) else {}
                fiche_map[f.id] = content.get("nom_commercial_courant", f.topic or "?")

        return [
            {
                "id": str(p.id),
                "fiche_id": str(p.fiche_id),
                "fiche_title": fiche_map.get(p.fiche_id, "?"),
                "template_type": p.template_type,
                "template_label": TEMPLATE_LABELS.get(p.template_type, p.template_type),
                "title": p.title,
                "slides_count": len(p.slides) if p.slides else 0,
                "status": p.status,
                "created_at": p.created_at.isoformat() if p.created_at else "",
            }
            for p in posts
        ]


@router.get("/social-posts/fiches")
async def list_available_fiches(
    admin: AuthUser = Depends(require_admin),
):
    """List SocialGeneration records available for post generation (with UUIDs)."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SocialGeneration)
            .where(SocialGeneration.topic.like("[SOCIAL]%"))
            .order_by(SocialGeneration.created_at.desc())
            .limit(100)
        )
        fiches = result.scalars().all()

        # Dedup by title
        seen_titles = set()
        items = []
        for f in fiches:
            content = f.content if isinstance(f.content, dict) else {}
            if "error" in content:
                continue
            title = content.get("nom_commercial_courant") or f.topic.replace("[SOCIAL] ", "")
            title_key = title.lower().strip()
            if title_key in seen_titles:
                continue
            seen_titles.add(title_key)

            items.append({
                "id": str(f.id),
                "title": title,
                "topic": f.topic,
                "status": f.status,
                "score_efficacite": (content.get("score_global") or {}).get("note_efficacite_sur_10"),
                "score_securite": (content.get("score_global") or {}).get("note_securite_sur_10"),
            })

        return items


@router.get("/social-posts/templates")
async def list_templates():
    """List available post templates."""
    return [
        {"id": k, "label": v}
        for k, v in TEMPLATE_LABELS.items()
    ]


@router.get("/social-posts/{post_id}")
async def get_social_post(
    post_id: str,
    admin: AuthUser = Depends(require_admin),
):
    """Get a single social post with all slides."""
    try:
        post_uuid = uuid.UUID(post_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID invalide")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SocialPost).where(SocialPost.id == post_uuid)
        )
        post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=404, detail="Post non trouve")

    return _serialize_post_detail(post)


@router.patch("/social-posts/{post_id}/status")
async def update_post_status(
    post_id: str,
    request: UpdateStatusRequest,
    admin: AuthUser = Depends(require_admin),
):
    """Update post status (draft -> approved -> published)."""
    valid_statuses = ["draft", "approved", "published"]
    if request.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Statut invalide: {request.status}. Valides: {valid_statuses}"
        )

    try:
        post_uuid = uuid.UUID(post_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID invalide")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SocialPost).where(SocialPost.id == post_uuid)
        )
        post = result.scalar_one_or_none()
        if not post:
            raise HTTPException(status_code=404, detail="Post non trouve")

        post.status = request.status
        await session.commit()
        await session.refresh(post)

        logger.info(f"Post {post_id} status updated to: {request.status}")
        return {"id": str(post.id), "status": post.status}


@router.patch("/social-posts/{post_id}/slides")
async def update_post_slides(
    post_id: str,
    request: UpdateSlidesRequest,
    admin: AuthUser = Depends(require_admin),
):
    """Update slide content (inline editing from admin dashboard)."""
    try:
        post_uuid = uuid.UUID(post_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID invalide")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SocialPost).where(SocialPost.id == post_uuid)
        )
        post = result.scalar_one_or_none()
        if not post:
            raise HTTPException(status_code=404, detail="Post non trouve")

        post.slides = request.slides
        # Also update title from first slide headline
        if request.slides and isinstance(request.slides[0], dict):
            post.title = request.slides[0].get("headline", post.title)

        await session.commit()
        await session.refresh(post)

        return _serialize_post_detail(post)


@router.delete("/social-posts/{post_id}")
async def delete_social_post(
    post_id: str,
    admin: AuthUser = Depends(require_admin),
):
    """Delete a social post."""
    try:
        post_uuid = uuid.UUID(post_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID invalide")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SocialPost).where(SocialPost.id == post_uuid)
        )
        post = result.scalar_one_or_none()
        if not post:
            raise HTTPException(status_code=404, detail="Post non trouve")

        await session.delete(post)
        await session.commit()

        logger.info(f"Post {post_id} deleted")
        return {"deleted": True, "id": post_id}


# --- HELPERS ---

def _serialize_post_detail(post: SocialPost) -> dict:
    """Serialize a SocialPost to a detail response."""
    return {
        "id": str(post.id),
        "fiche_id": str(post.fiche_id),
        "template_type": post.template_type,
        "template_label": TEMPLATE_LABELS.get(post.template_type, post.template_type),
        "title": post.title,
        "slides": post.slides or [],
        "caption": post.caption or "",
        "hashtags": post.hashtags or [],
        "status": post.status,
        "created_at": post.created_at.isoformat() if post.created_at else "",
    }
