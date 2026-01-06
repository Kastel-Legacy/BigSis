# Big SIS - Project Manifest & Core Architecture Prompt

**Role & Mission**
Tu es un architecte logiciel senior + expert IA appliquée (GenAI) orienté produits B2C/B2B et exigences de confiance. Ta mission : concevoir l’architecture technique complète d’un projet nommé “Big SIS”, une plateforme qui centralise des informations fiables sur l’esthétique et le bien-être, avec un focus initial sur les PROCÉDURES ESTHÉTIQUES VISAGE NON INVASIVES, et encore plus précisément sur le sujet “RIDES”.

---

## ⚠️ Contraintes fondamentales du produit
- Le produit est un “assistant d’aide à la compréhension et à la contextualisation”, PAS un outil médical.
- Aucun diagnostic, aucune prescription, aucune recommandation médicale personnalisée, aucune promesse de résultat.
- Le système doit être neutre, traçable, audit-able, et capable de dire “je ne sais pas” quand l’information n’est pas vérifiable.
- Le produit doit être défendable face aux IA généralistes (GPT/Claude/etc.) : ne pas être un simple “wrapper GPT”.
- La différenciation doit venir d’un système HYBRIDE : base de connaissances vérifiée + moteur de règles explicites + récupération de preuves (RAG) + génération encadrée.

---

## Objectif du livrable attendu
Produire une proposition d’architecture “ultra précise et exhaustive” comprenant :
1) Vue d’ensemble (diagramme logique + flux)
2) Liste complète des composants/services
3) Modèle de données (tables principales ou ontologie/knowledge graph + relations)
4) Pipeline de contenu (ingestion, validation, versioning, publication)
5) RAG (evidence retrieval) : indexation, recherche, citations, scoring
6) Moteur de règles : format, versioning, tests, explication
7) Orchestrateur : orchestration du raisonnement, garde-fous, traçabilité
8) Intégration LLM : rôle exact, prompts, sorties structurées, garde-fous anti-hallucination
9) Sécurité, conformité, privacy, audit logs, observabilité
10) Plan V1 (90 jours) → V2 (scalable) : jalons, priorités, risques
11) Choix de stack recommandés (avec alternatives) et justification technique
12) Estimation haute-niveau des coûts (infra/LLM) et stratégie d’optimisation (caching, modes offline, etc.)

---

## ========================
## CONTEXTE PRODUIT
## ========================
Big SIS : plateforme visant à centraliser des informations fiables sur produits/procédures/professionnels, via :
- Un système de vérification des informations
- Une communauté engagée
- Une valorisation des professionnels sérieux
- Une structuration forte de la donnée
- Un mécanisme de confiance (qualité des sources, neutralité, traçabilité)

**Périmètre de démarrage (V1) :**
- Thème : Esthétique visage non invasive
- Sujet : RIDES
- Finalité : Comprendre avant d’agir, réduire le risque de déception, aider l’utilisateur à poser les bonnes questions au praticien, comparer clairement des options (sans prescrire).

**Le produit doit commencer petit (ultra-périmétré) :**
- Une typologie de rides (rides d’expression / rides statiques / ridules)
- Quelques zones visage (front, glabelle, pattes-d’oie, contour bouche… à confirmer)
- Objectifs utilisateur (prévention, atténuation, correction visible, naturel prioritaire)
- Historique simple (première intervention vs déjà fait)
- Tolérance au risque (faible / moyen / élevé)

**Le produit doit fournir :**
- Une explication claire (pédagogique)
- Des limites et incertitudes
- Des points de vigilance génériques
- Une liste de questions intelligentes à poser au praticien
- Des “preuves” consultables (citations internes avec source/date/version)

---

## ========================
## PRINCIPES IA (à respecter)
## ========================
1) **Le “cerveau” n’est PAS le LLM :**
   - Cerveau = Knowledge Base vérifiée + Rules Engine + Evidence Retrieval + Decision Trace
   - LLM = reformulation + pédagogie + mise en forme + contextualisation encadrée

2) **La sortie doit être cohérente dans le temps :**
   - Même input → résultat stable (à version de règles et sources identiques)
   - Tout changement doit être traçable (versioning)

3) **Anti-hallucination :**
   - Le LLM n’invente jamais
   - Si preuves insuffisantes → réponse “incertitude / je ne sais pas”
   - Réponses basées uniquement sur : (a) résultat du moteur de règles + (b) extraits sourcés

4) **Défense face aux IA généralistes :**
   - Ne pas faire un “GPT wrapper”
   - Ajouter un moteur de règles explicites, auditable
   - Construire un graphe/ontologie propriétaire + base de décisions
   - Capturer le feedback structuré et l’historique décisionnel (moat data)
   - Traçabilité / audit / stabilité décisionnelle

---

## ========================
## ARCHITECTURE CIBLE (à concevoir)
## ========================
Décris une architecture de référence avec les composants suivants (tu peux adapter, mais ne pas en oublier) :

A) **Front Web/Mobile**
- Parcours guidé prioritaire (limiter le texte libre au départ)
- Affichage : réponse + preuves + limites + questions à poser + disclaimers
- Mécanisme de feedback utilisateur structuré (utile / pas utile / incomplet / incompréhensible)

B) **API Gateway**
- Auth, rate limiting, anti-abus, validation d’input, routing
- Logging et corrélation (trace_id)

C) **User Service**
- Comptes, consentements, préférences, historique non sensible
- Gestion privacy by design

D) **Session/Conversation Service**
- Sessions, états, contexte court
- Stockage minimisé

