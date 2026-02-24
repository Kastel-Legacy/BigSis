import re
import json
import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from api.schemas import DiagnosticRequest
from core.orchestrator import Orchestrator

logger = logging.getLogger(__name__)
router = APIRouter()
orchestrator = Orchestrator()


def _extract_context_from_messages(messages: list) -> dict:
    """Parse conversation to extract structured clinical context via keywords."""
    context = {}
    full_text = " ".join([m.content.lower() for m in messages if m.role == "user"])

    # Zone detection
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

    # Wrinkle type detection
    if any(w in full_text for w in ["expression", "ride d'expression", "quand je souris", "quand je fronce"]):
        context["wrinkle_type"] = "expression"
    elif any(w in full_text for w in ["statique", "permanente", "toujours visible", "repos", "meme au repos"]):
        context["wrinkle_type"] = "statique"

    # Concern / topic detection
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

    # Pregnancy
    if any(w in full_text for w in ["enceinte", "grossesse", "allaite", "allaitement", "pregnant"]):
        context["pregnancy"] = True

    # Age
    age_match = re.search(r'\b(\d{2})\s*ans\b', full_text)
    if age_match:
        context["age"] = int(age_match.group(1))

    # Budget
    budget_match = re.search(r'(\d+)\s*(?:€|euro|eur)', full_text)
    if budget_match:
        context["budget"] = int(budget_match.group(1))

    # Previous treatments
    if any(w in full_text for w in ["deja fait", "deja eu", "deja essaye", "precedent traitement"]):
        context["previous_treatment"] = True

    return context


def _build_chat_system_prompt(language: str, context: dict, msg_count: int) -> str:
    """Build BigSis chat system prompt. Converge FAST toward a diagnostic."""
    has_zone = "area" in context
    has_concern = "concern" in context
    has_enough = has_zone or has_concern or msg_count >= 2

    base_prompt = """Tu es BigSis, la grande soeur bienveillante et experte en esthetique medicale.

PERSONNALITE :
- Ton direct, chaleureux, sans bullshit. Tu tutoies.
- Tu ne diagnostiques PAS et tu ne prescris PAS. Tu informes.
- ECONOMIE DE TOKENS : sois concise, va droit au but.

"""

    if has_enough:
        zone_label = context.get("area", "non precisee")
        concern_label = context.get("concern", "esthetique generale")
        base_prompt += f"""GENERE LA SYNTHESE MAINTENANT. Zone: {zone_label}. Sujet: {concern_label}.

Format OBLIGATOIRE de ta reponse :
1. UNE phrase d'accroche personnalisee (max 20 mots)
2. Le bloc JSON ci-dessous (OBLIGATOIRE, meme si les infos sont partielles)

$$DIAGNOSTIC_JSON$$
{{"score_confiance": 65, "zone": "{zone_label}", "concern": "{concern_label}", "options": [{{"name": "Nom procedure", "pertinence": "haute", "slug": "slug-fiche"}}], "risques": ["risque 1"], "questions_praticien": ["question 1"], "safety_warnings": []}}
$$DIAGNOSTIC_JSON$$

Slugs valides : "botox", "acide-hyaluronique", "peeling-chimique", "skinbooster", "microneedling", "laser-fractionne".
score_confiance : 40-60 si peu d'infos, 60-80 si zone+concern clairs, 80-90 si contexte riche.
Propose 2-3 options pertinentes, triees par pertinence.
La phrase d'accroche doit etre utile, pas du remplissage.
"""
    else:
        base_prompt += """L'utilisatrice vient d'arriver. Tu n'as ni zone ni preoccupation.
Reponds en UNE phrase + UNE question directe pour obtenir l'info.
Exemple : "Hello ! C'est quoi ta preoccupation principale — des rides, un traitement qui t'intrigue, ou autre chose ?"
MAX 2 phrases au total.
"""

    return base_prompt


@router.post("/chat/diagnostic")
async def chat_diagnostic(request: DiagnosticRequest):
    """Chat-based diagnostic with SSE streaming."""
    messages = request.messages

    async def event_stream():
        try:
            context = _extract_context_from_messages(messages)

            # Merge explicit context from frontend (overrides keyword extraction)
            if request.context:
                for key, value in request.context.items():
                    context[key] = value

            # Rules engine
            rules_text = ""
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

                rule_outputs = engine.evaluate(rules_context)
                if rule_outputs:
                    rules_text = "\n=== REGLES CLINIQUES ===\n"
                    for r in rule_outputs:
                        rules_text += f"- [{r.type.upper()}] {r.detail}\n"

            # RAG retrieval
            evidence_text = ""
            if context.get("concern") or context.get("area"):
                from core.rag.retriever import retrieve_evidence
                query = f"{context.get('concern', '')} {context.get('area', '')} aesthetic procedure"
                chunks = await retrieve_evidence(query, limit=3)
                if chunks:
                    evidence_text = "\n=== PREUVES SCIENTIFIQUES ===\n"
                    for c in chunks:
                        evidence_text += f"Source: {c['source']}\n{c['text'][:300]}\n---\n"

            # System prompt
            user_msg_count = sum(1 for m in messages if m.role == "user")
            system_prompt = _build_chat_system_prompt(request.language, context, user_msg_count)

            # Build user content — last 4 messages max
            recent_messages = messages[-4:] if len(messages) > 4 else messages
            conversation_text = "\n".join([
                f"{'User' if m.role == 'user' else 'BigSis'}: {m.content}"
                for m in recent_messages
            ])

            enriched_prompt = f"""{conversation_text}
{rules_text}{evidence_text}
Reponds maintenant. Si tu generes la synthese, inclus OBLIGATOIREMENT le bloc $$DIAGNOSTIC_JSON$$."""

            # Stream
            async for token in orchestrator.llm_client.stream_response(
                system_prompt=system_prompt,
                user_content=enriched_prompt,
                model_override="gpt-4o-mini"
            ):
                yield f"data: {json.dumps({'token': token})}\n\n"

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
