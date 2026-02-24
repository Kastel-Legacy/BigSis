# PLAN D'EXÉCUTION MVP BigSis — Toutes Phases

> **Objectif** : Passer de prototype bancal → MVP fonctionnel déployé
> **Scope** : Diagnostic + Trends + Social (Scanner déprioritisé)
> **Auth** : Anonyme | **API** : Clé OpenAI valide | **Deploy** : Render + Vercel existant

---

## PHASE 1 — BACKEND : Corriger les bugs critiques

### 1.1 Fix embeddings réels (RAG cassé)

**Fichier** : `bigsis-brain/core/rag/embeddings.py`

**État actuel** : Le code vérifie si la clé est absente ou vaut `"sk-placeholder"`. Si oui → vecteur zéro `[0.0]*1536`. Problème : même avec une vraie clé, si l'appel OpenAI échoue silencieusement, on n'a aucun fallback propre.

**Actions** :
1. Améliorer la détection de clé valide (vérifier que la clé commence par `sk-` ET n'est pas `sk-placeholder`)
2. Ajouter un try/except autour de l'appel OpenAI avec log explicite en cas d'erreur
3. Ajouter un log `logger.warning("MOCK MODE: ...")` quand on tombe en mock pour le debugging
4. Ajouter retry (2 tentatives) sur l'appel embeddings en cas d'erreur transitoire

**Critères d'acceptance** :
- [ ] Avec clé valide : `embed_text("test")` retourne un vecteur de 1536 dimensions non-zéro
- [ ] Avec clé placeholder : log warning affiché, vecteur zéro retourné
- [ ] Si l'API OpenAI timeout : retry 1 fois puis fallback mock avec log error

---

### 1.2 Fix `extra_context` undefined (scout.py crash)

**Fichier** : `bigsis-brain/core/trends/scout.py` (~ligne 85)

**État actuel** : La variable `extra_context` est utilisée dans la construction du prompt LLM mais n'est jamais définie. → `NameError` au runtime quand on appelle `POST /trends/discover`.

**Actions** :
1. Identifier où `extra_context` est utilisée
2. L'initialiser comme string vide ou la construire à partir du contexte brain (doc_count, chunk_count, proc_names)

**Critères d'acceptance** :
- [ ] `POST /api/v1/trends/discover` s'exécute sans `NameError`
- [ ] Les topics découverts contiennent des données cohérentes

---

### 1.3 Fix duplication de routers (endpoints.py)

**Fichier** : `bigsis-brain/api/endpoints.py` + `bigsis-brain/main.py`

**État actuel** : Les routers `research` et `trends` sont inclus à la fois dans `endpoints.py` et dans `main.py`, ce qui crée des routes dupliquées dans Swagger.

**Actions** :
1. Vérifier quels routers sont inclus dans `main.py` (app.include_router)
2. Vérifier lesquels sont inclus dans `endpoints.py` (router.include_router)
3. Supprimer les doublons — garder l'inclusion dans `main.py` uniquement

**Critères d'acceptance** :
- [ ] `/docs` (Swagger) ne montre aucune route en double
- [ ] Tous les endpoints restent accessibles

---

### 1.4 Fix `/social/history` (données mockées en dur)

**Fichier** : `bigsis-brain/api/social.py`

**État actuel** : L'endpoint `GET /social/history` retourne une liste hardcodée au lieu de requêter la table `social_generations`.

**Actions** :
1. Remplacer les données hardcodées par une query `SELECT * FROM social_generations ORDER BY created_at DESC LIMIT 50`
2. Mapper les résultats au format attendu par le frontend (id, topic, type, date, status)

**Critères d'acceptance** :
- [ ] Après `POST /social/generate` avec topic "botox", `GET /social/history` retourne une entrée contenant "botox"
- [ ] Si aucune génération n'existe, retourne une liste vide `[]`

---

### 1.5 Enrichir le Rules Engine (4 règles → 20+)

**Fichiers** :
- `bigsis-brain/core/rules/definitions.yaml` (ajouter règles)
- `bigsis-brain/core/rules/engine.py` (implémenter gt/lt)

**État actuel** : 4 règles seulement (front dynamique, front statique, glabelle dynamique, grossesse). Manquent : pattes d'oie, sillon nasogénien, traitements laser, acide hyaluronique, skinboosters, peeling, tranches d'âge.

**Actions** :

**A) Implémenter les opérateurs gt/lt dans engine.py** :
```python
elif op == "gt":
    if not isinstance(actual, (int, float)): return False
    return actual > cond.value
elif op == "lt":
    if not isinstance(actual, (int, float)): return False
    return actual < cond.value
```

