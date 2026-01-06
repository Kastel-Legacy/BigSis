# Manuel d utilisation BigSIS Core

Document maintenu par l agent IA. Toute evolution fonctionnelle doit etre reflechee ici.

## 1. Objet
BigSIS Core automatise la generation de fiches evidence based destinees a l equipe esthetique. `main.py` agrege des donnees depuis PubMed, Semantic Scholar, OpenFDA, ClinicalTrials et PubChem, puis confie la synthese a un modele OpenAI formate pour produire un JSON maitre exploite ensuite par l Atlas et l interface front.

## 2. Vue rapide de l architecture
- `main.py` : pipeline single run (collecte, challenger, fusion, appel LLM, export JSON).
- `src/llm_client.py` et `src/prompts.py` : configuration des prompts et du client OpenAI.
- `src/sources/*` : connecteurs API (PubMed, Semantic Scholar, OpenFDA, ClinicalTrials, PubChem).
- `data/outputs/` : fiches JSON produites (nommee `<topic>_MASTER.json`).
- `scripts/build_face_index.py` : construit `data/atlas-index.json` consomme par `face-atlas.html` et `viewer.html`.
- `launch_batch.py` : lance une serie de sujets et regenera l index a la fin.

## 3. Pre requis techniques
- Python 3.10+ avec pip.
- Acces reseau sortant vers les API publiques citees ci dessus et vers l API OpenAI.
- Cle OpenAI valide et adresse email PubMed pour respecter leurs quotas.
- Optionnel mais recommande : environnement virtuel (`python -m venv .venv`).

## 4. Installation locale
1. Cloner le depot puis ouvrir un terminal a la racine.
2. Creer/activer un environnement :
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # sous Windows: .venv\\Scripts\\activate
   ```
3. Installer les dependances :
   ```bash
   pip install -r requirements.txt
   ```

## 5. Configuration via `.env`
Creer un fichier `.env` a la racine (ou utiliser les variables d environnement) contenant au minimum :
```
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4.1-mini        # optionnel, defaut dans src/config.py
PUBMED_EMAIL=contact@bigsis.app  # adresse utilisee pour les appels E-Utilities
```
Les autres garde fous (nombre d etudes, fenetre temporelle) sont definis dans `src/config.py`.

## 6. Generer une fiche unique
Commande de base :
```bash
python main.py --topic "Botulinum toxin type A wrinkle treatment" --problem "Facial wrinkles"
```
- `--topic` : terme scientifique recherche sur PubMed et les autres APIs.
- `--problem` (optionnel) : contexte clinique pour declencher le module Challenger (etude comparative).

La sortie mentionne chaque phase (collecte contextes, PubMed, Semantic Scholar, generation LLM). A la fin, un fichier JSON est cree dans `data/outputs/`. Exemple : `data/outputs/Botulinum_toxin_type_A_wrinkle_t_MASTER.json`.

## 7. Batch multi sujets
`launch_batch.py` contient la liste `batch_config`. Pour lancer toute la serie :
```bash
python launch_batch.py
```
Le script boucle sur chaque entree (`query`, `problem`), appelle `main.py`, insere des pauses de securite pour les API, puis tente automatiquement `python scripts/build_face_index.py`. Adapter la liste pour vos campagnes (ex: nouveaux traitements) et commiter les ajustements si besoin.

## 8. Mise a jour de l Atlas
Apres avoir genere ou modifie des fiches JSON, construire l index :
```bash
python scripts/build_face_index.py
```
Ce script parcourt `data/outputs/`, extrait les champs clefs et produit `data/atlas-index.json`. Les interfaces `face-atlas.html`, `viewer.html`, `carousel-viewer.html` et `insta-viewer.html` peuvent ensuite charger ce fichier (ouvrir le HTML dans un navigateur et fournir le chemin de l index).
### Utilisation du Face Atlas
1. Ouvrir `face-atlas.html` dans un navigateur, puis s assurer que `data/atlas-index.json` est accessible (même dossier ou serveur statique simple).
2. Cliquer sur une zone du visage : la colonne de droite affiche désormais la liste des problématiques propres à cette zone (les intitulés sont traduits automatiquement en Français simple : Rides, Cicatrices/Acné, Perte de volume, etc., à partir de `problem_source`).
3. Sélectionner une problématique (puces). Tant que rien n est choisi, les procédures restent cachées pour mettre en avant le diagnostic.
4. Une fois la problématique active, la grille affiche uniquement les procédures capables de l adresser, avec badges zone/problématique et accès direct à la fiche détaillée.
5. Utiliser le bouton "Tout voir" pour réinitialiser la sélection, ou cliquer à nouveau sur la puce pour revenir à la liste des problématiques de la zone.

## 9. Organisation des donnees
- `data/outputs/` : source de verite (JSON complet). Conserver l historique pour pouvoir regrouper les stats.
- `data/atlas-index.json` : vue synthese, regeneree a la demande.
- `data/` peut aussi contenir des assets temporaires; eviter d y stocker d autres types de fichiers pour rester compatible avec le builder.

## 10. Resolution des problemes frequents
- **JSON incomplet** : le LLM peut tronquer si la reponse est trop longue. Augmenter `max_tokens` dans `src/llm_client.py` ou reduire temporairement `settings.MAX_STUDIES_PER_RUN`.
- **Erreurs API PubMed/Semantic Scholar** : verifiez la connectivite reseau et les quotas. Les connecteurs loggent `[WARN]` en cas d echec mais le run continue si possible.
- **Pas de donnees FDA ou PubChem** : comportement normal pour les dispositifs non medicamenteux; les champs retournent "Non disponible".
- **Atlas vide** : confirmer que `data/outputs/` contient bien des fiches JSON valides et relancer `python scripts/build_face_index.py`.

---
Derniere mise a jour : agent IA, 2025-12-14.
