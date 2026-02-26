"""
Chat Diagnostic API — BigSis conversational diagnostic with:
- Dynamic procedure catalogue (from DB, not hardcoded slugs)
- Formulaic confidence score (evidence-based, not LLM-generated)
- User profile integration (skin type, age, concerns)
- Connected post-diagnostic journey (TRS badges, fiche links)
- LLM-based context extraction (replaces fragile keyword matching)
"""

import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from api.schemas import DiagnosticRequest
from core.auth import AuthUser, get_optional_user
from core.orchestrator import Orchestrator
from core.db.database import AsyncSessionLocal
from core.db.models import Procedure, SocialGeneration, UserProfile, TrendTopic
from core.trends.learning_pipeline import run_full_learning

logger = logging.getLogger(__name__)
router = APIRouter()
orchestrator = Orchestrator()


# ---------------------------------------------------------------------------
# P2: LLM-based context extraction (replaces keyword matching)
# ---------------------------------------------------------------------------

async def _extract_context_llm(messages: list) -> dict:
    """Use a fast LLM call to extract structured clinical context from conversation."""
    user_texts = [m.content for m in messages if m.role == "user"]
    if not user_texts:
        return {}

    full_text = "\n".join(user_texts)

    extraction_prompt = f"""Extrait le contexte clinique de ce message patient (esthétique faciale).
Retourne UNIQUEMENT un JSON avec les champs trouvés (omets ceux absents) :
- "area": "front" | "glabelle" | "pattes_oie" | "sillon_nasogenien" | "cou" | "joues"
- "wrinkle_type": "expression" | "statique"
- "concern": sujet principal en 2-3 mots
- "age": nombre entier
- "pregnancy": true/false
- "budget": nombre entier en euros
- "previous_treatment": true/false
- "skin_type": "normale" | "grasse" | "seche" | "mixte" | "sensible"

Message patient :
{full_text}"""

    try:
        result = await orchestrator.llm_client.generate_response(
            system_prompt="Tu es un extracteur de données cliniques. Retourne UNIQUEMENT du JSON valide, rien d'autre.",
            user_content=extraction_prompt,
            json_mode=True,
            model_override="gpt-4o-mini",
            temperature_override=0.0,
        )
        if isinstance(result, dict):
            return result
        if isinstance(result, str):
            return json.loads(result)
    except Exception as e:
        logger.warning(f"LLM context extraction failed, falling back to keywords: {e}")

    # Fallback to basic keyword extraction
    return _extract_context_keywords(messages)


def _extract_context_keywords(messages: list) -> dict:
    """Fallback: keyword-based context extraction."""
    import re
    context = {}
    full_text = " ".join([m.content.lower() for m in messages if m.role == "user"])

    zone_keywords = {
        "front": ["front", "forehead", "rides du front"],
        "glabelle": ["glabelle", "ride du lion", "rides du lion", "entre les sourcils", "frown"],
        "pattes_oie": ["pattes d'oie", "pattes doie", "yeux", "contour des yeux", "crow", "rides des yeux", "autour des yeux"],
        "sillon_nasogenien": ["sillon", "nasogenien", "bouche", "levres", "nasolabial", "sourire", "autour de la bouche"],
        "cou": ["cou", "neck", "decollete"],
        "joues": ["joue", "joues", "cheek"],
    }
    for zone, keywords in zone_keywords.items():
        if any(kw in full_text for kw in keywords):
            context["area"] = zone
            break

    if any(w in full_text for w in ["expression", "ride d'expression", "quand je souris", "quand je fronce"]):
        context["wrinkle_type"] = "expression"
    elif any(w in full_text for w in ["statique", "permanente", "toujours visible", "repos", "meme au repos"]):
        context["wrinkle_type"] = "statique"

    concern_keywords = {
        "botox": ["botox", "toxine botulique", "botulique"],
        "acide hyaluronique": ["acide hyaluronique", "filler", "injection", "volume"],
        "peeling": ["peeling", "peel"],
        "laser": ["laser", "lumiere pulsee", "ipl"],
        "rides": ["ride", "rides", "ridule", "vieillissement"],
        "prevention": ["prevenir", "prevention", "preventif", "commencer tot"],
        "skinbooster": ["skinbooster", "skin booster", "hydratation profonde"],
        "microneedling": ["microneedling", "micro-needling", "dermaroller"],
    }
    for concern, keywords in concern_keywords.items():
        if any(kw in full_text for kw in keywords):
            context["concern"] = concern
            break

    if "concern" not in context:
        user_messages = [m.content for m in messages if m.role == "user"]
        if user_messages:
            context["concern"] = user_messages[-1][:100]

    if any(w in full_text for w in ["enceinte", "grossesse", "allaite", "allaitement", "pregnant"]):
        context["pregnancy"] = True

    age_match = re.search(r'\b(\d{2})\s*ans\b', full_text)
    if age_match:
        context["age"] = int(age_match.group(1))

    budget_match = re.search(r'(\d+)\s*(?:€|euro|eur)', full_text)
    if budget_match:
        context["budget"] = int(budget_match.group(1))

    if any(w in full_text for w in ["deja fait", "deja eu", "deja essaye", "precedent traitement"]):
        context["previous_treatment"] = True

    return context


