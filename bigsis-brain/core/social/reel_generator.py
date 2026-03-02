"""
ReelGenerator — Generates Instagram Reel video props from published Fiches Verite.

Takes a FicheMaster JSON (from SocialGeneration.content) and a reel template type,
then uses LLM to produce structured Remotion props for video rendering.

Hybrid approach: fiche data (structure/skeleton) + RAG chunks (rich evidence).

Templates: score_reveal, mythbuster, price_reveal
"""

import json
import re
import logging
from typing import Dict, Any, List, Optional

from core.llm_client import LLMClient
from core.rag.retriever import retrieve_evidence
from core.prompts.social_reels import (
    SCORE_REVEAL_SYSTEM_PROMPT, SCORE_REVEAL_USER_TEMPLATE,
    MYTHBUSTER_SYSTEM_PROMPT, MYTHBUSTER_USER_TEMPLATE,
    PRICE_REVEAL_SYSTEM_PROMPT, PRICE_REVEAL_USER_TEMPLATE,
    REEL_QUERIES,
)

logger = logging.getLogger(__name__)

REEL_TEMPLATE_MAP = {
    "score_reveal": (SCORE_REVEAL_SYSTEM_PROMPT, SCORE_REVEAL_USER_TEMPLATE),
    "mythbuster": (MYTHBUSTER_SYSTEM_PROMPT, MYTHBUSTER_USER_TEMPLATE),
    "price_reveal": (PRICE_REVEAL_SYSTEM_PROMPT, PRICE_REVEAL_USER_TEMPLATE),
}

VALID_REEL_TEMPLATES = list(REEL_TEMPLATE_MAP.keys())

# Template display names (for UI)
REEL_TEMPLATE_LABELS = {
    "score_reveal": "Score Reveal",
    "mythbuster": "MythBuster",
    "price_reveal": "Price Reveal",
}

# Remotion composition IDs matching Root.tsx registrations
REEL_COMPOSITION_IDS = {
    "score_reveal": "ScoreReveal",
    "mythbuster": "MythBuster",
    "price_reveal": "PriceReveal",
}