**B) Ajouter les règles suivantes dans definitions.yaml** :

**Pattes d'oie (yeux)** :
- `R_YEUX_DYN_01` : rides dynamiques yeux → toxine botulique (zone orbiculaire)
- `R_YEUX_STAT_01` : rides statiques yeux → acide hyaluronique + laser fractionné
- `R_YEUX_PREV_01` : prévention yeux → skinboosters + protection solaire

**Sillon nasogénien** :
- `R_SILLON_DYN_01` : sillon dynamique → acide hyaluronique volumateur
- `R_SILLON_STAT_01` : sillon statique → combinaison AH + radiofréquence
- `R_SILLON_PROF_01` : sillon profond → lifting médical ou fils tenseurs

**Front (compléments)** :
- `R_FRONT_PREV_01` : prévention front → skinboosters + toxine micro-doses
- `R_FRONT_COMBO_01` : front statique + dynamique → combinaison toxine + AH

**Glabelle (compléments)** :
- `R_GLAB_STAT_01` : glabelle statique → AH + toxine combinés
- `R_GLAB_PROF_01` : glabelle profonde → consultation chirurgicale

**Règles transversales par âge** :
- `R_AGE_JEUNE_01` : âge < 30 → privilégier prévention, skinboosters
- `R_AGE_MOYEN_01` : âge 30-50 → traitements combinés standards
- `R_AGE_SENIOR_01` : âge > 50 → approche globale, considérer lifting

**Sécurité additionnelles** :
- `R_SAFETY_ALLERGY` : allergie connue → warning consultation allergologue
- `R_SAFETY_AUTOIMMUNE` : maladie auto-immune → contraindication relative

**Critères d'acceptance** :
- [ ] Opérateurs `gt` et `lt` fonctionnent (test : `age gt 50` matche un input `age: 55`)
- [ ] Chaque zone du wizard (front, glabelle, pattes_oie, sillon) déclenche au moins 2 règles
- [ ] Les règles d'âge influencent les suggestions (< 30 vs > 50 donne des résultats différents)
- [ ] La règle grossesse reste prioritaire (weight 10.0)

---

### 1.6 Fix LLM client : retry logic + mock valide

**Fichier** : `bigsis-brain/core/llm_client.py`