# ---------------------------------------------------------------------------
# P0: Dynamic procedure catalogue
# ---------------------------------------------------------------------------

def _make_slug(text: str) -> str:
    """Create URL-safe slug from text."""
    import re
    import unicodedata
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text.lower())
    return re.sub(r"[-\s]+", "-", text).strip("-")


async def _load_procedure_catalogue() -> tuple[str, dict]:
    """Load procedures from DB + published fiches. Returns (prompt_text, slug_map)."""
    catalogue_lines = []
    slug_map = {}  # slug -> {name, has_fiche, trs, downtime, price_range, tags}

    async with AsyncSessionLocal() as session:
        # Load procedures from atlas
        proc_result = await session.execute(select(Procedure))
        procedures = proc_result.scalars().all()

        for p in procedures:
            slug = _make_slug(p.name)
            entry = {
                "name": p.name,
                "slug": slug,
                "has_fiche": False,
                "trs": None,
                "downtime": p.downtime or "non renseigné",
                "price_range": p.price_range or "non renseigné",
                "tags": p.tags or [],
                "category": getattr(p, "category", ""),
            }
            slug_map[slug] = entry

        # Load published fiches to enrich with TRS
        fiche_result = await session.execute(
            select(SocialGeneration)
            .filter(SocialGeneration.topic.like("[SOCIAL]%"))
            .filter(SocialGeneration.status == "published")
            .order_by(SocialGeneration.created_at.desc())
            .limit(200)
        )
        for g in fiche_result.scalars().all():
            topic_raw = g.topic.replace("[SOCIAL] ", "")
            fiche_slug = _make_slug(topic_raw)
            content = g.content if isinstance(g.content, dict) else {}
            if "error" in content:
                continue

            # Check if this fiche matches an existing procedure
            if fiche_slug in slug_map:
                slug_map[fiche_slug]["has_fiche"] = True
            else:
                # Fiche without a matching procedure — still add to catalogue
                slug_map[fiche_slug] = {
                    "name": topic_raw,
                    "slug": fiche_slug,
                    "has_fiche": True,
                    "trs": None,
                    "downtime": content.get("recuperation_sociale", {}).get("downtime_visage_nu", ""),
                    "price_range": "",
                    "tags": content.get("meta", {}).get("categories", []),
                    "category": "",
                }

        # Enrich with TRS from trend topics
        for slug, entry in slug_map.items():
            topic_result = await session.execute(
                select(TrendTopic).filter(TrendTopic.titre.ilike(f"%{entry['name']}%")).limit(1)
            )
            topic = topic_result.scalar_one_or_none()
            if topic and topic.trs_current:
                entry["trs"] = round(topic.trs_current)

    # Format for prompt
    for slug, entry in slug_map.items():
        tags_str = ", ".join(entry["tags"]) if entry["tags"] else ""
        trs_str = f" (TRS {entry['trs']}/100)" if entry["trs"] else ""
        fiche_str = " [FICHE DISPONIBLE]" if entry["has_fiche"] else ""
        catalogue_lines.append(
            f'- slug: "{slug}" | {entry["name"]}{fiche_str}{trs_str} | '
            f'Downtime: {entry["downtime"]} | Prix: {entry["price_range"]} | Tags: {tags_str}'
        )

    prompt_text = "\n".join(catalogue_lines) if catalogue_lines else "Aucune procédure dans le catalogue."
    return prompt_text, slug_map


# ---------------------------------------------------------------------------
# P0: Formulaic confidence score
# ---------------------------------------------------------------------------

