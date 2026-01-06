# BigSis Brain

## 🧠 C'est quoi ?
BigSis Brain est le moteur d'intelligence central de l'écosystème BigSis. C'est une API (FastAPI) qui centralise :
- La recherche documentaire (PubMed, Google Scholar, ClinicalTrials).
- L'analyse de contexte (FDA, PubChem).
- La génération de contenu via LLM (OpenAI).
- La mémoire des documents (RAG).

## 🚀 Installation

1. **Pré-requis** : Python 3.10+
2. **Installation des dépendances** :
   ```bash
   cd bigsis-brain
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. **Configuration** :
   Créez un fichier `.env` à la racine :
   ```env
   OPENAI_API_KEY=sk-...
   ```

## ⚡ Démarrage
Lancer le serveur de développement :
```bash
uvicorn main:app --reload --port 8000
```
L'API sera accessible sur `http://localhost:8000`.
La documentation interactive (Swagger) est sur `http://localhost:8000/docs`.

## 🏗 Architecture
- `api/` : Définition des endpoints (Routes).
- `core/` : Logique métier (Agents, Orchestra, Sources).
- `core/social_agent.py` : Agent spécialisé pour la génération de contenu social.
