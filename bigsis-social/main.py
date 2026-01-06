import os
import json
import argparse
import re
import unicodedata
from src.config import settings
from src.llm_client import LLMClient
from src.prompts import SYSTEM_PROMPT_SYNTHESE, USER_PROMPT_TEMPLATE_SYNTHESE

# --- IMPORT DES CONNECTEURS ---
from src.sources.pubmed import search_pubmed, fetch_details
from src.sources.openfda import get_fda_adverse_events
from src.sources.clinical import get_ongoing_trials
from src.sources.pubchem import get_chemical_safety
from src.sources.semanticscholar import get_influential_studies

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
    """Nettoie le texte pour économiser des tokens et réduire le bruit."""
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
    """Dérive une liste de zones du visage à partir des champs existants pour alimenter l'Atlas."""
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

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--topic", required=True, help="Sujet principal (ex: 'Pore Strips')")
    parser.add_argument("--problem", required=False, help="Problème traité (ex: 'Blackheads') pour le Challenger")
    args = parser.parse_args()

    print(f"🚀 BIG SIS (Mode Synthèse V9 - Large) - Sujet : {args.topic}")
    
    # =========================================================================
    # PHASE 1 : RÉCOLTE DES DONNÉES CONTEXTUELLES
    # =========================================================================
    print(f"📡 Récupération des contextes (FDA, PubChem, Trials)...", end=" ", flush=True)
    try:
        fda_data = get_fda_adverse_events(args.topic)
        clinical_data = get_ongoing_trials(args.topic)
        chem_data = get_chemical_safety(args.topic)
        print("✅")
    except Exception as e:
        print(f"⚠️ (Erreur contextes: {e})")
        fda_data, clinical_data, chem_data = "N/A", "N/A", "N/A"

    # =========================================================================
    # PHASE 2 : LE MODULE CHALLENGER (RECHERCHE D'ALTERNATIVES)
    # =========================================================================
    challenger_text = ""
    if args.problem:
        print(f"🥊 Recherche Challenger ({args.problem})...", end=" ", flush=True)
        try:
            # On cherche des revues comparatives
            comp_query = f"Comparative efficacy {args.topic} vs standard treatment {args.problem}"
            challenger_docs = get_influential_studies(comp_query)
            
            if challenger_docs:
                challenger_text += f"\n=== ÉTUDES COMPARATIVES (POUR LE SWAP) ===\n"
                for doc in challenger_docs[:3]:
                     challenger_text += f"- [Comparaison] {doc.get('titre')}\n"
                     challenger_text += f"  RÉSUMÉ: {doc.get('resume', '')[:500]}...\n"
                     challenger_text += f"  ID_PREUVE: {doc.get('pmid')}\n"
                     challenger_text += f"  LIEN: {doc.get('url')}\n\n"
            print("✅")
        except Exception:
            print("⚠️ (Pass)")
    else:
        challenger_text = "\n(Pas de recherche comparative demandée)\n"

    # =========================================================================
    # PHASE 3 : RÉCOLTE DES ÉTUDES PRINCIPALES (PUBMED + SCHOLAR)
    # =========================================================================
    
    # A. PubMed (MODE LARGE - Sans filtre qualité strict pour maximiser les résultats)
    print(f"🔎 [PubMed] Recherche...", end=" ", flush=True)
    
    human_filter = '"Humans"[MeSH Terms]'
    exclude_keywords = ["veterinary", "mouse", "rat", "animal model", "cancer", "tumor", "oncology"]
    exclude_filter = " OR ".join([f'"{k}"[Title/Abstract]' for k in exclude_keywords])
    
    # V9 : On retire 'scope_filter' et 'quality_filter'. 
    # On laisse PubMed trier par pertinence (Relevance) par défaut.
    query = f'{args.topic} AND {human_filter} NOT ({exclude_filter})'
    
    pubmed_ids = search_pubmed(query)
    
    # Fallback si 0 résultat (Recherche large sans filtre Humain strict)
    if not pubmed_ids:
        print("⚠️ (0 résultat -> Relance large)...", end=" ", flush=True)
        query_loose = f'{args.topic} NOT ({exclude_filter})'
        pubmed_ids = search_pubmed(query_loose)

    # Affichage du vrai volume trouvé
    print(f"✅ {len(pubmed_ids)} études trouvées (Total).")

    # Sélection des meilleures (Aligné avec config.py)
    nb_studies = 15 
    pubmed_docs = fetch_details(pubmed_ids[:nb_studies]) 
    print(f"📚 Téléchargement des {len(pubmed_docs)} abstracts...")

    # B. Semantic Scholar
    print(f"🎓 [Semantic Scholar] Recherche...", end=" ", flush=True)
    try:
        # Requête simple pour assurer des résultats
        scholar_query = f"{args.topic} efficacy"
        scholar_docs = get_influential_studies(scholar_query) 
        print(f"✅ {len(scholar_docs)} études.")
    except Exception:
        scholar_docs = []
        print("⚠️ (Erreur)")

    # =========================================================================
    # PHASE 4 : FUSION
    # =========================================================================
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
        corpus_text += f"ANNÉE: {doc.get('annee')}\n"
        corpus_text += f"ID: {doc.get('pmid')}\n"
        corpus_text += f"LIEN: {doc.get('url')}\n"
        corpus_text += f"RÉSUMÉ: {clean_abs}\n"
        
        sources_list.append({
            "id": i+1,
            "titre": doc.get('titre'),
            "annee": doc.get('annee'),
            "url": doc.get('url'),
            "pmid": doc.get('pmid'),
            "source_origine": source_label
        })

    if not corpus_text or len(sources_list) == 0:
        print("\n❌ Corpus vide (Aucune étude trouvée).")
        return

    # =========================================================================
    # PHASE 5 : GÉNÉRATION LLM
    # =========================================================================
    print(f"🧠 Analyse Big Sis sur {len(sources_list)} sources...", end=" ", flush=True)
    
    llm = LLMClient()
    prompt = USER_PROMPT_TEMPLATE_SYNTHESE.format(
        count=len(sources_list),
        topic=args.topic,
        corpus_text=corpus_text
    )
    
    master_data = llm.generate_json(SYSTEM_PROMPT_SYNTHESE, prompt)
    print("✅")
    
    if master_data:
        # Debug Infos
        master_data['_meta_topic'] = args.topic
        if args.problem:
            master_data['_meta_problem'] = args.problem
        master_data['zones_visage'] = master_data.get('zones_visage') or infer_face_zones(master_data, args.topic)
        master_data['_meta_sources_brutes_envoyees'] = [f"[{s['source_origine']}] {s['titre']}" for s in sources_list]
        master_data['_meta_stats'] = {
            "sources_total": len(sources_list),
            "pubmed_found_total": len(pubmed_ids),
            "challenger_active": bool(args.problem)
        }
        
        nb_retenues = len(master_data.get('annexe_sources_retenues', []))
        
        os.makedirs("data/outputs", exist_ok=True)
        
        # Sécurisation du nom de fichier
        safe_topic_name = re.sub(r'[^a-zA-Z0-9]', '_', args.topic[:30])
        filename = f"data/outputs/{safe_topic_name}_MASTER.json"
        
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(master_data, f, ensure_ascii=False, indent=2)
            
        print(f"✨ Fiche générée : {filename} ({nb_retenues} retenues / {len(sources_list)} analysées)")

if __name__ == "__main__":
    main()