def _compute_confidence_score(
    context: dict,
    rules_triggered: int,
    evidence_chunks: int,
    slug_map: dict,
    profile: Optional[dict] = None,
) -> int:
    """Compute a formulaic confidence score (0-100) based on objective criteria."""

    # 1. Context completeness (max 30 points)
    ctx_score = 0
    if context.get("area"):
        ctx_score += 10
    if context.get("wrinkle_type"):
        ctx_score += 8
    if context.get("age") or (profile and profile.get("age_range")):
        ctx_score += 6
    if context.get("skin_type") or (profile and profile.get("skin_type")):
        ctx_score += 6

    # 2. Evidence strength (max 30 points)
    evi_score = 0
    evi_score += min(15, evidence_chunks * 5)  # 5 pts per chunk, max 15
    # Check if recommended procedures have fiches with TRS
    best_trs = 0
    for slug, entry in slug_map.items():
        if entry.get("has_fiche") and entry.get("trs"):
            best_trs = max(best_trs, entry["trs"])
    if best_trs >= 70:
        evi_score += 15
    elif best_trs >= 40:
        evi_score += 10
    elif best_trs > 0:
        evi_score += 5

    # 3. Rules coverage (max 20 points)
    rules_score = min(20, rules_triggered * 5)  # 5 pts per rule, max 20

    # 4. Procedure match quality (max 20 points)
    proc_score = 0
    has_any_procedure = len(slug_map) > 0
    has_any_fiche = any(e.get("has_fiche") for e in slug_map.values())
    if has_any_procedure:
        proc_score += 10
    if has_any_fiche:
        proc_score += 10

    total = ctx_score + evi_score + rules_score + proc_score
    return max(20, min(95, total))  # Clamp to 20-95


# ---------------------------------------------------------------------------
# P1: User profile integration
# ---------------------------------------------------------------------------

async def _load_user_profile(user: Optional[AuthUser]) -> Optional[dict]:
    """Load user profile from DB if authenticated."""
    if not user:
        return None

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(UserProfile).where(UserProfile.supabase_uid == user.sub)
        )
        profile = result.scalar_one_or_none()
        if not profile:
            return None

        return {
            "skin_type": profile.skin_type,
            "age_range": profile.age_range,
            "concerns": profile.concerns or [],
            "first_name": profile.first_name,
        }


def _format_profile_context(profile: dict) -> str:
    """Format user profile for injection into system prompt."""
    parts = []
    if profile.get("first_name"):
        parts.append(f"Prénom : {profile['first_name']}")
    if profile.get("skin_type"):
        parts.append(f"Type de peau : {profile['skin_type']}")
    if profile.get("age_range"):
        parts.append(f"Tranche d'âge : {profile['age_range']}")
    if profile.get("concerns"):
        parts.append(f"Préoccupations : {', '.join(profile['concerns'])}")

    if not parts:
        return ""
    return "\n=== PROFIL UTILISATRICE ===\n" + "\n".join(parts) + "\n"


# ---------------------------------------------------------------------------
# System prompt builder (combines all improvements)
# ---------------------------------------------------------------------------

def _build_chat_system_prompt(
    language: str,
    context: dict,
    msg_count: int,
    catalogue_text: str,
    confidence_score: int,
    profile_text: str = "",
) -> str:
    """Build BigSis chat system prompt with dynamic catalogue and formulaic score."""
    has_zone = "area" in context
    has_concern = "concern" in context
    has_enough = has_zone or has_concern or msg_count >= 2

    base_prompt = """Tu es BigSis, la grande soeur bienveillante et experte en esthetique medicale.

PERSONNALITE :
- Ton direct, chaleureux, sans bullshit. Tu tutoies.
- Tu ne diagnostiques PAS et tu ne prescris PAS. Tu informes.
- ECONOMIE DE TOKENS : sois concise, va droit au but.

"""

    if profile_text:
        base_prompt += profile_text + "\n"

    if has_enough:
        zone_label = context.get("area", "non precisee")
        concern_label = context.get("concern", "esthetique generale")
        base_prompt += f"""GENERE LA SYNTHESE MAINTENANT. Zone: {zone_label}. Sujet: {concern_label}.

=== CATALOGUE PROCEDURES (utilise UNIQUEMENT ces slugs) ===
{catalogue_text}

Format OBLIGATOIRE de ta reponse :
1. UNE phrase d'accroche personnalisee (max 20 mots)
2. Le bloc JSON ci-dessous (OBLIGATOIRE, meme si les infos sont partielles)

$$DIAGNOSTIC_JSON$$
{{"score_confiance": {confidence_score}, "zone": "{zone_label}", "concern": "{concern_label}", "options": [{{"name": "Nom procedure", "pertinence": "haute", "slug": "slug-du-catalogue"}}], "risques": ["risque 1"], "questions_praticien": ["question 1"], "safety_warnings": []}}
$$DIAGNOSTIC_JSON$$

REGLES CRITIQUES :
- score_confiance DOIT etre exactement {confidence_score} (calcule par le systeme, pas par toi).
- Les slugs DOIVENT venir du catalogue ci-dessus. Ne jamais inventer un slug.
- Si une procedure a [FICHE DISPONIBLE], mentionne-le dans la synthese.
- Propose 2-3 options pertinentes, triees par pertinence (haute > moyenne > basse).
- La phrase d'accroche doit etre utile, pas du remplissage.
"""
    else:
        base_prompt += """L'utilisatrice vient d'arriver. Tu n'as ni zone ni preoccupation.
Reponds en UNE phrase + UNE question directe pour obtenir l'info.
Exemple : "Hello ! C'est quoi ta preoccupation principale — des rides, un traitement qui t'intrigue, ou autre chose ?"
MAX 2 phrases au total.
"""

    return base_prompt


