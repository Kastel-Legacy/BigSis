# BigSis App (Frontend)

## 📱 C'est quoi ?
L'interface utilisateur de l'écosystème BigSis. 
C'est une application React (Vite + TypeScript) responsive (Mobile First) qui permet :
- Aux utilisateurs de scanner leur visage (Mock ou réel).
- De visualiser l'analyse "Big Sis Brain".
- D'interagir avec le contenu éducatif.

## 🛠 Tech Stack
- **Framework** : React 18
- **Build Tool** : Vite
- **Langage** : TypeScript
- **Styling** : CSS Modules / Tailwind (selon config)
- **State** : React Context / Hooks

## 🚀 Installation

1. **Pré-requis** : Node.js 18+
2. **Installation** :
   ```bash
   cd bigsis-app
   npm install
   ```

## ⚡ Démarrage
```bash
npm run dev
```
L'application sera accessible sur `http://localhost:5173`.

## 🔌 Connexion Backend
L'application attend que `bigsis-brain` tourne sur `http://localhost:8000`.
Vérifiez la configuration dans `.env` (ou `src/config.ts`) si le port diffère.
