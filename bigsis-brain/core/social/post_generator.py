"""
SocialPostGenerator — Generates Instagram carousel posts from published Fiches Verite.

Takes a FicheMaster JSON (from SocialGeneration.content) and a template type,
then uses LLM to produce structured slide content for Instagram carousels.

Hybrid approach: fiche data (structure/skeleton) + RAG chunks (rich evidence).

Templates: verdict, vrai_faux, chiffres, face_a_face, prix_verite, timeline_recup
"""

import json
import re
import logging
from typing import Dict, Any, List, Optional

from core.llm_client import LLMClient
from core.rag.retriever import retrieve_evidence
from core.prompts.social_posts import (
    VERDICT_SYSTEM_PROMPT, VERDICT_USER_TEMPLATE,
    VRAI_FAUX_SYSTEM_PROMPT, VRAI_FAUX_USER_TEMPLATE,
    CHIFFRES_SYSTEM_PROMPT, CHIFFRES_USER_TEMPLATE,
    FACE_A_FACE_SYSTEM_PROMPT, FACE_A_FACE_USER_TEMPLATE,
    PRIX_VERITE_SYSTEM_PROMPT, PRIX_VERITE_USER_TEMPLATE,
    TIMELINE_RECUP_SYSTEM_PROMPT, TIMELINE_RECUP_USER_TEMPLATE,
)

logger = logging.getLogger(__name__)

TEMPLATE_MAP = {
    "verdict": (VERDICT_SYSTEM_PROMPT, VERDICT_USER_TEMPLATE),
    "vrai_faux": (VRAI_FAUX_SYSTEM_PROMPT, VRAI_FAUX_USER_TEMPLATE),
    "chiffres": (CHIFFRES_SYSTEM_PROMPT, CHIFFRES_USER_TEMPLATE),
    "face_a_face": (FACE_A_FACE_SYSTEM_PROMPT, FACE_A_FACE_USER_TEMPLATE),
    "prix_verite": (PRIX_VERITE_SYSTEM_PROMPT, PRIX_VERITE_USER_TEMPLATE),
    "timeline_recup": (TIMELINE_RECUP_SYSTEM_PROMPT, TIMELINE_RECUP_USER_TEMPLATE),
}

VALID_TEMPLATES = list(TEMPLATE_MAP.keys())

# Template display names (for UI)
TEMPLATE_LABELS = {
    "verdict": "Verdict BigSIS",
    "vrai_faux": "Vrai / Faux",
    "chiffres": "Les Chiffres",
    "face_a_face": "Face a Face",
    "prix_verite": "Prix de la Verite",
    "timeline_recup": "Timeline Recuperation",
}

# ---------------------------------------------------------------------------
# Template-specific sub-queries for RAG retrieval
# Each template needs different types of evidence from the corpus
# ---------------------------------------------------------------------------
_TEMPLATE_QUERIES = {
    "verdict": [
        "clinical efficacy outcomes results {proc}",
        "patient satisfaction score improvement {proc}",
        "side effects safety profile adverse events {proc}",
        "evidence level meta-analysis systematic review {proc}",
    ],
    "vrai_faux": [
        "common misconceptions myths beliefs {proc}",
        "mechanism of action how it works {proc}",
        "long term effects duration permanence {proc}",
        "clinical evidence debunking {proc}",
    ],
    "chiffres": [
        "clinical outcomes statistics percentage improvement {proc}",
        "patient satisfaction rate survey results {proc}",
        "recovery time downtime duration healing {proc}",
        "comparative efficacy numbers data {proc}",
    ],
    "face_a_face": [
        "comparison versus alternative treatment {proc}",
        "comparative clinical trial head to head {proc}",
        "advantages disadvantages pros cons {proc}",
        "patient preference satisfaction comparison {proc}",
    ],
    "prix_verite": [
        "cost pricing fee session {proc}",
        "number of sessions treatment frequency {proc}",
        "maintenance retreatment longevity duration results {proc}",
        "value cost-effectiveness compared alternative {proc}",
    ],
    "timeline_recup": [
        "recovery time downtime healing timeline {proc}",
        "return to activities work social recovery {proc}",
        "post procedure care restrictions first week {proc}",
        "swelling bruising resolution timeline {proc}",
    ],
}


