# Sauvegarde Palette de Couleurs Actuelle - BigSIS

**Date de sauvegarde :** 21 janvier 2026
**Raison :** Avant refactoring suite à audit UX/UI

---

## Palette Officielle (Définie mais Non Utilisée)

**Fichier :** `src/index.css:17-28`

```css
:root {
  --deep-teal: #0D3B4C;
  --rich-plum: #4B1D3F;
  --accent-cyan: #22D3EE;
  --success-green: #10B981;
  --peachy-coral: #FB7185;
  --alert-red: #EF4444;
  --card-bg: #FFFFFF;
  --text-main: #1F2937;
  --text-muted: #6B7280;
  --soft-sage: #E2E8F0;
}
```

---

## Couleurs Tailwind Actuellement Utilisées

### 1. Cyan (Accent Principal)
- `cyan-300` - Texte highlight léger
- `cyan-400` - **Couleur d'accent principale** (correspond à --accent-cyan #22D3EE)
- `cyan-500` - Boutons primaires, focus states
- `cyan-600` - Gradient boutons (from)
- `cyan-900/10`, `cyan-900/20` - Backgrounds avec opacité

**Fichiers :**
- `Header.tsx:17` → `from-cyan-500 to-purple-600`
- `WizardForm.tsx:43` → `bg-cyan-400`
- `WizardForm.tsx:112` → `bg-cyan-500`
- `ProcedureList.tsx:23` → `text-cyan-400`

### 2. Purple (Accent Secondaire)
- `purple-200` - Gradients titres
- `purple-300` - Éléments interactifs
- `purple-400` - Gradients, icônes
- `purple-500` - Backgrounds hover, effets
- `purple-600` - Gradients (to)
- `purple-900/20`, `purple-900/50` - Backgrounds sombres

**Fichiers :**
- `HomePage.tsx:29` → `bg-purple-500/30`
- `StudioPage.tsx:63` → `from-purple-400 via-cyan-400 to-purple-400`
- `WizardForm.tsx:195` → `bg-purple-500/20`

### 3. Blue (Texte & Backgrounds)
- `blue-100` - Texte léger
- `blue-200` - Texte secondaire, badges
- `blue-300` - Petits textes, metadata
- `blue-400` - Badges status
- `blue-500` - Focus rings, badges
- `blue-600` - Gradients boutons
- `blue-900/50` - Backgrounds modales

**Fichiers :**
- `HomePage.tsx:36` → `text-blue-200`
- `WizardForm.tsx:72` → `text-blue-200/70`
- `ResultPage.tsx:88` → `text-blue-100/90`
- `PubMedTrigger.tsx:63` → `focus:ring-blue-500/50`