# ---------------------------------------------------------------------------
# Auto-learning: create TrendTopic + trigger learning for unknown procedures
# ---------------------------------------------------------------------------

async def _trigger_auto_learning(slugs: list[str], slug_map: dict) -> list[dict]:
    """For procedures without fiches, find or create a TrendTopic and kick off
    learning in the background. Returns list of {slug, name, status} for
    the frontend to display a 'learning in progress' state."""
    triggered = []

    async with AsyncSessionLocal() as session:
        for slug in slugs:
            entry = slug_map.get(slug)
            if not entry:
                continue
            name = entry["name"]

            # Check if a TrendTopic already exists for this procedure
            result = await session.execute(
                select(TrendTopic).filter(
                    TrendTopic.titre.ilike(f"%{name}%")
                ).limit(1)
            )
            topic = result.scalar_one_or_none()

            if topic:
                # Already exists — only trigger learning if it's not already done
                if topic.status in ("approved", "learning"):
                    triggered.append({
                        "slug": slug,
                        "name": name,
                        "status": "learning",
                        "topic_id": str(topic.id),
                    })
                    # Fire and forget learning in background
                    asyncio.create_task(_run_learning_bg(str(topic.id), name))
                elif topic.status == "ready":
                    # Already ready but no fiche yet — just inform
                    triggered.append({
                        "slug": slug,
                        "name": name,
                        "status": "ready",
                        "topic_id": str(topic.id),
                    })
                # stagnated/rejected → skip
            else:
                # Create a new TrendTopic for this procedure
                new_topic = TrendTopic(
                    titre=name,
                    topic_type="procedure",
                    description=f"Auto-créé par le diagnostic — apprentissage déclenché pour '{name}'",
                    search_queries=[
                        f"{name} aesthetic medicine",
                        f"{name} efficacy systematic review",
                        f"{name} safety adverse effects",
                    ],
                    status="approved",
                    score_composite=50.0,  # default score for auto-created topics
                    batch_id="auto-diagnostic",
                )
                session.add(new_topic)
                await session.flush()  # get the id

                triggered.append({
                    "slug": slug,
                    "name": name,
                    "status": "learning",
                    "topic_id": str(new_topic.id),
                })
                await session.commit()

                # Fire and forget learning in background
                asyncio.create_task(_run_learning_bg(str(new_topic.id), name))

    return triggered


async def _run_learning_bg(topic_id: str, name: str):
    """Background task to run full learning for a topic."""
    try:
        logger.info(f"Auto-learning started for '{name}' (topic_id={topic_id})")
        result = await run_full_learning(topic_id)
        logger.info(
            f"Auto-learning finished for '{name}': "
            f"status={result.get('final_status')}, trs={result.get('final_trs')}"
        )
    except Exception as e:
        logger.error(f"Auto-learning failed for '{name}': {e}")


# ---------------------------------------------------------------------------
# Main endpoint
# ---------------------------------------------------------------------------

