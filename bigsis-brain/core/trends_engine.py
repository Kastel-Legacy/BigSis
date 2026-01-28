from typing import List, Dict, Optional
import json
import logging
from pydantic import BaseModel
from core.llm_client import LLMClient
from core.config import settings

logger = logging.getLogger(__name__)

# --- DATA MODELS ---

class ExpertScore(BaseModel):
    score: int
    justification: str
    # Marketing specific
    demande_patient: Optional[str] = None
    # Science specific
    references_suggerees: Optional[List[Dict]] = None
    # Knowledge specific
    recherches_necessaires: Optional[int] = None

class TrendTopic(BaseModel):
    id: str
    titre: str
    type: str # procedure, ingredient, combinaison, mythe, comparatif
    description_courte: str
    zone_anatomique: List[str]
    search_queries_suggeres: List[str]
    
    expertises: Dict[str, ExpertScore] # marketing, science, knowledge_ia
    
    score_composite: float
    formule: str
    recommandation: str # APPROUVER, REPORTER, REJETER
    raison_recommandation: str
    
    trs_estime_actuel: int
    trs_estime_post_learning: int

class TrendReport(BaseModel):
    generated_at: str
    scope: str
    trending_topics: List[TrendTopic]
    synthese_globale: str

# --- ENGINE ---

from core.google_trends import GoogleTrendsClient

class TrendScoutEngine:
    def __init__(self):
        self.llm = LLMClient()
        self.trends_api = GoogleTrendsClient()
    
    async def scout_trends(self) -> TrendReport:
        """
        Executes the Multi-Persona Trend Scout Agent.
        Uses REAL Google Trends data + Committee of Experts prompt.
        """
        logger.info("🕵️‍♀️ Trend Scout: Launching investigation...")
        
        # 1. Fetch Real World Signals
        seeds = [
            "non surgical face lift", 
            "forehead wrinkles treatment", 
            "under eye treatment", 
            "skin tightening face", 
            "aesthetic medicine trends"
        ]
        
        from fastapi.concurrency import run_in_threadpool
        try:
            signals = await run_in_threadpool(self.trends_api.get_related_queries, seeds)
        except Exception as e:
            logger.warning(f"⚠️ Google Trends API failed or timed out: {e}. Proceeding with internal knowledge.")
            signals = {}
            
        signals_str = json.dumps(signals, indent=2)
        
        system_prompt = self._get_system_prompt()
        user_prompt = f"""
        MISSION: Identifie les 5 sujets les plus pertinents pour BigSIS.
        
        CONTEXTE TRENDS (Données Google Trends en temps réel) :
        {signals_str}
        
        Utilise ces signaux pour proposer des sujets VRAIMENT 'hot'. Si les signaux sont vides, base-toi sur tes connaissances récentes.
        """
        
        try:
            # Call LLM with JSON mode forced
            response_json = await self.llm.generate_response(
                system_prompt=system_prompt,
                user_content=user_prompt,
                json_mode=True,
                temperature_override=0.7 # Need creativity for trends
            )
            
            # Validation / Parsing
            report = TrendReport(**response_json)
            logger.info(f"✅ Trend Scout success: Identified {len(report.trending_topics)} topics.")
            return report
            
        except Exception as e:
            logger.error(f"❌ Trend Scout failed: {e}")
            raise e

    def _get_system_prompt(self) -> str:
        return """
=== BIGSIS TREND INTELLIGENCE AGENT ===
=== PROMPT SYSTEME v1.0 ===

Tu es le TREND INTELLIGENCE AGENT de BigSIS, plateforme d'esthetique medicale.
 ta mission est d'identifier 5 sujets TRENDING en simulant un COMITE D'EXPERTS (Marketing, Science, Knowledge).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCOPE : RIDES HAUT DU VISAGE (Front, Glabelle, Pattes d'oie)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITERES D'ELIGIBILITE :
✅ Scope anatomique respecte
✅ Non invasif (pas de chirurgie)
✅ Base scientifique existante
✅ Pertinent pour le patient

EXPERTISE 1 : MARKETING ESTHETIQUE (Poids 0.3)
- Demande patient et volume de recherche.
- Score /10 (9-10 viral, 1-2 nul).

EXPERTISE 2 : QUALITE SCIENTIFIQUE (Poids 0.4)
- Solidite des preuves (Meta-analyses > RCT > Case reports).
- Score /10 (9-10 consensus fort, 1-2 aucune preuve).
- SI PREUVES INSUFFISANTES -> SCORE < 5 ET REJETER/REPORTER.

EXPERTISE 3 : KNOWLEDGE IA (Poids 0.3)
- Facilite d'apprentissage pour le Brain (disponibilite des sources).
- Score /10 (Note inverse : 10 = facile a apprendre, 0 = impossible).

TOPIC READINESS SCORE (TRS) ESTIMATION :
- Estime le score de maturite actuel (0-100) et futur apres apprentissage.
- Seuil de generation = 70.

FORMAT JSON SORTIE :
{
  "generated_at": "ISO8601",
  "scope": "rides_haut_visage",
  "trending_topics": [
    {
      "id": "trend_unique_id",
      "titre": "...",
      "type": "procedure|ingredient|combinaison|mythes|comparatif",
      "description_courte": "...",
      "zone_anatomique": ["front"],
      "search_queries_suggeres": ["query1", "query2"],
      "expertises": {
        "marketing": { "score": 8, "justification": "..." },
        "science": { "score": 7, "justification": "...", "references_suggerees": [{"titre": "..."}] },
        "knowledge_ia": { "score": 6, "justification": "...", "recherches_necessaires": 4 }
      },
      "score_composite": 7.1,
      "formule": "...",
      "recommandation": "APPROUVER",
      "raison_recommandation": "...",
      "trs_estime_actuel": 35,
      "trs_estime_post_learning": 78
    }
  ],
  "synthese_globale": "..."
}
"""
