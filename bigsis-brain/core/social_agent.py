import re
import unicodedata
import json
import logging
from core.llm_client import LLMClient
from core.prompts import SYSTEM_PROMPT_SYNTHESE, USER_PROMPT_TEMPLATE_SYNTHESE
from core.sources.pubmed import search_pubmed, fetch_details
from core.sources.openfda import get_fda_adverse_events
from core.sources.clinical import get_ongoing_trials
from core.sources.pubchem import get_chemical_safety
from core.sources.semanticscholar import get_influential_studies

logger = logging.getLogger(__name__)

FACE_ZONE_KEYWORDS = {
    "front": ["front", "frontal", "glabelle", "rides du lion", "forehead"],
    "yeux": ["oeil", "yeux", "paupiere", "orbitaire", "cernes", "crow"],
    "joues": ["joue", "pommet", "malar", "zygom"],
    "nez": ["nez", "rhin", "nasal"],
    "levres": ["levre", "perioral", "bouche", "lip"],
    "menton": ["menton", "chin"],
    "machoire": ["machoire", "jaw", "mandibul", "masseter"],
    "cou": ["cou", "cervic", "neck", "decollete"],
    "frontotemporal": ["tempe", "temporal"]
}

def clean_abstract(text):
    """Clean text to save tokens."""
    if not text: return "Non disponible"
    text = re.sub(r'\S+@\S+', '', text)
    text = re.sub(r'© \d{4}.*', '', text)
    text = re.sub(r'Copyright.*', '', text)
    text = re.sub(r'DOI:.*', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def _normalize_text(value: str) -> str:
    if not value:
        return ""
    normalized = unicodedata.normalize("NFKD", value)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    return ascii_text.lower()

def infer_face_zones(master_data: dict, topic: str) -> list:
    """Derive face zones from data."""
    zones = set()
    meta = master_data.get("meta", {})
    carte_identite = master_data.get("carte_identite", {})
    
    def map_zone(raw_zone: str):
        slug = _normalize_text(raw_zone)
        if not slug:
            return
        for canonical, keywords in FACE_ZONE_KEYWORDS.items():
            if canonical in slug:
                zones.add(canonical)
                return
            if any(keyword in slug for keyword in keywords):
                zones.add(canonical)
                return
    
    for zone in meta.get("zones_concernees", []) or []:
        map_zone(zone)
    
    text_pool = [
        carte_identite.get("zone_anatomique", ""),
        master_data.get("titre_social", ""),
        master_data.get("titre_officiel", ""),
        topic or ""
    ]
    
    for text in text_pool:
        map_zone(text)
    
    if not zones:
        zones.add("general")
    
    return sorted(zones)

class SocialAgent:
    def __init__(self):
        self.llm_client = LLMClient()

    async def generate(self, topic: str, problem: str = None) -> dict:
        logger.info(f"🚀 BIG SIS Brain - Social Agent - Topic: {topic}")
        
        # 1. Gather Context (Parallellizable ideally, but sequential for now/as per original)
        # Note: Original code used synchronous calls. We fit them in async wrapper if needed or just call.
        # Assuming source functions are synchronous for now (based on import).
        # In a real async app we might want to run_in_executor or make them async.
        # For V1 migration we keep it simple.
        
        try:
            fda_data = get_fda_adverse_events(topic)
            clinical_data = get_ongoing_trials(topic)
            chem_data = get_chemical_safety(topic)
        except Exception as e:
            logger.error(f"Error gathering context: {e}")
            fda_data, clinical_data, chem_data = "N/A", "N/A", "N/A"

        # 2. Challenger
        challenger_text = ""
        if problem:
            try:
                comp_query = f"Comparative efficacy {topic} vs standard treatment {problem}"
                challenger_docs = get_influential_studies(comp_query)
                if challenger_docs:
                    challenger_text += f"\n=== ÉTUDES COMPARATIVES ===\n"
                    for doc in challenger_docs[:3]:
                         challenger_text += f"- {doc.get('titre')}\n  SUMMARY: {doc.get('resume', '')[:300]}...\n\n"
            except Exception:
                pass

        # 3. Main Search (PubMed + Scholar)
        # Assuming search_pubmed is sync
        human_filter = '"Humans"[MeSH Terms]'
        exclude_keywords = ["veterinary", "mouse", "rat", "animal model", "cancer", "tumor", "oncology"]
        exclude_filter = " OR ".join([f'"{k}"[Title/Abstract]' for k in exclude_keywords])
        
        query = f'{topic} AND {human_filter} NOT ({exclude_filter})'
        pubmed_ids = search_pubmed(query)
        if not pubmed_ids:
            query_loose = f'{topic} NOT ({exclude_filter})'
            pubmed_ids = search_pubmed(query_loose)

        nb_studies = 15
        pubmed_docs = fetch_details(pubmed_ids[:nb_studies])

        # Semantic Scholar
        try:
            scholar_docs = get_influential_studies(f"{topic} efficacy")
        except:
            scholar_docs = []

        # 4. Fusion
        all_studies = pubmed_docs + scholar_docs
        corpus_text = ""
        sources_list = []
        
        corpus_text += f"\n=== CONTEXTE FDA ===\n{fda_data}\n"
        corpus_text += f"\n=== CONTEXTE CHIMIE ===\n{chem_data}\n"
        corpus_text += f"\n=== CONTEXTE TRIALS ===\n{clinical_data}\n"
        corpus_text += challenger_text
        corpus_text += f"\n=== CORPUS PRINCIPAL (TOTAL: {len(all_studies)}) ===\n"

        for i, doc in enumerate(all_studies):
            raw_abstract = doc.get('resume', '')
            if not raw_abstract: continue 
            clean_abs = clean_abstract(raw_abstract)
            source_label = doc.get("source", "PubMed")
            
            corpus_text += f"\n--- ÉTUDE {i+1} [{source_label}] : {doc.get('titre')} ---\n"
            corpus_text += f"ID: {doc.get('pmid')}\nRÉSUMÉ: {clean_abs}\n"
            
            sources_list.append({
                "id": i+1,
                "titre": doc.get('titre'),
                "source_origine": source_label
            })

        if not sources_list:
            return {"error": "No sources found", "status": "failed"}

        # 5. LLM Generation
        prompt = USER_PROMPT_TEMPLATE_SYNTHESE.format(
            count=len(sources_list),
            topic=topic,
            corpus_text=corpus_text
        )

        master_data = await self.llm_client.generate_response(SYSTEM_PROMPT_SYNTHESE, prompt)
        
        if master_data:
             # Post-processing
            master_data['_meta_topic'] = topic
            if problem:
                master_data['_meta_problem'] = problem
            master_data['zones_visage'] = master_data.get('zones_visage') or infer_face_zones(master_data, topic)
            master_data['_meta_stats'] = {
                "sources_total": len(sources_list),
                "pubmed_found_total": len(pubmed_ids)
            }
            
        return master_data