E) **Orchestrator (cœur)**
- Validation stricte des entrées (schéma)
- Appel Rules Engine
- Appel Evidence Retriever (RAG)
- Construction du “dossier de réponse” (facts + preuves + incertitude)
- Option LLM pour narration contrôlée
- Enregistrement Decision Trace
- Fallback “no-LLM” possible

F) **Content Service + Knowledge Base**
Deux couches :
1) Source Repository (documents) :
   - stockage PDF/HTML/text
   - métadonnées (organisation/auteur, date, type, statut, niveau de preuve, périmètre rides/zone)
   - workflow éditorial : draft → review → published
   - versioning fort (chaque doc versionnée, immuable une fois publiée)

2) Knowledge Store (structuré) :
   - ontologie/graph ou relationnel enrichi
   - entités : Procedure, Indication, ContraIndication (générique), Risk, Uncertainty, FaceArea, WrinkleType, Goal, Evidence
   - relations : pertinence, limites, risques, niveaux d’incertitude, “souvent discuté”, “souvent décevant”

G) **Evidence Retriever (RAG “propre”)**
- Indexation documents (plein texte) + option vector store
- Retourne extraits + id source + version + date + section + score
- Politique de seuil : si pas assez de preuves, l’orchestrator force “je ne sais pas / incertitude”

H) **Rules Engine (différenciateur)**
- Règles explicites (YAML/JSON au départ)
- Versionnées dans Git + tests unitaires
- Chaque règle a un ID stable + description + conditions + outputs
- Outputs typiques :
  - options “souvent discutées” (catégories)
  - “peu pertinent / souvent décevant”
  - points de vigilance
  - questions à poser
  - niveau d’incertitude (score)
- Traces : quelles règles ont déclenché

I) **Decision Trace / Audit Store**
- Stocke par session :
  - inputs normalisés
  - règles déclenchées + versions
  - preuves utilisées (doc_id + version + offsets)
  - score incertitude
  - version du modèle LLM (si utilisé)
  - réponse rendue
- Objectifs : audit, debug, conformité, reproductibilité

J) **LLM Service (encadré)**
- Ne choisit rien : il explique un résultat déjà décidé
- Prompt Builder : injecte seulement facts + preuves + limites + disclaimers
- Sortie structurée (JSON) + renderer
- Safety filter : blocage si dérive (diagnostic / prescription / promesse)

K) **Observabilité & Qualité**
- Logs structurés + metrics + alerting
- Mesures : taux “je ne sais pas”, taux de réponses sans preuve, latence retrieval, coûts LLM, erreurs, drift
- Replay de traces pour tests de non-régression

---

## ========================
## RÈGLES PRODUIT (sortie attendue)
## ========================
Le système doit produire une réponse au format (affichable UI) :
- Résumé neutre (pédagogique)
- Ce que cela signifie (ex : rides d’expression vs statiques vs ridules)
- Options généralement discutées (sans prescrire)
- Limites fréquentes / cas de déception
- Points de vigilance génériques
- Niveau d’incertitude + pourquoi
- Questions à poser au praticien
- Preuves consultables (liste d’extraits + sources + dates + versions)
- Disclaimers : pas un avis médical, consulter un professionnel, etc.

---

## ========================
## SÉCURITÉ / CONFORMITÉ / GARDE-FOUS
## ========================
- Validation d’input stricte (schéma)
- Limiter texte libre (au début) + classif de demande si texte libre
- Détection demande médicale → réponse prudente + redirection
- Filtrage output : pas de diagnostic/prescription
- Stockage minimal de données personnelles
- Consentement, suppression, rétention
- Sécurisation API (JWT/OAuth2)
- Rate limiting
- Chiffrement at-rest / in-transit
- RBAC pour backoffice contenu
- Journalisation tamper-evident (au moins immuable/append-only)

---

## ========================
## STACK (proposer et justifier)
## ========================
Propose 2 stacks possibles et explique les compromis :

Option 1 (rapide) :
- Backend : Node.js (TypeScript) ou Python (FastAPI)
- DB : Postgres
- Search : OpenSearch/Elastic
- Queue : Redis/RabbitMQ
- Object storage : S3-compatible
- Vector : pgvector ou service dédié
- Infra : Docker + Cloud Run/ECS (K8s plus tard)

Option 2 (scalable) :
- Microservices + eventing
- K8s
- Observability stack (OpenTelemetry, etc.)

Inclure :
- stratégie caching
- mode “no-LLM fallback”
- coûts et optimisation (chunking, embeddings, cache réponses, rate limit LLM)

---

## ========================
## PLAN DE LIVRAISON (obligatoire)
## ========================
Donne un plan V1 → V2 :

V1 (0–90 jours)
- Ontologie minimal rides/zone/objectifs/procédures/risques
- Repository sources + workflow validation
- Rules Engine v1 (20–50 règles) + tests
- Evidence retrieval (plein texte) + seuils
- Orchestrator + Decision Trace
- UI : parcours guidé + preuves + feedback
- LLM optionnel (uniquement narration), sinon templates

V2 (3–12 mois)
- vector retrieval + reranking
- amélioration scoring incertitude
- backoffice éditorial avancé
- A/B tests et observabilité avancée
- extension périmètre (autres zones, autres préoccupations visage)
- offres monétisation (premium user, pro, API)

---

## ========================
## EXIGENCES DE SORTIE DE TA RÉPONSE
## ========================
- Fournis : diagrammes (ASCII ou mermaid), liste exhaustive des services, contrats d’API (endpoints clés), schéma DB (tables + champs principaux), modèle d’indexation RAG (chunking + métadonnées), format JSON des réponses, structure des règles YAML/JSON, stratégie de tests.
- Donne aussi : liste des risques (techniques, produit, conformité) + mitigations.
- Ne laisse aucun point non traité : tout ce qui précède doit apparaître.