class ReelGenerator:
    """Generates Instagram Reel Remotion props from FicheMaster data + RAG evidence."""

    def __init__(self):
        self.llm = LLMClient()

    async def generate_reel_props(
        self,
        fiche_content: dict,
        reel_template: str,
        procedure_topic: str = "",
    ) -> Dict[str, Any]:
        """
        Generate Remotion props for a Reel video from a published fiche + RAG evidence.

        Args:
            fiche_content: The FicheMaster JSONB content from SocialGeneration.content
            reel_template: One of 'score_reveal', 'mythbuster', 'price_reveal'
            procedure_topic: The topic string from SocialGeneration.topic

        Returns:
            Dict with 'reel_props', 'caption', 'hashtags' keys, or 'error' key on failure.
        """
        if reel_template not in REEL_TEMPLATE_MAP:
            return {"error": f"Template reel inconnu: {reel_template}. Valides: {VALID_REEL_TEMPLATES}"}

        system_prompt, user_template = REEL_TEMPLATE_MAP[reel_template]

        # Extract fiche structure (skeleton)
        fiche_summary = self._extract_fiche_summary(fiche_content)

        if not fiche_summary.get("nom_commercial"):
            return {"error": "La fiche n'a pas de nom_commercial_courant"}

        # Derive clean procedure name for RAG queries
        procedure_name = self._derive_procedure_name(procedure_topic, fiche_content)

        # Retrieve template-specific RAG evidence
        evidence_chunks = await self._retrieve_reel_evidence(procedure_name, reel_template)
        evidence_text = self._format_evidence_for_prompt(evidence_chunks)

        logger.info(
            f"Generating reel props: template={reel_template}, "
            f"procedure={procedure_name}, evidence_chunks={len(evidence_chunks)}"
        )

        # Build user prompt
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

        # Handle LLM error
        if isinstance(result, dict) and "error" in result:
            logger.error(f"LLM error for reel: {result['error']}")
            return result

        # Validate result
        validation_error = self._validate_reel_props(result, reel_template)
        if validation_error:
            logger.warning(f"Reel props validation failed: {validation_error}")
            return {"error": validation_error}

        logger.info(
            f"Reel props generated: template={reel_template}, "
            f"procedure={procedure_name}"
        )

        return result

    # ------------------------------------------------------------------
    # Procedure name extraction (same as post_generator.py)
    # ------------------------------------------------------------------

    @staticmethod
    def _derive_procedure_name(procedure_topic: str, fiche_content: dict) -> str:
        """Derive a clean procedure name for RAG queries."""
        if procedure_topic:
            clean = re.sub(r'^\[.*?\]\s*', '', procedure_topic).strip()
            if clean:
                return clean
        return fiche_content.get("nom_commercial_courant", "")

    # ------------------------------------------------------------------
    # RAG evidence retrieval
    # ------------------------------------------------------------------

    async def _retrieve_reel_evidence(
        self,
        procedure_name: str,
        reel_template: str,
    ) -> List[dict]:
        """
        Retrieve RAG chunks tailored to the Reel template type.
        Returns up to 6 chunks sorted by study quality.
        """
        if not procedure_name:
            return []

        queries = REEL_QUERIES.get(reel_template, REEL_QUERIES["score_reveal"])

        seen_ids: set = set()
        all_chunks: List[dict] = []

        for query_template in queries:
            query = query_template.format(proc=procedure_name)
            try:
                chunks = await retrieve_evidence(query, limit=4)
                for c in chunks:
                    cid = c.get("chunk_id", "")
                    if cid and cid not in seen_ids:
                        seen_ids.add(cid)
                        c["study_type"] = self._classify_study_type(c.get("text", ""))
                        all_chunks.append(c)
            except Exception as e:
                logger.warning(f"RAG retrieval failed for reel query '{query[:60]}': {e}")
                continue

        # Sort: META first, then RCT, then OTHER
        type_order = {"META": 0, "RCT": 1, "OTHER": 2}
        all_chunks.sort(key=lambda c: type_order.get(c.get("study_type", "OTHER"), 2))

        return all_chunks[:6]

    @staticmethod
    def _classify_study_type(text: str) -> str:
        """Classify a chunk by study type."""
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
        """Format RAG chunks for the LLM prompt."""
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
    # Fiche summary extraction (same as post_generator.py)
    # ------------------------------------------------------------------

    def _extract_fiche_summary(self, content: dict) -> dict:
        """Extract fields relevant for reel generation."""
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

    def _validate_reel_props(self, result: dict, reel_template: str) -> Optional[str]:
        """
        Validate the LLM output has the required Remotion props.
        Returns None if valid, error string if invalid.
        """
        if not isinstance(result, dict):
            return "Le resultat n'est pas un dictionnaire JSON"

        reel_props = result.get("reel_props")
        if not reel_props or not isinstance(reel_props, dict):
            return "Pas de reel_props dans le resultat"

        if not result.get("caption"):
            return "Pas de caption Instagram"

        if not result.get("hashtags") or not isinstance(result.get("hashtags"), list):
            return "Pas de hashtags"

        # Template-specific validation
        if reel_template == "score_reveal":
            return self._validate_score_reveal(reel_props)
        elif reel_template == "mythbuster":
            return self._validate_mythbuster(reel_props)
        elif reel_template == "price_reveal":
            return self._validate_price_reveal(reel_props)

        return None

    @staticmethod
    def _validate_score_reveal(props: dict) -> Optional[str]:
        """Validate ScoreReveal props."""
        required = ["procedureName", "scoreGlobal", "scoreEfficacite", "scoreSecurite",
                     "scoreSatisfaction", "verdictText", "ctaText"]
        for field in required:
            if field not in props:
                return f"ScoreReveal: champ manquant '{field}'"

        sg = props.get("scoreGlobal")
        if not isinstance(sg, (int, float)) or sg < 0 or sg > 100:
            return f"ScoreReveal: scoreGlobal invalide ({sg}), doit etre 0-100"

        for sub in ["scoreEfficacite", "scoreSecurite", "scoreSatisfaction"]:
            val = props.get(sub)
            if not isinstance(val, (int, float)) or val < 0 or val > 10:
                return f"ScoreReveal: {sub} invalide ({val}), doit etre 0-10"

        return None

    @staticmethod
    def _validate_mythbuster(props: dict) -> Optional[str]:
        """Validate MythBuster props."""
        required = ["procedureName", "mythStatement", "isTrue", "explanation",
                     "sciencePoints", "conseilBigsis", "ctaText"]
        for field in required:
            if field not in props:
                return f"MythBuster: champ manquant '{field}'"

        if not isinstance(props.get("isTrue"), bool):
            return "MythBuster: isTrue doit etre un boolean"

        sp = props.get("sciencePoints")
        if not isinstance(sp, list) or len(sp) < 1:
            return "MythBuster: sciencePoints doit etre une liste non-vide"

        return None

    @staticmethod
    def _validate_price_reveal(props: dict) -> Optional[str]:
        """Validate PriceReveal props."""
        required = ["procedureName", "priceMin", "priceMax", "currency",
                     "breakdownItems", "hiddenCosts", "verdictText", "ctaText"]
        for field in required:
            if field not in props:
                return f"PriceReveal: champ manquant '{field}'"

        pmin = props.get("priceMin")
        pmax = props.get("priceMax")
        if not isinstance(pmin, (int, float)) or not isinstance(pmax, (int, float)):
            return "PriceReveal: priceMin et priceMax doivent etre des nombres"

        if pmin >= pmax:
            return f"PriceReveal: priceMin ({pmin}) doit etre < priceMax ({pmax})"

        bi = props.get("breakdownItems")
        if not isinstance(bi, list) or len(bi) < 1:
            return "PriceReveal: breakdownItems doit etre une liste non-vide"

        for item in bi:
            if not isinstance(item, dict) or "label" not in item or "value" not in item:
                return "PriceReveal: chaque breakdownItem doit avoir 'label' et 'value'"

        hc = props.get("hiddenCosts")
        if not isinstance(hc, list) or len(hc) < 1:
            return "PriceReveal: hiddenCosts doit etre une liste non-vide"

        return None