class SocialPostGenerator:
    """Generates Instagram carousel content from FicheMaster data + RAG evidence."""

    def __init__(self):
        self.llm = LLMClient()

    async def generate_post(
        self,
        fiche_content: dict,
        template_type: str,
        procedure_topic: str = "",
    ) -> Dict[str, Any]:
        """
        Generate an Instagram carousel post from a published fiche + RAG evidence.

        Args:
            fiche_content: The FicheMaster JSONB content from SocialGeneration.content
            template_type: One of 'verdict', 'vrai_faux', 'chiffres', 'face_a_face'
            procedure_topic: The topic string from SocialGeneration.topic (e.g. "[SOCIAL] Micro-botox")

        Returns:
            Dict with 'slides', 'caption', 'hashtags' keys, or 'error' key on failure.
        """
        if template_type not in TEMPLATE_MAP:
            return {"error": f"Template inconnu: {template_type}. Valides: {VALID_TEMPLATES}"}

        system_prompt, user_template = TEMPLATE_MAP[template_type]

        # Extract fiche structure (skeleton)
        fiche_summary = self._extract_fiche_summary(fiche_content)

        if not fiche_summary.get("nom_commercial"):
            return {"error": "La fiche n'a pas de nom_commercial_courant"}

        # Derive clean procedure name for RAG queries
        procedure_name = self._derive_procedure_name(procedure_topic, fiche_content)

        # Retrieve template-specific RAG evidence (rich content)
        evidence_chunks = await self._retrieve_instagram_evidence(procedure_name, template_type)
        evidence_text = self._format_evidence_for_prompt(evidence_chunks)

        logger.info(
            f"Generating social post: template={template_type}, "
            f"procedure={procedure_name}, evidence_chunks={len(evidence_chunks)}"
        )

        # Build user prompt with fiche (structure) + evidence (flesh)
        user_prompt = user_template.format(
            fiche_data=json.dumps(fiche_summary, ensure_ascii=False, indent=2),
            evidence_chunks=evidence_text,
        )

        result = await self.llm.generate_response(
            system_prompt=system_prompt,
            user_content=user_prompt,
            model_override="gpt-4o",
            json_mode=True,
            temperature_override=0.6,
        )

        # Validate result
        if isinstance(result, dict) and "error" in result:
            logger.error(f"LLM error for social post: {result['error']}")
            return result

        # Validate slide structure
        validation_error = self._validate_post(result)
        if validation_error:
            logger.warning(f"Post validation failed: {validation_error}")
            return {"error": validation_error}

        logger.info(f"Social post generated: {len(result.get('slides', []))} slides, "
                     f"template={template_type}")

        return result

    # ------------------------------------------------------------------
    # Procedure name extraction
    # ------------------------------------------------------------------

    @staticmethod
    def _derive_procedure_name(procedure_topic: str, fiche_content: dict) -> str:
        """
        Derive a clean procedure name for RAG queries.
        Priority: explicit topic (strip [SOCIAL] prefix) > fiche nom_commercial_courant.
        """
        if procedure_topic:
            # Strip "[SOCIAL] " or any "[...] " prefix
            clean = re.sub(r'^\[.*?\]\s*', '', procedure_topic).strip()
            if clean:
                return clean
        return fiche_content.get("nom_commercial_courant", "")

    # ------------------------------------------------------------------
    # RAG evidence retrieval
    # ------------------------------------------------------------------

    async def _retrieve_instagram_evidence(
        self,
        procedure_name: str,
        template_type: str,
    ) -> List[dict]:
        """
        Retrieve RAG chunks tailored to the Instagram template type.
        Returns up to 8 chunks sorted by study quality (META > RCT > OTHER).
        Each chunk dict has: text, source, url, chunk_id, source_type, study_type.
        """
        if not procedure_name:
            return []

        queries = _TEMPLATE_QUERIES.get(template_type, _TEMPLATE_QUERIES["verdict"])

        seen_ids: set = set()
        all_chunks: List[dict] = []

        for query_template in queries:
            query = query_template.format(proc=procedure_name)
            try:
                chunks = await retrieve_evidence(query, limit=5)
                for c in chunks:
                    cid = c.get("chunk_id", "")
                    if cid and cid not in seen_ids:
                        seen_ids.add(cid)
                        c["study_type"] = self._classify_study_type(c.get("text", ""))
                        all_chunks.append(c)
            except Exception as e:
                logger.warning(f"RAG retrieval failed for query '{query[:60]}': {e}")
                continue

        # Sort: META first, then RCT, then OTHER
        type_order = {"META": 0, "RCT": 1, "OTHER": 2}
        all_chunks.sort(key=lambda c: type_order.get(c.get("study_type", "OTHER"), 2))

        return all_chunks[:8]

    @staticmethod
    def _classify_study_type(text: str) -> str:
        """Classify a chunk by study type for prioritized ordering."""
        t = text.lower()
        if any(kw in t for kw in [
            "meta-analysis", "meta analysis", "systematic review", "meta-analyse"
        ]):
            return "META"
        if any(kw in t for kw in [
            "randomized controlled", "randomised controlled", "rct",
            "double-blind", "double blind"
        ]):
            return "RCT"
        return "OTHER"

    @staticmethod
    def _format_evidence_for_prompt(chunks: List[dict]) -> str:
        """
        Format RAG chunks into a structured text block for the LLM prompt.
        Each chunk is labeled with its study type and source.
        Truncates each chunk to ~400 chars to stay within token budget.
        """
        if not chunks:
            return "Aucune donnee scientifique supplementaire disponible."

        lines = []
        for i, c in enumerate(chunks, 1):
            label = c.get("study_type", "OTHER")
            source = c.get("source", "Source inconnue")
            text = c.get("text", "")[:400].strip()
            if len(c.get("text", "")) > 400:
                text += "..."
            lines.append(f"[EVIDENCE {i} — {label}] (Source: {source})\n{text}")

        return "\n\n".join(lines)

    # ------------------------------------------------------------------
    # Fiche summary extraction
    # ------------------------------------------------------------------

    def _extract_fiche_summary(self, content: dict) -> dict:
        """
        Extract the fields relevant for post generation.
        Fiche = skeleton (scores, verdict, names, recovery data).
        """
        return {
            "nom_commercial": content.get("nom_commercial_courant", ""),
            "nom_scientifique": content.get("nom_scientifique", ""),
            "titre_social": content.get("titre_social", ""),
            "carte_identite": content.get("carte_identite", {}),
            "score_global": content.get("score_global", {}),
            "synthese_efficacite": content.get("synthese_efficacite", {}),
            "synthese_securite": content.get("synthese_securite", {}),
            "recuperation_sociale": content.get("recuperation_sociale", {}),
            "le_conseil_bigsis": content.get("le_conseil_bigsis", ""),
            "statistiques_consolidees": content.get("statistiques_consolidees", {}),
            "evidence_metadata": content.get("evidence_metadata", {}),
            "annexe_sources_retenues": content.get("annexe_sources_retenues", []),
            "meta": content.get("meta", {}),
        }

    # ------------------------------------------------------------------
    # Output validation
    # ------------------------------------------------------------------

    def _validate_post(self, result: dict) -> Optional[str]:
        """
        Validate the LLM output has the required structure.
        Returns None if valid, error string if invalid.
        """
        if not isinstance(result, dict):
            return "Le resultat n'est pas un dictionnaire JSON"

        slides = result.get("slides")
        if not slides or not isinstance(slides, list):
            return "Pas de slides dans le resultat"

        if len(slides) < 3:
            return f"Nombre de slides insuffisant: {len(slides)} (minimum 3)"

        if len(slides) > 6:
            return f"Trop de slides: {len(slides)} (maximum 6)"

        for i, slide in enumerate(slides):
            if not isinstance(slide, dict):
                return f"Slide {i+1} n'est pas un dictionnaire"
            if not slide.get("headline"):
                return f"Slide {i+1} n'a pas de headline"
            if not slide.get("type"):
                return f"Slide {i+1} n'a pas de type"

            # Ensure slide_number is set
            if "slide_number" not in slide:
                slide["slide_number"] = i + 1

            # Ensure background_style is set
            if not slide.get("background_style"):
                defaults = ["gradient_pink_violet", "dark_bold", "gradient_emerald_cyan", "warm_amber"]
                slide["background_style"] = defaults[i % len(defaults)]

        if not result.get("caption"):
            return "Pas de caption Instagram"

        if not result.get("hashtags") or not isinstance(result.get("hashtags"), list):
            return "Pas de hashtags"

        return None
