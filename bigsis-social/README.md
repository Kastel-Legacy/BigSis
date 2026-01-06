# BigSis Social

## 🤳 C'est quoi ?
BigSis Social est le module de génération de contenu pour les réseaux sociaux. 
Il agit comme un **Client** qui consomme l'API de `bigsis-brain` pour générer du contenu éducatif et scientifique sur les soins de la peau.
Il inclut également un **Viewer** pour visualiser le contenu généré sous forme de carrousel Instagram.

## 🚀 Installation

1. **Pré-requis** : Python 3.10+
2. **Installation des dépendances** :
   ```bash
   cd bigsis-social
   # Création venv recommandée mais pas obligatoire si déjà isolée
   pip install requests
   ```
   (Note: La logique lourde étant dans `bigsis-brain`, ce module est très léger).

## ⚡ Utilisation

### 1. Démarrer Brain (Obligatoire)
Assurez-vous que le serveur API tourne sur le port 8000 :
```bash
# Dans bigsis-brain
uvicorn main:app --port 8000
```

### 2. Générer du contenu
```bash
# Dans bigsis-social
python3 main.py --topic "Vitamin C"
```
Cela va :
1. Envoyer une requête à l'API.
2. Recevoir le fichier JSON.
3. Sauvegarder dans `data/outputs/Vitamin_C_MASTER.json`.

### 3. Visualiser
```bash
python3 -m http.server 8001
```
Ouvrir `http://localhost:8001/insta-viewer.html` et glisser le fichier JSON généré.