### 4. Green (Succès)
- `green-300` - Texte status positif
- `green-400` - Icônes succès, indicateurs (correspond partiellement à --success-green #10B981)
- `green-500` - Badges, status
- `green-600` - Gradients

**Fichiers :**
- `HomePage.tsx:54` → `bg-green-400`
- `ResultPage.tsx:52` → `bg-green-500/20 text-green-300`
- `ProcedureList.tsx:37` → `bg-green-500/20 text-green-400`

### 5. Red (Erreur/Alerte)
- `red-300` - Texte erreur léger
- `red-400` - Texte erreur principal (correspond à --alert-red #EF4444)
- `red-500` - Badges erreur, backgrounds
- `red-600` - Hover states erreurs

**Fichiers :**
- `ResultPage.tsx:52` → `bg-red-500/20 text-red-300`
- `ScannerPage.tsx:50` → `text-red-400`
- `DocumentList.tsx:103` → `bg-red-500 hover:bg-red-600`

### 6. Yellow (Avertissement)
- `yellow-300` - Texte warning léger
- `yellow-400` - Icônes warning, indicateurs
- `yellow-500` - Badges warning

**Fichiers :**
- `ResultPage.tsx:53` → `bg-yellow-500/20 text-yellow-300`
- `ScannerPage.tsx:49` → `text-yellow-400`

### 7. Gray (Texte & Bordures)
- `gray-300` - Texte secondaire
- `gray-400` - Texte désactivé, navigation inactive (proche de --text-muted #6B7280)
- `gray-500` - Texte tertiaire, placeholders
- `gray-600` - Texte très désaturé

**Fichiers :**
- `Header.tsx:48` → `text-gray-400`
- `StudioPage.tsx:66` → `text-gray-400`
- `IngredientsPage.tsx:78` → `placeholder-gray-500`

### 8. Teal (Variante Accent)
- `teal-300` - Texte highlight
- `teal-400` - Icônes, bordures
- `teal-500` - Focus rings, backgrounds

**Fichiers :**
- `SemanticScholarTrigger.tsx:40` → `bg-teal-500/20`
- `SemanticScholarTrigger.tsx:61` → `focus:ring-teal-500/50`

### 9. Pink (Highlights)
- `pink-200` - Texte léger
- `pink-300` - Badges
- `pink-400` - Icônes
- `pink-500` - Backgrounds
- `pink-900/20` - Backgrounds sombres

**Fichiers :**
- `FicheVeriteViewer.tsx:105` → `to-pink-900/20`
- `FicheVeriteViewer.tsx:106` → `text-pink-400`
- `FichePage.tsx:168` → `text-pink-300`

### 10. Orange (Secondaire)
- `orange-400` - Status secondaire
- `orange-500` - Badges, alerts

**Fichiers :**
- `DocumentList.tsx:215` → `bg-orange-500/10 text-orange-400`

---

## Couleurs Hardcodées (Hors Tailwind)

### Background Principal
```css
/* index.css:36 */
background: linear-gradient(135deg, #1a1c2e 0%, #312e81 100%);
```
- `#1a1c2e` - Deep indigo foncé
- `#312e81` - Indigo (indigo-900 Tailwind)

### Glassmorphism Effects
```css
/* index.css:46-76 */
.glass-panel {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

.glass-input {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.glass-input:focus {
  border-color: rgba(165, 180, 252, 0.5); /* Indigo-300 */
  background: rgba(0, 0, 0, 0.3);
}

.glass-button {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.glass-button:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%);
}
```

### Backgrounds Modales
- `#0B1221` - Dark blue foncé (utilisé pour modales)
- `#0f172a` - Slate-900 (variante)
- `#242424` - Gray très foncé (body default)

### Shadows avec Couleurs
```tsx
// WizardForm.tsx:113
shadow-[0_0_15px_rgba(34,211,238,0.3)]  // Cyan glow

// HomePage.tsx:54
shadow-[0_0_10px_theme(colors.green.400)]  // Green glow

// Header.tsx:47
shadow-[0_0_15px_rgba(34,211,238,0.3)]  // Cyan glow
```

### Couleurs Demo (App.css)
```css
/* App.css:15-18 */
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);  /* Blue Vite */
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);  /* Cyan React */
}
```

---

## Opacités Utilisées

### White Opacities (Glassmorphism)
- `/5` - Très léger (5%)
- `/10` - Léger (10%)
- `/20` - Background subtle (20%)
- `/30` - Text disabled (30%)
- `/40` - Hover states (40%)
- `/50` - Borders focus (50%)
- `/60` - Text secondaire (60%)
- `/70` - Text visible (70%)
- `/80` - Text principal (80%)
- `/90` - Text emphasized (90%)

### Black Opacities
- `/20` - Input backgrounds
- `/30` - Input focus
- `/37` - Shadow glass-panel
- `/40` - Dark cards
- `/60` - Dark footers
- `/80` - Modal overlays

### Color Opacities (Tailwind Slash Notation)
Format: `color-shade/opacity`

Exemples:
- `cyan-500/20` - Cyan backgrounds
- `green-500/20` - Success backgrounds
- `red-500/20` - Error backgrounds
- `blue-100/90` - Text avec opacité
- `purple-900/50` - Dark purple backgrounds

---

## Correspondances Palette Officielle

| Variable CSS | Équivalent Tailwind Utilisé | Utilisation Actuelle |
|--------------|------------------------------|----------------------|
| `--deep-teal: #0D3B4C` | ❌ Non utilisé | Devrait être utilisé pour headers |
| `--rich-plum: #4B1D3F` | `purple-500` (approx) | Gradients, accents |
| `--accent-cyan: #22D3EE` | `cyan-400` ✅ | Couleur d'accent principale |
| `--success-green: #10B981` | `green-400` (approx) | Status succès |
| `--peachy-coral: #FB7185` | ❌ Non utilisé | Rose-400 (proche) |
| `--alert-red: #EF4444` | `red-400` ✅ | Erreurs |
| `--card-bg: #FFFFFF` | ❌ Non utilisé | Backgrounds clairs (inexistants) |
| `--text-main: #1F2937` | ❌ Non utilisé | Text devrait être gray-800 |
| `--text-muted: #6B7280` | `gray-400` (approx) | Text secondaire |
| `--soft-sage: #E2E8F0` | ❌ Non utilisé | Backgrounds légers |

---

## Notes d'Utilisation

### Patterns Courants

1. **Boutons Primaires :**
   - `bg-cyan-500 text-black` (solid)
   - `bg-gradient-to-r from-cyan-600 to-blue-600` (gradient)

2. **Status Colors :**
   - Success: `bg-green-500/20 text-green-400 border-green-500/30`
   - Warning: `bg-yellow-500/20 text-yellow-400 border-yellow-500/30`
   - Error: `bg-red-500/20 text-red-400 border-red-500/30`

3. **Text Hierarchy :**
   - Primary: `text-white`
   - Secondary: `text-blue-100/90`, `text-blue-200/80`
   - Tertiary: `text-gray-400`, `text-blue-300/60`

4. **Cards/Panels :**
   - Glass: `bg-white/5 border border-white/10 backdrop-blur-md`
   - Dark: `bg-black/40 border border-white/10`
   - Modal: `bg-[#0B1221] border border-white/10`

---

## Fichiers Principaux à Modifier

Si refactoring complet de la palette :

1. **index.css** - Variables CSS, glass effects
2. **tailwind.config.js** - Définir couleurs custom
3. **Tous les TSX** - Remplacer classes Tailwind par palette officielle

### Stratégie de Migration

**Option 1 : Garder l'existant**
- Documenter les couleurs actuelles comme palette officielle
- Mettre à jour les variables CSS pour correspondre

**Option 2 : Migrer vers palette définie**
- Créer mapping Tailwind → Variables CSS
- Rechercher/remplacer systématique

**Option 3 : Hybride (Recommandé)**
- Garder cyan-400, red-400, green-400 (correspondent à palette)
- Ajouter deep-teal, rich-plum dans tailwind.config.js
- Remplacer progressivement

---

## Restauration

Pour revenir à cette palette :

1. **Git reset** vers le commit actuel
2. **Ou copier les classes** depuis cette backup
3. **Ou utiliser ce mapping** dans tailwind.config.js

---

**Ce fichier est une référence complète de l'état actuel de la palette avant toute modification.**
