from typing import Dict, List
from sqlalchemy import select
from core.llm_client import LLMClient
from core.social.prompts import SOCIAL_SYSTEM_PROMPT, SOCIAL_USER_PROMPT_TEMPLATE
from core.rag.retriever import retrieve_evidence
from core.pubmed import ingest_pubmed_results
from core.db.database import AsyncSessionLocal
from core.db.models import SocialGeneration

class SocialContentGenerator:
    """
    Orchestrates the generation of BigSIS Social Content (Fiche Verité).
    1. Checks Cache (SocialGeneration table).
    2. Searches & Ingests PubMed Data (Real-time or cached).
    3. Retrieves relevant chunks via RAG.
    4. Generates JSON content using the Social Persona.
    5. Caches result.
    """
    
    def __init__(self):
        self.llm = LLMClient()
        
    async def generate_social_content(self, topic: str) -> Dict:
        # Step 0: Check Cache
        async with AsyncSessionLocal() as session:
            stmt = select(SocialGeneration).where(SocialGeneration.topic == topic).order_by(SocialGeneration.created_at.desc()).limit(1)
            result = await session.execute(stmt)
            cached_gen = result.scalar_one_or_none()
            
            if cached_gen:
                print(f"[SocialAgent] ✅ Cache hit for: {topic}")
                return cached_gen.content

        # Step 1: Ensure we have knowledge (Ingestion)
        # We trigger a focused PubMed search to ensure fresh data
        print(f"[SocialAgent] Searching PubMed for: {topic}")
        # Construct a scientific query from the topic
        # Basic heuristic: if it's "Retinol", query is "Retinol AND skin"
        query = f"{topic} AND (skin OR dermatology)" 
        await ingest_pubmed_results(query)
        
        # Step 2: Retrieve Evidence (RAG)
        # We ask specific questions to build the corpus
        sub_queries = [
            f"efficacy of {topic} for skin",
            f"side effects and safety of {topic}",
            f"clinical trials results for {topic}",
            f"recovery time and social downtime for {topic}"
        ]
        
        corpus_parts = []
        seen_chunks = set()
        
        print(f"[SocialAgent] Retrieving RAG evidence...")
        for q in sub_queries:
            chunks = await retrieve_evidence(q, limit=3)
            for c in chunks:
                if c['chunk_id'] not in seen_chunks:
                    corpus_parts.append(f"Source: {c['source']}\nContent: {c['text']}\n---")
                    seen_chunks.add(c['chunk_id'])
        
        corpus_text = "\n".join(corpus_parts)
        
        if not corpus_text:
            corpus_text = "Aucune donnée scientifique spécifique trouvée dans la base. Utilise tes connaissances générales."

        # Step 3: Generate Content (LLM)
        user_prompt = SOCIAL_USER_PROMPT_TEMPLATE.format(
            topic=topic,
            corpus_text=corpus_text
        )
        
        print(f"[SocialAgent] Generating content with LLM...")
        try:
            # We use gpt-4o for high quality synthesis
            response_data = await self.llm.generate_response(
                system_prompt=SOCIAL_SYSTEM_PROMPT,
                user_content=user_prompt,
                model_override="gpt-4o",
                json_mode=True
            )
            
            # CHECK if response is the generic mock (missing core fields) and replace with Rich Demo Data
            if isinstance(response_data, dict) and ("mock" in response_data or "carte_identite" not in response_data):
                print("[SocialAgent] ⚠️ LLM Key Missing or Invalid. Returning RICH DEMO FICHE.")
                return {
                    "nom_scientifique": f"{topic} (DEMO)",
                    "nom_commercial_courant": topic,
                    "titre_social": f"{topic}: La Vérité Nue (Mode Démo)",
                    "carte_identite": {
                        "ce_que_c_est": "Donnée simulée car clé API manquante.",
                        "comment_ca_marche": "L'IA n'a pas pu être contactée.",
                        "mode_application": "N/A",
                        "zone_anatomique": "Visage"
                    },
                    "meta": {
                        "zones_concernees": ["Visage"],
                        "problemes_traites": ["Rides"]
                    },
                    "score_global": {
                        "note_efficacite_sur_10": 9,
                        "explication_efficacite_bref": "Gold standard simulé.",
                        "note_securite_sur_10": 8,
                        "explication_securite_bref": "Risques maitrisés.",
                        "verdict_final": "Ceci est un exemple de fiche."
                    },
                     "alternative_bigsis": {
                        "titre": "Aucune",
                        "pourquoi_c_est_mieux": "C'est déjà le top.",
                         "niveau_fiabilite": "Gold Standard"
                    },
                    "synthese_efficacite": {
                        "ce_que_ca_fait_vraiment": "Lisse les traits efficacement.",
                        "delai_resultat": "3-7 jours",
                        "duree_resultat": "3-4 mois"
                    },
                    "synthese_securite": {
                        "niveau_douleur_moyen": "3/10",
                        "risques_courants": ["Rougeurs", "Maux de tête"],
                        "le_risque_qui_fait_peur": "Ptosis (chute paupière)"
                    },
                    "recuperation_sociale": {
                        "verdict_immediat": "Petites bosses 15min",
                        "downtime_visage_nu": "30 min",
                        "downtime_maquillage": "4h (Précaution)",
                        "zoom_ready": "Immédiat",
                        "date_ready": "Le soir même",
                        "les_interdits_sociaux": ["Sport 24h", "Sauna"] 
                    },
                    "le_conseil_bigsis": "Ceci est une donnée statique de démonstration. Configurez votre clé API pour avoir l'analyse réelle de PubMed.",
                    "statistiques_consolidees": {
                        "nombre_etudes_pertinentes_retenues": 12,
                        "nombre_patients_total": 5400,
                        "niveau_de_preuve_global": "Fort"
                    },
                    "annexe_sources_retenues": []
                }

            # Step 4: Cache Result
            # Only cache if it seems valid (has carte_identite) and NOT demo
            if "carte_identite" in response_data and "(DEMO)" not in response_data.get("nom_scientifique", ""):
                print(f"[SocialAgent] 💾 Caching result for: {topic}")
                async with AsyncSessionLocal() as session:
                    new_gen = SocialGeneration(topic=topic, content=response_data)
                    session.add(new_gen)
                    await session.commit()

            return response_data
            
        except Exception as e:
            print(f"❌ Social Generation Failed: {e}")
            return {"error": str(e)}
