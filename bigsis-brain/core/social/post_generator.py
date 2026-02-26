"""
SocialPostGenerator — Generates Instagram carousel posts from published Fiches Verite.

Takes a FicheMaster JSON (from SocialGeneration.content) and a template type,
then uses LLM to produce structured slide content for Instagram carousels.

Templates: verdict, vrai_faux, chiffres, face_a_face
"""

import json
import logging
from typing import Dict, Any, List, Optional

from core.llm_client import LLMClient
from core.prompts.social_posts import (
    VERDICT_SYSTEM_PROMPT, VERDICT_USER_TEMPLATE,
    VRAI_FAUX_SYSTEM_PROMPT, VRAI_FAUX_USER_TEMPLATE,
    CHIFFRES_SYSTEM_PROMPT, CHIFFRES_USER_TEMPLATE,
    FACE_A_FACE_SYSTEM_PROMPT, FACE_A_FACE_USER_TEMPLATE,
)

logger = logging.getLogger(__name__)

TEMPLATE_MAP = {
    "verdict": (VERDICT_SYSTEM_PROMPT, VERDICT_USER_TEMPLATE),
    "vrai_faux": (VRAI_FAUX_SYSTEM_PROMPT, VRAI_FAUX_USER_TEMPLATE),
    "chiffres": (CHIFFRES_SYSTEM_PROMPT, CHIFFRES_USER_TEMPLATE),
    "face_a_face": (FACE_A_FACE_SYSTEM_PROMPT, FACE_A_FACE_USER_TEMPLATE),
}

VALID_TEMPLATES = list(TEMPLATE_MAP.keys())

# Template display names (for UI)
TEMPLATE_LABELS = {
    "verdict": "Verdict BigSIS",
    "vrai_faux": "Vrai / Faux",
    "chiffres": "Les Chiffres",
    "face_a_face": "Face a Face",
}


class SocialPostGenerator:
    """Generates Instagram carousel content from FicheMaster data."""

    def __init__(self):
        self.llm = LLMClient()

    async def generate_post(
        self,
        fiche_content: dict,
        template_type: str,
    ) -> Dict[str, Any]:
        """
        Generate an Instagram carousel post from a published fiche.

        Args:
            fiche_content: The FicheMaster JSONB content from SocialGeneration.content
            template_type: One of 'verdict', 'vrai_faux', 'chiffres', 'face_a_face'

        Returns:
            Dict with 'slides', 'caption', 'hashtags' keys, or 'error' key on failure.
        """
        if template_type not in TEMPLATE_MAP:
            return {"error": f"Template inconnu: {template_type}. Valides: {VALID_TEMPLATES}"}

        system_prompt, user_template = TEMPLATE_MAP[template_type]

        # Extract only the relevant fields to keep LLM context clean
        fiche_summary = self._extract_fiche_summary(fiche_content)

        if not fiche_summary.get("nom_commercial"):
            return {"error": "La fiche n'a pas de nom_commercial_courant"}

        user_prompt = user_template.format(
            fiche_data=json.dumps(fiche_summary, ensure_ascii=False, indent=2)
        )

        logger.info(f"Generating social post: template={template_type}, "
                     f"procedure={fiche_summary.get('nom_commercial', '?')}")

        result = await self.llm.generate_response(
            system_prompt=system_prompt,
            user_content=user_prompt,
            model_override="gpt-4o",
            json_mode=True,
            temperature_override=0.3,
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

    def _extract_fiche_summary(self, content: dict) -> dict:
        """
        Extract only the fields relevant for post generation.
        Keeps the LLM prompt focused and reduces token usage.
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
            "meta": content.get("meta", {}),
        }

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
