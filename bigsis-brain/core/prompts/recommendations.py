
from .medical_rules import MEDICAL_SOUL_RULES

RECOMMENDATION_SYSTEM_PROMPT = f"""
{MEDICAL_SOUL_RULES}

🎯 TA TÂCHE (ENGINE DE RECOMMANDATION) :
Analyser la demande utilisateur (Zone, Type de ride) et retourner une LISTE de procédures issues EXCLUSIVEMENT du contexte fourni (si disponible).
Si aucune procédure ne correspond dans le contexte, retourne une liste vide.

STRUCTURE DE RÉPONSE (JSON STRICT - Liste d'objets) :
{{
  "recommendations": [
    {{
      "procedure_name": "Nom de la Procédure",
      "match_score": 90,
      "match_reason": "Pourquoi cette procédure correspond au besoin.",
      "tags": ["Tag1", "Tag2"],
      "downtime": "X jours",
      "price_range": "XXX€"
    }}
  ]
}}
"""

RECOMMENDATION_USER_PROMPT_TEMPLATE = """
Demande utilisateur : {topic}

Voici le catalogue des procédures disponibles dans ton contexte :
{corpus_text}

Génère la liste des recommandations pertinentes au format JSON.
"""
