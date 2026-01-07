from typing import Dict, List, Any
from sqlalchemy import select
from core.llm_client import LLMClient
from core.prompts import (
    APP_SYSTEM_PROMPT, APP_USER_PROMPT_TEMPLATE,
    SOCIAL_SYSTEM_PROMPT, SOCIAL_USER_PROMPT_TEMPLATE,
    RECOMMENDATION_SYSTEM_PROMPT, RECOMMENDATION_USER_PROMPT_TEMPLATE
)
from core.rag.retriever import retrieve_evidence
from core.pubmed import ingest_pubmed_results
from core.db.database import AsyncSessionLocal
from core.db.models import SocialGeneration, Procedure
from api.schemas import FicheMaster
from core.sources.pubmed import search_pubmed, fetch_details
from core.sources.openfda import get_fda_adverse_events
from core.sources.clinical import get_ongoing_trials
from core.sources.pubchem import get_chemical_safety
from core.sources.semanticscholar import get_influential_studies
import re
import unicodedata

RECOMMENDATION_USER_PROMPT_TEMPLATE = """
Voici le corpus documentaire et les procédures disponibles dans le catalogue pour répondre à la demande : "{topic}".

--- DÉBUT DU CORPUS ---
{corpus_text}
--- FIN DU CORPUS ---

Sélectionne les meilleures procédures dans le CATALOGUE ci-dessus qui répondent au besoin. 
Si une procédure n'est pas dans le catalogue mais est pertinente scientifiquement selon le corpus, tu peux la suggérer.
"""