@router.post("/chat/diagnostic")
async def chat_diagnostic(
    request: DiagnosticRequest,
    user: Optional[AuthUser] = Depends(get_optional_user),
):
    """Chat-based diagnostic with SSE streaming. Enhanced with dynamic catalogue,
    formulaic confidence, user profile, and connected journey."""
    messages = request.messages

    async def event_stream():
        try:
            # P2: LLM-based context extraction
            context = await _extract_context_llm(messages)

            # Merge explicit context from frontend (overrides extraction)
            if request.context:
                for key, value in request.context.items():
                    context[key] = value

            # P1: Load user profile if authenticated
            profile = await _load_user_profile(user)
            profile_text = _format_profile_context(profile) if profile else ""

            # Enrich context from profile (fill gaps)
            if profile:
                if not context.get("skin_type") and profile.get("skin_type"):
                    context["skin_type"] = profile["skin_type"]
                if not context.get("age") and profile.get("age_range"):
                    context["age_range"] = profile["age_range"]

            # Rules engine
            rules_text = ""
            rules_count = 0
            if context.get("area") or context.get("concern"):
                from core.rules.engine import RulesEngine
                engine = RulesEngine()
                rules_context = {}
                if context.get("area"):
                    rules_context["area"] = context["area"]
                if context.get("wrinkle_type"):
                    rules_context["wrinkle_type"] = context["wrinkle_type"]
                if context.get("pregnancy"):
                    rules_context["pregnancy"] = True
                if context.get("age"):
                    rules_context["age"] = context["age"]
                # P1: inject profile-based rules
                if context.get("skin_type"):
                    rules_context["skin_type"] = context["skin_type"]

                rule_outputs = engine.evaluate(rules_context)
                rules_count = len(rule_outputs)
                if rule_outputs:
                    rules_text = "\n=== REGLES CLINIQUES ===\n"
                    for r in rule_outputs:
                        rules_text += f"- [{r.type.upper()}] {r.detail}\n"

            # RAG retrieval
            evidence_text = ""
            evidence_count = 0
            if context.get("concern") or context.get("area"):
                from core.rag.retriever import retrieve_evidence
                query = f"{context.get('concern', '')} {context.get('area', '')} aesthetic procedure"
                chunks = await retrieve_evidence(query, limit=3)
                evidence_count = len(chunks)
                if chunks:
                    evidence_text = "\n=== PREUVES SCIENTIFIQUES ===\n"
                    for c in chunks:
                        evidence_text += f"Source: {c['source']}\n{c['text'][:300]}\n---\n"

            # P0: Dynamic procedure catalogue
            catalogue_text, slug_map = await _load_procedure_catalogue()

            # P0: Formulaic confidence score
            user_msg_count = sum(1 for m in messages if m.role == "user")
            confidence_score = _compute_confidence_score(
                context, rules_count, evidence_count, slug_map,
                profile=profile,
            )

            # Build system prompt (integrates all improvements)
            system_prompt = _build_chat_system_prompt(
                request.language, context, user_msg_count,
                catalogue_text, confidence_score, profile_text,
            )

            # Build user content — last 4 messages max
            recent_messages = messages[-4:] if len(messages) > 4 else messages
            conversation_text = "\n".join([
                f"{'User' if m.role == 'user' else 'BigSis'}: {m.content}"
                for m in recent_messages
            ])

            enriched_prompt = f"""{conversation_text}
{rules_text}{evidence_text}
Reponds maintenant. Si tu generes la synthese, inclus OBLIGATOIREMENT le bloc $$DIAGNOSTIC_JSON$$."""

            # Stream response
            async for token in orchestrator.llm_client.stream_response(
                system_prompt=system_prompt,
                user_content=enriched_prompt,
                model_override="gpt-4o-mini"
            ):
                yield f"data: {json.dumps({'token': token})}\n\n"

            # P1: Send enrichment metadata after stream (slug_map for TRS badges)
            enrichment = {}
            learning_slugs = []
            for slug, entry in slug_map.items():
                has_fiche = entry.get("has_fiche", False)
                trs = entry.get("trs")
                if has_fiche or trs:
                    enrichment[slug] = {
                        "has_fiche": has_fiche,
                        "trs": trs,
                    }
                else:
                    # No fiche, no TRS → candidate for auto-learning
                    enrichment[slug] = {
                        "has_fiche": False,
                        "trs": None,
                        "learning": True,
                    }
                    learning_slugs.append(slug)

            if enrichment:
                yield f"data: {json.dumps({'enrichment': enrichment})}\n\n"

            # Auto-learning: trigger background learning for procedures without fiches
            if learning_slugs:
                triggered = await _trigger_auto_learning(learning_slugs, slug_map)
                if triggered:
                    yield f"data: {json.dumps({'learning_triggered': triggered})}\n\n"

            yield f"data: {json.dumps({'done': True})}\n\n"

        except Exception as e:
            logger.error(f"Chat diagnostic error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