**État actuel** : Mock retourne `{"mock": "data"}` (pas parsable par l'orchestrateur). Aucun retry en cas d'erreur transitoire.

**Actions** :
1. Mock → retourner un objet conforme au schema :
```python
{
    "summary": "Mode démonstration — connectez une clé API OpenAI pour des résultats réels.",
    "explanation": "...",
    "options_discussed": "...",
    "risks_and_limits": "...",
    "questions_for_practitioner": "...",
    "uncertainty_level": "Haute"
}
```
2. Ajouter retry avec backoff exponentiel (max 3 tentatives, délai 1s → 2s → 4s)
3. Logger chaque tentative et le résultat final

**Critères d'acceptance** :
- [ ] En mode mock : l'orchestrateur ne crashe pas, retourne une réponse lisible
- [ ] En mode réel : une erreur 429 (rate limit) est retentée automatiquement
- [ ] Après 3 échecs : retourne une erreur propre `{"error": "Service temporairement indisponible"}`

---

### 1.7 Error handling backend uniforme

**Fichier** : `bigsis-brain/main.py` (middleware) + tous les endpoints

**Actions** :
1. Ajouter un exception handler global dans main.py :
```python
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"error": "Erreur interne", "detail": str(exc)})
```
2. Standardiser les réponses d'erreur sur tous les endpoints : `{"error": str, "detail": str}`

**Critères d'acceptance** :
- [ ] Une erreur inattendue retourne 500 avec JSON (pas de stack trace HTML)
- [ ] Toutes les erreurs API ont le format `{"error": "...", "detail": "..."}`

---

## PHASE 2 — FRONTEND : Corriger les bugs critiques

### 2.1 Error Boundary global

**Fichiers** :
- Créer `bigsis-app/src/components/ErrorBoundary.tsx`
- Modifier `bigsis-app/src/App.tsx`

**Actions** :
1. Créer un composant React class ErrorBoundary avec `componentDidCatch`
2. Afficher : message d'erreur + bouton "Réessayer" (window.location.reload)
3. Wrapper le contenu de App.tsx dans `<ErrorBoundary>`
4. Ajouter un ErrorBoundary spécifique autour de FicheVeriteViewer et ResultPage

**Critères d'acceptance** :
- [ ] Si un composant crash (ex: données null), l'app affiche "Une erreur est survenue" au lieu d'un écran blanc
- [ ] Le bouton "Réessayer" recharge la page
- [ ] Les autres pages restent accessibles même si une page crashe

---

### 2.2 Fix bouton PDF Download

**Fichier** : `bigsis-app/src/pages/ResultPage.tsx`

**État actuel** : Le bouton `<Download>` n'a aucun `onClick`. Il ne fait rien.

**Actions** :
1. Installer `html2canvas` + `jspdf` : `npm install html2canvas jspdf`
2. Wrapper le contenu résultat dans une `ref` React
3. onClick : capturer le contenu en canvas → convertir en PDF → télécharger
4. Ajouter un état loading pendant la génération du PDF

**Critères d'acceptance** :
- [ ] Cliquer sur "Télécharger PDF" génère et télécharge un fichier `bigsis-analyse.pdf`
- [ ] Le PDF contient le résumé, les options, les risques, les sources
- [ ] Un spinner s'affiche pendant la génération

---

### 2.3 Protéger les routes admin (AdminGate)

**Fichiers** :
- Créer `bigsis-app/src/components/AdminGate.tsx`
- Modifier `bigsis-app/src/App.tsx`

**Actions** :
1. Créer un composant `AdminGate` qui demande un code d'accès
2. Le code est stocké dans `VITE_ADMIN_CODE` (env var)
3. Le code entré est stocké en `sessionStorage` pour la durée de la session
4. Si pas de code ou code incorrect → afficher un formulaire de saisie
5. Wrapper `AdminLayout` dans `<AdminGate>`

**Critères d'acceptance** :
- [ ] Naviguer vers `/admin/trends` sans code → formulaire de saisie affiché
- [ ] Mauvais code → message "Code incorrect"
- [ ] Bon code → accès aux pages admin pour toute la session
- [ ] Rafraîchir la page admin → accès conservé (sessionStorage)

---

### 2.4 Fix couleurs d'incertitude (hardcodé FR)

**Fichier** : `bigsis-app/src/pages/ResultPage.tsx`

**État actuel** : Les couleurs sont mappées sur les strings françaises ("Faible" → vert, "Moyenne" → jaune, etc.). En anglais, tout est gris.

**Actions** :
1. Backend : normaliser `uncertainty_level` en valeurs standard (`low`, `medium`, `high`) dans l'orchestrateur
2. Frontend : mapper les couleurs sur les valeurs normalisées, pas sur les traductions
3. Afficher le texte traduit (FR/EN) mais utiliser la valeur brute pour la couleur

**Critères d'acceptance** :
- [ ] En FR : "Faible" en vert, "Moyenne" en jaune, "Haute" en rouge
- [ ] En EN : "Low" en vert, "Medium" en jaune, "High" en rouge
- [ ] Même couleur quelle que soit la langue

---

### 2.5 Loading states sur toutes les pages

**Fichiers** : `ResultPage.tsx`, `StudioPage.tsx`, pages admin

**Actions** :
1. **ResultPage** : si `location.state` est null (accès direct), rediriger vers home
2. **StudioPage** : ajouter un spinner pendant la génération de fiche
3. **TrendsPage** : afficher une barre de progression pendant le polling (au lieu du silence)
4. **Tous les boutons d'action** : désactiver pendant l'appel API (`disabled={isLoading}`)

**Critères d'acceptance** :
- [ ] Aucun bouton ne peut être cliqué deux fois pendant un appel API
- [ ] Un spinner est visible pendant chaque appel réseau
- [ ] Accéder à `/result` directement (sans state) → redirection vers `/`

---

### 2.6 Fix FicheVeriteViewer null safety

**Fichier** : `bigsis-app/src/components/social/FicheVeriteViewer.tsx`

**Actions** :
1. Ajouter optional chaining (`?.`) sur toutes les propriétés imbriquées
2. Ajouter des fallbacks texte : "Données non disponibles" pour les champs manquants
3. Vérifier : `data.score_global?.note_efficacite`, `data.synthese_securite?.le_risque_qui_fait_peur`, `data.recuperation_sociale?.verdict_immediat`, etc.

**Critères d'acceptance** :
- [ ] Une fiche avec `score_global: null` s'affiche sans crash
- [ ] Les champs manquants affichent "—" ou "Données non disponibles"
- [ ] Aucun `Cannot read property of undefined` dans la console

---

### 2.7 Masquer le Scanner + nettoyer la navigation

**Fichiers** :
- `bigsis-app/src/components/Header.tsx`
- `bigsis-app/src/App.tsx`

**Actions** :
1. Retirer "Scanner" et "Ingredients" des liens de navigation dans Header.tsx
2. Garder les routes dans App.tsx mais rediriger `/scanner` et `/ingredients` vers `/`
3. Navigation finale publique : **Diagnostic** (home) uniquement
4. Navigation admin : **Trends**, **Studio**, **Knowledge**, **Research**

**Critères d'acceptance** :
- [ ] Le header public ne montre que "BigSis" (logo) — pas de liens scanner/ingredients
- [ ] `/scanner` redirige vers `/`
- [ ] Les pages admin restent accessibles via `/admin/*`

---

### 2.8 Compléter le i18n

**Fichier** : `bigsis-app/src/translations/index.ts` + composants

**Actions** :
1. Auditer tous les textes hardcodés en FR dans les composants
2. Les extraire dans le fichier de traductions
3. Ajouter les clés EN manquantes
4. Priorité : ResultPage, StudioPage, FicheVeriteViewer, pages admin

**Critères d'acceptance** :
- [ ] Switcher FR → EN : aucun texte français visible sur les pages Diagnostic et Result
- [ ] Les pages admin sont au minimum lisibles en EN (pas obligé d'être parfait)

---

## PHASE 3 — TESTS END-TO-END

### 3.1 Parcours Diagnostic complet

**Scénario** :
1. Ouvrir l'app sur `/`
2. Cliquer sur une zone (ex: "Front")
3. Sélectionner un type de ride (ex: "Expression")
4. Cocher/décocher grossesse
5. Valider → attendre le loading
6. Voir la page résultat avec :
   - Résumé en français
   - Au moins 2 options discutées
   - Sources PubMed citées
   - Niveau d'incertitude avec couleur
7. Cliquer "Télécharger PDF" → PDF téléchargé

**Critères d'acceptance** :
- [ ] Le parcours complet fonctionne sans erreur console
- [ ] Les données sont réelles (pas de mock)
- [ ] Le PDF est lisible et contient le contenu affiché
- [ ] Tester avec les 4 zones × 2 types = 8 combinaisons minimum

---

### 3.2 Parcours Trends

**Scénario** :
1. Aller sur `/admin/trends` (entrer le code admin)
2. Cliquer "Discover"
3. Attendre les résultats (polling)
4. Voir la liste de topics avec TRS scores
5. Approuver un topic
6. Lancer "Learn" sur le topic approuvé
7. Vérifier que le TRS augmente

**Critères d'acceptance** :
- [ ] Le discover retourne au moins 1 topic
- [ ] L'approbation change le statut visible
- [ ] Le learning ne crashe pas (même si le TRS n'augmente pas beaucoup)

---

### 3.3 Parcours Social/Fiches

**Scénario** :
1. Aller sur `/admin/studio` (via admin gate)
2. Entrer un topic (ex: "toxine botulique rides du front")
3. Générer la fiche
4. Vérifier que la FicheVerite s'affiche complètement :
   - Titre + nom scientifique
   - Score efficacité + sécurité
   - Synthèse
   - Sources citées
5. Vérifier dans `/social/history` que la fiche est enregistrée

**Critères d'acceptance** :
- [ ] La fiche se génère en < 30 secondes
- [ ] Tous les champs principaux sont remplis (pas de "undefined")
- [ ] L'historique reflète la génération

---

## PHASE 4 — DÉPLOIEMENT PRODUCTION

### 4.1 Sécuriser les secrets

**Actions** :
1. Vérifier que `.env` est dans `.gitignore` (backend ET frontend)
2. Créer `.env.example` avec les variables attendues (sans valeurs)
3. Configurer les variables dans le dashboard Render (backend) et Vercel (frontend)
4. `VITE_ADMIN_CODE` configuré dans Vercel

**Critères d'acceptance** :
- [ ] `git diff` ne montre aucun secret
- [ ] `.env.example` documente toutes les variables nécessaires
- [ ] L'app en production utilise les variables Render/Vercel

---

### 4.2 Configurer CORS production

**Fichier** : `bigsis-brain/main.py`

**Actions** :
1. Remplacer `allow_origins=["*"]` par une liste d'origines autorisées :
   - L'URL Vercel de production
   - `http://localhost:3000` et `http://localhost:5173` pour le dev
2. Lire les origines depuis une env var `ALLOWED_ORIGINS` (comma-separated)

**Critères d'acceptance** :
- [ ] L'app Vercel peut appeler l'API Render
- [ ] Un site tiers reçoit une erreur CORS
- [ ] En local, localhost fonctionne toujours

---

### 4.3 Durcir les headers CSP

**Fichier** : `bigsis-app/vercel.json`

**Actions** :
1. Remplacer `*` par les domaines spécifiques (API Render, CDNs)
2. Retirer `unsafe-eval` si possible (vérifier que React n'en a pas besoin)
3. Garder `unsafe-inline` pour les styles Tailwind

**Critères d'acceptance** :
- [ ] L'app fonctionne sans erreurs CSP dans la console
- [ ] Les appels API passent correctement

---

### 4.4 Smoke test production

**Actions** :
1. Ouvrir l'URL Vercel de production
2. Exécuter les 3 parcours (Diagnostic, Trends, Studio)
3. Vérifier les logs Render pour détecter des erreurs

**Critères d'acceptance** :
- [ ] Les 3 parcours fonctionnent en production
- [ ] Pas d'erreur 500 dans les logs Render
- [ ] Le temps de réponse de l'API est < 10 secondes pour le diagnostic

---

## HORS SCOPE (V2)

| Feature | Raison du report |
|---------|-----------------|
| Auth utilisateur | Pas nécessaire pour valider le PMF |
| Scanner INCI | Concurrence existante |
| App mobile | Web-first suffit |
| Paiement/Stripe | Pas de monétisation au MVP |
| CI/CD | Manual deploy OK pour le MVP |
| Tests unitaires | Tests E2E manuels suffisent |
| Analytics | Google Analytics simple suffira plus tard |

---

## ESTIMATION DE TEMPS

| Phase | Durée estimée | Tâches |
|-------|--------------|--------|
| Phase 1 — Backend | ~3-4h | 7 tâches |
| Phase 2 — Frontend | ~3-4h | 8 tâches |
| Phase 3 — Tests E2E | ~1-2h | 3 parcours |
| Phase 4 — Deploy | ~1h | 4 tâches |
| **TOTAL** | **~8-11h** | **22 tâches** |
