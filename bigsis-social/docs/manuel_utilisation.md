# Manuel d'Utilisation - BigSis Social (Client)

## 1. Objet
BigSis Social est désormais un **Client Léger** responsable de :
1. Déclencher la génération de fiches via l'API `bigsis-brain`.
2. Sauvegarder les fichiers JSON générés.
3. Visualiser le contenu via l'Instagram Viewer.

L'intelligence (collecte PubMed, analyse LLM, etc.) est déportée dans le module `bigsis-brain`.

## 2. Architecture
- `main.py` : Script principal. Envoie la demande à `brain` et écrit le JSON reçu sur le disque.
- `insta-viewer.html` : Interface web locale pour visualiser le rendu "Réseau Social".
- `data/outputs/` : Dossier de réception des fiches JSON.

## 3. Pré-requis
- **BigSis Brain** doit être démarré (voir documentation `bigsis-brain`).
- Python 3.10+
- Librairie `requests` (`pip install requests`).

## 4. Génération de Contenu
### Étape 1 : Démarrer l'API Brain
Dans un autre terminal, lancez le serveur `brain` :
```bash
cd ../bigsis-brain
uvicorn main:app --port 8000
```

### Étape 2 : Lancer la commande Client
```bash
python3 main.py --topic "Vitamin C"
```
Ou avec un problème spécifique pour le mode "Challenger" :
```bash
python3 main.py --topic "Retinol" --problem "Acne"
```

Le script va :
1. Interroger `http://localhost:8000/api/v1/generate/social`.
2. Afficher la progression côté serveur (voir les logs du terminal Brain).
3. Sauvegarder le résultat dans `data/outputs/`.

## 5. Visualisation
Pour voir le résultat :
1. Lancer un serveur web simple dans ce dossier :
   ```bash
   python3 -m http.server 8001
   ```
2. Ouvrir le navigateur sur `http://localhost:8001/insta-viewer.html`.
3. Glisser-déposer le fichier JSON généré (depuis `data/outputs`) ou utiliser l'URL `?file=...`.
