tu# 📚 Manuel d'Utilisation - BigSis Brain

## Introduction
Ce module est le "cerveau" de l'IA. Il ne possède pas d'interface graphique utilisateur (GUI), mais expose des points d'entrée (API) pour les autres modules (`bigsis-app`, `bigsis-social`).

## Utilisation Courante

### 1. Lancer le service
Pour que les autres modules fonctionnent, **Brain doit toujours être allumé**.
```bash
# Dans le dossier bigsis-brain
source venv/bin/activate
uvicorn main:app --port 8000
```

### 2. Endpoints Principaux

#### Génération Sociale (`POST /api/v1/generate/social`)
Utilisé par `bigsis-social`.
- **Input** : `{"topic": "Retinol", "problem": "Acne"}`
- **Output** : JSON complet pour l'Insta Viewer.

#### Analyse Visage (`POST /api/v1/analyze`)
Utilisé par `bigsis-app`.
- **Input** : Session ID, Zone, Type de ride.
- **Output** : Analyse textuelle structurée.

#### Ingestion PDF (`POST /api/v1/ingest/pdf`)
Pour ajouter de la connaissance brute.
- **Input** : Fichier PDF.
- **Output** : Confirmation d'indexation.

## Dépannage
- **Erreur 500** : Vérifiez que `OPENAI_API_KEY` est bien dans le `.env`.
- **Module not found** : Vérifiez d'avoir activé le venv.
