# Manuel d'Utilisation - BigSis App

## Introduction
Cette application est le point d'entrée principal pour l'utilisateur final (Consumer). Elle est conçue pour être utilisée principalement sur mobile, mais fonctionne aussi sur desktop.

## Fonctionnalités Clés

### 1. Analyse Faciale
- L'utilisateur upload une photo ou utilise la caméra.
- L'app envoie l'image (ou les données simulées) à `bigsis-brain` via l'endpoint `/analyze`.
- Le résultat est affiché sous forme de "Diagnostic" interactif.

### 2. Knowledge Dashboard (Admin)
Accessible via `/knowledge`.
Cette interface "Back-Office" permet d'enrichir le cerveau de Big Sis.
- **Upload PDF** : Glisser-déposer des documents scientifiques (PDF). Ils sont envoyés à `/api/v1/ingest/pdf`.
- **Trigger PubMed** : Lancer une recherche ad-hoc pour forcer l'apprentissage sur un sujet.
- **Liste des Documents** : Voir ce que Big Sis a "en mémoire".

## Commandes de Développement

### Lancer le serveur de dev
```bash
npm run dev
```
Recharge automatiquement les changements (HMR).

### Linting
```bash
npm run lint
```
Vérifie la qualité du code (ESLint).

### Build Production
```bash
npm run build
```
Génère les fichiers statiques dans `dist/`.

## Architecture des Dossiers
- `src/components` : Composants réutilisables (Boutons, Cards...).
- `src/pages` : Pages principales (Home, Scan, Results).
- `src/services` : Appels API vers `bigsis-brain`.
- `public/` : Assets statiques (Images, Favicon).
