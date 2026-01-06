import os

# Définition de la structure et du contenu des fichiers
project_structure = {
    "requirements.txt": """openai>=1.0.0
python-dotenv
requests
typing-extensions
""",
    ".env": """OPENAI_API_KEY=sk-proj-TA-CLE-ICI
PUBMED_EMAIL=ton-email@example.com
OPENAI_MODEL=gpt-4o-mini
""",
    "src/__init__.py": "",
    "src/config.py": """import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    PUBMED_EMAIL = os.getenv("PUBMED_EMAIL", "contact@bigsis.app")
    MODEL_NAME = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    # Garde-fous budgétaires
    MAX_STUDIES_PER_RUN = 3
    SEARCH_DAYS_BACK = 365
    
settings = Settings()
""",
    "src/prompts.py": """SYSTEM_PROMPT_FICHE = \"\"\"
Tu es BIG SIS, une experte scientifique en dermatologie et cosmétique.
Ta mission est de transformer une étude clinique complexe en une fiche pratique, claire et vérifiée pour le grand public.
Tu parles un français parfait, empathique mais rigoureux.
Tu ne dois JAMAIS inventer de données. Si une info est absente, mets null.
\"\"\"

USER_PROMPT_TEMPLATE = \"\"\"
Analyse cette étude scientifique :
TITRE: {title}
RÉSUMÉ: {abstract}

Génère un objet JSON suivant cette structure exacte :
{{
  "meta": {{
    "sujet_principal": "ex: Rétinol",
    "type_etude": "ex: Essai Randomisé"
  }},
  "contenu_vulgarise": {{
    "titre_accrocheur": "Un titre style magazine santé",
    "probleme_vise": "ex: Rides profondes",
    "resultats_cles": ["Point 1 avec %", "Point 2"],
    "verdict_bigsis": "Positif / Mitigé / Négatif",
    "explication_simple": "Résumé en 3 phrases niveau collège"
  }},
  "detail_scientifique": {{
    "population": "ex: 50 femmes, 40-60 ans",
    "duree": "ex: 12 semaines",
    "protocole": "ex: Application soir"
  }}
}}
\"\"\"
""",
    "src/llm_client.py": """from openai import OpenAI
from src.config import settings
import json

class LLMClient:
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def generate_json(self, system_prompt: str, user_content: str) -> dict:
        try:
            response = self.client.chat.completions.create(
                model=settings.MODEL_NAME,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=1500
            )
            content = response.choices[0].message.content
            return json.loads(content)
        except Exception as e:
            print(f"❌ Erreur LLM : {e}")
            return {}
""",
    "src/pubmed.py": """import requests
from typing import List, Dict
from src.config import settings

BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

def search_pubmed(query: str) -> List[str]:
    print(f"   ... Appel API PubMed Search pour: {query}")
    params = {
        "db": "pubmed",
        "term": query,
        "retmode": "json",
        "retmax": settings.MAX_STUDIES_PER_RUN + 2, 
        "reldate": settings.SEARCH_DAYS_BACK,
        "email": settings.PUBMED_EMAIL
    }
    try:
        resp = requests.get(f"{BASE_URL}/esearch.fcgi", params=params)
        resp.raise_for_status()
        data = resp.json()
        return data.get("esearchresult", {}).get("idlist", [])
    except Exception as e:
        print(f"⚠️ Erreur PubMed Search: {e}")
        return []

def fetch_details(pmids: List[str]) -> List[Dict]:
    if not pmids:
        return []
    
    ids_str = ",".join(pmids)
    print(f"   ... Récupération détails pour {len(pmids)} ID(s)")
    
    # Pour le MVP, on utilise esummary en JSON (plus simple que XML)
    # Note: Pour les abstracts complets, il faudra passer à efetch/XML plus tard
    params = {
        "db": "pubmed",
        "id": ids_str,
        "retmode": "json",
        "email": settings.PUBMED_EMAIL
    }
    
    try:
        resp = requests.get(f"{BASE_URL}/esummary.fcgi", params=params)
        resp.raise_for_status()
        data = resp.json()
        results = data.get("result", {})
        
        docs = []
        for pmid in pmids:
            if pmid not in results: continue
            item = results[pmid]
            
            # Tentative de reconstruction simple
            # Note: esummary ne donne pas toujours l'abstract complet, 
            # mais suffisant pour tester le pipeline
            docs.append({
                "pmid": pmid,
                "titre": item.get("title", ""),
                "resume": item.get("title", "") + " (Abstract fetch simulé pour MVP)", # Placeholder MVP
                "annee": item.get("pubdate", "")[:4],
                "lien": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
            })
        return docs
    except Exception as e:
        print(f"⚠️ Erreur PubMed Details: {e}")
        return []
""",
    "main.py": """import os
import json
import argparse
from src.config import settings
from src.llm_client import LLMClient
from src.prompts import SYSTEM_PROMPT_FICHE, USER_PROMPT_TEMPLATE
from src.pubmed import search_pubmed, fetch_details

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--topic", required=True, help="Sujet (ex: 'Retinol')")
    args = parser.parse_args()

    print(f"🚀 BIG SIS MVP - Lancement pour : {args.topic}")
    
    # 1. Discovery
    query = f"{args.topic} AND (clinical trial[Publication Type] OR randomized[Title/Abstract])"
    ids = search_pubmed(query)
    
    if not ids:
        print("❌ Aucune étude trouvée.")
        return

    print(f"✅ {len(ids)} études identifiées. Récupération...")
    docs = fetch_details(ids[:settings.MAX_STUDIES_PER_RUN]) 
    
    llm = LLMClient()
    results = []

    # 2. Génération (One-Shot)
    for i, doc in enumerate(docs):
        print(f"🧠 Analyse IA étude {i+1}/{len(docs)} : {doc.get('titre')[:30]}...")
        
        # Prompt injection
        prompt = USER_PROMPT_TEMPLATE.format(
            title=doc.get('titre', 'Inconnu'),
            abstract=doc.get('resume', 'Pas de résumé disponible')
        )
        
        # Appel payant (mais pas cher)
        data = llm.generate_json(SYSTEM_PROMPT_FICHE, prompt)
        
        if data:
            # Enrichissement
            data['source'] = {
                'pmid': doc.get('pmid'),
                'url': doc.get('lien'),
                'annee': doc.get('annee')
            }
            results.append(data)

    # 3. Sauvegarde
    os.makedirs("data/outputs", exist_ok=True)
    filename = f"data/outputs/{args.topic.replace(' ', '_')}_fiches.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
        
    print(f"✨ Terminé ! {len(results)} fiches générées dans : {filename}")

if __name__ == "__main__":
    main()
"""
}

def create_project():
    base_dir = "bigsis-core"
    
    if os.path.exists(base_dir):
        print(f"⚠️ Le dossier '{base_dir}' existe déjà.")
        ans = input("Voulez-vous écraser les fichiers ? (o/n) : ")
        if ans.lower() != 'o':
            return

    os.makedirs(base_dir, exist_ok=True)
    
    for filepath, content in project_structure.items():
        full_path = os.path.join(base_dir, filepath)
        # Créer les dossiers parents si nécessaire
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✅ Créé : {filepath}")

    print("\n🎉 Projet généré avec succès dans 'bigsis-core' !")
    print("\n👉 Pour démarrer :")
    print(f"cd {base_dir}")
    print("python -m venv venv")
    print("source venv/bin/activate  (ou venv\\Scripts\\activate sur Windows)")
    print("pip install -r requirements.txt")
    print("--- N'oublie pas de mettre ta clé API dans .env ---")
    print("python main.py --topic \"Niacinamide\"")

if __name__ == "__main__":
    create_project()