class SocialContentGenerator:
    """
    Orchestrates the generation of BigSIS Social Content (Fiche Verité) or Recommendations.
    Unifies RAG, Specialized Scrapers (FDA, Trials, etc.), and LLM orchestration.
    """
    
    def __init__(self):
        self.llm = LLMClient()

    def _clean_abstract(self, text):
        if not text: return "Non disponible"
        text = re.sub(r'\S+@\S+', '', text)
        text = re.sub(r'© \d{4}.*', '', text)
        text = re.sub(r'Copyright.*', '', text)
        text = re.sub(r'DOI:.*', '', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def _normalize_text(self, value: str) -> str:
        if not value: return ""
        normalized = unicodedata.normalize("NFKD", value)
        return normalized.encode("ascii", "ignore").decode("ascii").lower()
        
    async def generate_social_content(self, topic: str, system_prompt: str = None) -> Dict:
        # Step 0: Check Cache
        async with AsyncSessionLocal() as session:
            stmt = select(SocialGeneration).where(SocialGeneration.topic == topic).order_by(SocialGeneration.created_at.desc()).limit(1)
            result = await session.execute(stmt)
            cached_gen = result.scalar_one_or_none()
            
            if cached_gen:
                print(f"[SocialAgent] ✅ Cache hit for: {topic}")
                return cached_gen.content

        # Step 1: Check existing knowledge (RAG)
        print(f"[SocialAgent] Checking RAG for: {topic}")
        # Search queries adapted to the topic
        sub_queries = [
            f"efficacy and mechanism of {topic}",
            f"side effects, risks and recovery downtime for {topic}",
        ]
        
        corpus_parts = []
        seen_chunks = set()
        
        for q in sub_queries:
            chunks = await retrieve_evidence(q, limit=5)
            for c in chunks:
                if c['chunk_id'] not in seen_chunks:
                    corpus_parts.append(f"Source: {c['source']}\nContent: {c['text']}\n---")
                    seen_chunks.add(c['chunk_id'])
        
        # Step 2: Ingest only if needed (Threshold: 3 chunks)
        # Skip ingestion for pure Diagnostic/Recommendation if data is OK
        if len(corpus_parts) < 3 and "RECOMMENDATION" not in topic:
            print(f"[SocialAgent] 🧪 Knowledge low, searching PubMed for: {topic}")
            query = f"{topic} AND (skin OR dermatology OR aesthetic)" 
            await ingest_pubmed_results(query)
            
            # Re-retrieve after ingestion
            new_chunks = await retrieve_evidence(f"clinical data for {topic}", limit=5)
            for c in new_chunks:
                if c['chunk_id'] not in seen_chunks:
                    corpus_parts.append(f"Source: {c['source']}\nContent: {c['text']}\n---")
                    seen_chunks.add(c['chunk_id'])

        corpus_text = "\n".join(corpus_parts)
        if not corpus_text:
            corpus_text = "Aucune donnée scientifique spécifique trouvée dans la base. Utilise tes connaissances expertes générales."

        # Step 3: Retrieve catalog procedures (Structured context)
        context_procedures = []
        async with AsyncSessionLocal() as session:
            result_db = await session.execute(select(Procedure))
            procedures = result_db.scalars().all()
            for p in procedures:
                context_procedures.append(f"- Name: {p.name}\n  Desc: {p.description}\n  Downtime: {p.downtime}\n  Price: {p.price_range}")
        
        kb_context = "\n".join(context_procedures) if context_procedures else "AUCUNE PROCÉDURE STRUCTUREE DANS LE CATALOGUE."

        # Step 4: Specialized Scouts (Scraping FDA, Trials, etc.)
        # We only do this for FICHE mode to keep it rich
        specialized_context = ""
        is_recommendation = (system_prompt == RECOMMENDATION_SYSTEM_PROMPT or "[RECOMMENDATION]" in topic)
        
        if not is_recommendation:
            print(f"[SocialAgent] 🔍 Gathering specialized context for: {topic}")
            try:
                fda = get_fda_adverse_events(topic)
                trials = get_ongoing_trials(topic)
                chem = get_chemical_safety(topic)
                scholar = get_influential_studies(f"{topic} efficacy")
                
                specialized_context = f"\n=== FDA ADVERSE EVENTS ===\n{fda}\n"
                specialized_context += f"\n=== CLINICAL TRIALS ===\n{trials}\n"
                specialized_context += f"\n=== CHEMICAL SAFETY ===\n{chem}\n"
                if scholar:
                    specialized_context += "\n=== SCHOLAR STUDIES ===\n"
                    for s in scholar[:3]:
                        specialized_context += f"- {s.get('titre')}\n  {self._clean_abstract(s.get('resume'))[:300]}...\n"
            except Exception as e:
                print(f"Warn: Specialized scouts failed: {e}")

        # Step 5: Determine Template & System Prompt
        is_social = "[SOCIAL]" in topic
        
        if is_recommendation:
            system_prompt = RECOMMENDATION_SYSTEM_PROMPT
            user_template = RECOMMENDATION_USER_PROMPT_TEMPLATE
        elif is_social:
            system_prompt = SOCIAL_SYSTEM_PROMPT
            user_template = SOCIAL_USER_PROMPT_TEMPLATE
        else:
            # Default to App Fiche
            system_prompt = APP_SYSTEM_PROMPT
            user_template = APP_USER_PROMPT_TEMPLATE

        user_prompt = user_template.format(
            topic=topic,
            corpus_text=f"{corpus_text}\n{specialized_context}\n\n=== CATALOGUE DE PROCEDURES ===\n{kb_context}"
        )
        
        print(f"[SocialAgent] 🧠 Generating with LLM (gpt-4o)... Mode: {'Recs' if is_recommendation else 'Fiche'}")
        try:
            response_data = await self.llm.generate_response(
                system_prompt=system_prompt,
                user_content=user_prompt,
                model_override="gpt-4o",
                json_mode=True
            )
            
            # Step 5: Cache & Return
            # We cache if it's a valid response
            is_valid = False
            if isinstance(response_data, dict):
                if is_recommendation and "recommendations" in response_data:
                    is_valid = True
                elif not is_recommendation:
                    try:
                        # Internal validation against schema
                        FicheMaster(**response_data)
                        is_valid = True
                    except Exception as ve:
                        print(f"Warn: LLM output failed schema validation: {ve}")
                        is_valid = False

            if is_valid:
                print(f"[SocialAgent] 💾 Caching result for: {topic}")
                async with AsyncSessionLocal() as session:
                    new_gen = SocialGeneration(topic=topic, content=response_data)
                    session.add(new_gen)
                    await session.commit()
            
            return response_data
            
        except Exception as e:
            print(f"❌ Social Generation Failed: {e}")
            return {"error": str(e)}
