# Big SIS App 📱 - The Expert Portal

The `bigsis-app` is the flagship user interface of the Big SIS ecosystem. It is designed to providing a premium, reassuring, and data-driven experience for aesthetics consumers.

## 🎯 Primary Objectives
1.  **Pedagogical Interface**: Translate complex medical data into beautiful, easy-to-understand clinical fiches.
2.  **Safety First**: Provide a secure environment for diagnostics and ingredient analysis.
3.  **Visual Excellence**: Dark glassmorphism design system to evoke a "high-tech clinic" vibe.

## 🛠 Features

### 🧛 Dark Glassmorphism Design
- **Visual Identity**: Uses a custom design system with blur effects, vibrant accents (Cyan/Purple), and premium typography.
- **Consistency**: Unified components (GlassPanel, StudyCard) across all pages.

### 🧙 Intelligent Wizard
- **Adaptive Flow**: A multi-step questionnaire that translates user concerns (wrinkles, texture) into structured technical requests for the Brain.
- **Instant Result**: Real-time generation of clinical dossiers with efficacy and safety scores.

### 🔍 Scientific Tools
- **Ingredients Scanner**: A specialized page to paste INCI lists and get immediate scientific validation via PubMed data.
- **Knowledge Library**: An admin-style dashboard to view and manage the studies ingested by the Brain.

### 🌐 Internationalization (i18n)
- **Full Support**: Native support for French and English.
- **Dynamic Switching**: Switch languages on the fly across the entire application without reloading.

## 🏁 Development

### Requirements
- Node.js 18+
- Vite

### Setup
```bash
cd bigsis-app
npm install
npm run dev
```

## 📂 Core Structure
- `src/components/`: Reusable UI elements (Header, Wizard, Card).
- `src/pages/`: Main views (Home, Fiche, Scanner, Knowledge).
- `src/context/`: State management for Language and Global UI.
- `src/api/`: Typed client for communicating with `bigsis-brain`.
