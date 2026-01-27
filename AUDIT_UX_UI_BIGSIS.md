# Audit UX/UI Complet - BigSIS Application

**Date:** 21 janvier 2026
**Projet:** BigSIS Monorepo - Frontend Application
**Auditeur:** Claude Sonnet 4.5
**Périmètre:** bigsis-app/src (React + TypeScript + TailwindCSS)

---

## Résumé Exécutif

Cet audit révèle **des problèmes critiques de cohérence** dans l'application BigSIS, notamment :

### 🔴 Problèmes Critiques

1. **Dérive majeure de la palette de couleurs** : Les 10 couleurs officielles définies dans [index.css](bigsis-app/src/index.css#L17-L28) ne sont **jamais utilisées** dans l'application. À la place, 40+ couleurs Tailwind non standardisées sont employées.

2. **Lien cassé critique** : Route `/procedure/:pmid` attend un PMID mais reçoit des noms de procédures, causant des erreurs d'API ([ProcedureList.tsx:47](bigsis-app/src/components/ProcedureList.tsx#L47)).

3. **Accessibilité insuffisante** :
   - 8+ violations de contraste WCAG AA
   - 0 attribut ARIA dans toute l'application
   - Information transmise uniquement par la couleur sans label textuel

4. **Route orpheline** : La page `/research` (ResearcherPage) n'est accessible par aucun lien de navigation.

### 🟠 Problèmes Moyens

1. **Incohérences typographiques** : Titres de même niveau utilisant entre `text-3xl` et `text-6xl`
2. **Boutons inconsistants** : 4+ schémas de padding différents, 3 border-radius différents
3. **États de focus** : 3 couleurs de focus ring différentes sans standardisation
4. **Espacement incohérent** : 20+ variations de spacing sans système clair

### 🟡 Problèmes Mineurs

1. **Redondances CSS** : Styles dupliqués entre composants
2. **Responsive limité** : Seulement 32 breakpoints `md:` dans toute l'application
3. **Animations variables** : Durées non standardisées (200ms, 300ms, 500ms, 700ms)

---

## 1. Palette de Couleurs

### 1.1 Palette Officielle (Définie mais Non Utilisée)

**Fichier:** [index.css:17-28](bigsis-app/src/index.css#L17-L28)

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

**❌ Problème Critique :** Aucune de ces variables CSS n'est utilisée dans les fichiers TSX. Recherche exhaustive de `var(--deep-teal)`, `var(--accent-cyan)`, etc. = 0 résultat.

---

### 1.2 Couleurs Utilisées (Non Officielles)

L'application utilise **40+ couleurs Tailwind** non définies dans la palette officielle :

| Couleur | Utilisations | Exemples de Fichiers | Statut |
|---------|--------------|----------------------|--------|
| **cyan-300/400/500/600** | 25+ | [Header.tsx:17](bigsis-app/src/components/Header.tsx#L17), [WizardForm.tsx:43](bigsis-app/src/components/WizardForm.tsx#L43) | ⚠️ Non standardisée |
| **purple-300/400/500/600/900** | 20+ | [StudioPage.tsx:63](bigsis-app/src/pages/StudioPage.tsx#L63), [HomePage.tsx:29](bigsis-app/src/pages/HomePage.tsx#L29) | ⚠️ Non standardisée |
| **blue-100/200/400/500/600/900** | 30+ | [WizardForm.tsx:72](bigsis-app/src/components/WizardForm.tsx#L72), [ResultPage.tsx:88](bigsis-app/src/pages/ResultPage.tsx#L88) | ⚠️ Non dans palette |
| **green-300/400/500** | 15+ | [HomePage.tsx:54](bigsis-app/src/pages/HomePage.tsx#L54), [ProcedureList.tsx:37](bigsis-app/src/components/ProcedureList.tsx#L37) | ⚠️ Non dans palette |
| **red-300/400/500** | 10+ | [ResultPage.tsx:52](bigsis-app/src/pages/ResultPage.tsx#L52), [ScannerPage.tsx:50](bigsis-app/src/pages/ScannerPage.tsx#L50) | ⚠️ Non dans palette |
| **yellow-300/400/500** | 8+ | [ResultPage.tsx:53](bigsis-app/src/pages/ResultPage.tsx#L53), [ScannerPage.tsx:49](bigsis-app/src/pages/ScannerPage.tsx#L49) | ⚠️ Non dans palette |
| **gray-300/400/500/600** | 12+ | [Header.tsx:48](bigsis-app/src/components/Header.tsx#L48) | ⚠️ Non dans palette |
| **teal-300/400/500** | 4+ | [SemanticScholarTrigger.tsx:40](bigsis-app/src/components/SemanticScholarTrigger.tsx#L40) | ⚠️ Non dans palette |
| **pink-200/300/400/900** | 6+ | [FicheVeriteViewer.tsx:105](bigsis-app/src/components/social/FicheVeriteViewer.tsx#L105) | ⚠️ Non dans palette |
| **orange-400/500** | 3+ | [DocumentList.tsx:215](bigsis-app/src/components/DocumentList.tsx#L215) | ⚠️ Non dans palette |

---

### 1.3 Couleurs Hardcodées (Hors Palette)

#### A. Gradient de fond principal

**Fichier:** [index.css:36](bigsis-app/src/index.css#L36)

```css
background: linear-gradient(135deg, #1a1c2e 0%, #312e81 100%);
```

- `#1a1c2e` et `#312e81` : Couleurs deep indigo **non définies** dans la palette officielle
- Utilisées comme fond global mais ignorent le design system

#### B. Effets glassmorphism

**Fichier:** [index.css:46-76](bigsis-app/src/index.css#L46-L76)

```css
.glass-panel {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

.glass-input:focus {
  border-color: rgba(165, 180, 252, 0.5); /* ⚠️ Indigo non dans palette */
}
```

Problèmes :
- 12+ valeurs RGBA hardcodées au lieu d'utiliser des variables CSS
- Focus utilise indigo (`rgba(165, 180, 252, 0.5)`) non présent dans palette officielle

#### C. App.css - Couleurs de démonstration

**Fichier:** [App.css:15-18](bigsis-app/src/App.css#L15-L18)

```css
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);  /* ⚠️ Bleu non dans palette */
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);  /* ⚠️ Cyan non dans palette */
}
```

---

### 1.4 Violations de Contraste (WCAG)

#### Violations Critiques

1. **White/30 sur fond sombre** ([WizardForm.tsx:114](bigsis-app/src/components/WizardForm.tsx#L114))
   ```tsx
   className="bg-white/10 text-white/30 cursor-not-allowed"
   ```
   - **Ratio estimé :** ~1.5:1 (WCAG AA requis: 4.5:1)
   - **Échec :** AAA (7:1) et AA (4.5:1)

2. **Gray-400 sur fond noir** ([Header.tsx:48](bigsis-app/src/components/Header.tsx#L48))
   ```tsx
   text-gray-400 hover:text-white
   ```
   - **Ratio estimé :** ~3.2:1 sur fond `#242424`
   - **Échec :** AA (4.5:1)

3. **Blue-100/80 sur fond sombre** ([HomePage.tsx:48](bigsis-app/src/pages/HomePage.tsx#L48))
   ```tsx
   text-blue-100/80
   ```
   - **Ratio estimé :** ~3.5:1
   - **Échec :** AA (4.5:1)

4. **Blue-200/70 sur fond sombre** ([WizardForm.tsx:72](bigsis-app/src/components/WizardForm.tsx#L72))
   ```tsx
   text-blue-200/70
   ```
   - **Ratio estimé :** ~3.0:1
   - **Échec :** AA (4.5:1)

5. **Cyan-500/20 avec texte blanc** ([WizardForm.tsx:62](bigsis-app/src/components/WizardForm.tsx#L62))
   ```tsx
   bg-cyan-500/20 border-cyan-400/50
   ```
   - Cyan avec 20% d'opacité = Très faible contraste avec texte blanc

---

### 1.5 Informations Transmises Uniquement par Couleur

**🔴 Violation WCAG 1.4.1 (Use of Color)**

#### Exemple 1: Verdicts Scanner

**Fichier:** [ScannerPage.tsx:47-51](bigsis-app/src/pages/ScannerPage.tsx#L47-L51)

```tsx
const getColor = (color: string) => {
  if (color === 'green') return 'text-green-400 border-green-400 bg-green-400/10';
  if (color === 'yellow') return 'text-yellow-400 border-yellow-400 bg-yellow-400/10';
  return 'text-red-400 border-red-400 bg-red-400/10';
};
```

**Problème :** Les verdicts sont uniquement distingués par couleur. Pas de label textuel ("Validé", "Attention", "Risque") pour les utilisateurs daltoniens.

#### Exemple 2: Match Score Badges

**Fichier:** [ProcedureList.tsx:35-42](bigsis-app/src/components/ProcedureList.tsx#L35-L42)

```tsx
${proc.match_score > 90 ? 'bg-green-500/20 text-green-400' :
  proc.match_score > 70 ? 'bg-yellow-500/20 text-yellow-400' :
  'bg-blue-500/20 text-blue-400'}
```

**Bonne pratique :** Le texte "Match {score}%" est présent, mais la couleur seule ne doit pas être l'unique indicateur.

---

### 1.6 Incohérences d'Opacité

| Contexte | Opacités Utilisées | Fichiers |
|----------|-------------------|----------|
| **Arrière-plans** | /5, /10, /20, /30, /40, /50 | Divers |
| **Bordures** | /10, /20, /30, /50 | Divers |
| **Texte** | /30, /40, /50, /60, /70, /80, /90 | [ResultPage.tsx](bigsis-app/src/pages/ResultPage.tsx#L88), [HomePage.tsx](bigsis-app/src/pages/HomePage.tsx#L48) |
| **Ombres** | /20, /30, /37 | [index.css:50](bigsis-app/src/index.css#L50) |

**Problème :** Aucun système d'opacité cohérent. Exemple : [ResultPage.tsx](bigsis-app/src/pages/ResultPage.tsx) utilise `text-blue-100/90` (ligne 88), `text-blue-100/80` (ligne 96), et `text-blue-200/40` (ligne 119) pour le même type de contenu (texte secondaire).

---

### 1.7 Recommandations Palette de Couleurs

#### 🔴 Critique (Faire Immédiatement)

1. **Mapper toutes les couleurs Tailwind vers la palette officielle**
   - Créer un fichier de mapping: `cyan-400` = `var(--accent-cyan)`
   - Remplacer toutes les occurrences hardcodées

2. **Corriger les contrastes**
   - Remplacer `text-white/30` par `text-white/70` minimum
   - Tester tous les textes avec un outil de contraste (ex: [WebAIM](https://webaim.org/resources/contrastchecker/))

3. **Ajouter des labels textuels aux indicateurs de couleur**
   - Scanner verdicts: Ajouter "Validé", "Attention", "Risque" en plus de la couleur
   - Match scores: OK (texte déjà présent)

#### 🟠 Haut (Bientôt)

1. **Standardiser les opacités**
   - Adopter un système: `/10`, `/20`, `/50`, `/80` uniquement
   - Créer des variables CSS pour opacités courantes

2. **Utiliser les CSS custom properties partout**
   - Remplacer `bg-cyan-400` par `bg-[var(--accent-cyan)]`
   - Permet changement global de thème

3. **Définir les couleurs dans tailwind.config.js**
   ```js
   theme: {
     extend: {
       colors: {
         'brand-teal': '#0D3B4C',
         'brand-plum': '#4B1D3F',
         'brand-cyan': '#22D3EE',
         // ...
       }
     }
   }
   ```

#### 🟡 Moyen (Plus Tard)

1. **Créer un design token system** avec des noms sémantiques
2. **Documenter la palette** dans un Storybook ou guide de style
3. **Ajouter un linter** pour interdire les couleurs non définies

---

## 2. Navigation et Liens

### 2.1 Structure des Routes

**Fichier:** [App.tsx:18-27](bigsis-app/src/App.tsx#L18-L27)

| Route | Composant | Accessible | Navigation Principale |
|-------|-----------|------------|----------------------|
| `/` | HomePage | ✅ | ✅ Header |
| `/result` | ResultPage | ✅ | ❌ (page intermédiaire) |
| `/ingredients` | IngredientsPage | ✅ | ✅ Header |
| `/studio` | StudioPage | ✅ | ✅ Header |
| `/scanner` | ScannerPage | ✅ | ✅ Header |
| `/knowledge` | KnowledgePage | ✅ | ✅ Header + HomePage |
| `/research` | **ResearcherPage** | ❌ **Orpheline** | ❌ **Absent du Header** |
| `/procedure/:pmid` | FichePage | ⚠️ **Cassé** | ❌ (page de détail) |

---

### 2.2 Problème Critique : Route `/procedure/:pmid` Cassée

#### Diagnostic

**Définition de route:** [App.tsx:27](bigsis-app/src/App.tsx#L27)
```tsx
<Route path="/procedure/:pmid" element={<FichePage />} />
```

**Utilisation du paramètre:** [FichePage.tsx:9](bigsis-app/src/pages/FichePage.tsx#L9)
```tsx
const { pmid } = useParams();
```

**Lien problématique:** [ProcedureList.tsx:47](bigsis-app/src/components/ProcedureList.tsx#L47)
```tsx
<Link to={`/procedure/${encodeURIComponent(proc.procedure_name)}`}>
  {proc.procedure_name}
</Link>
```

#### Problème

- **Route attend :** `:pmid` (identifiant PubMed)
- **Lien passe :** `procedure_name` (nom de procédure URL-encodé)
- **Résultat :** L'API `getFiche(pmid)` reçoit un nom au lieu d'un ID → **Erreur d'API garantie**

#### Impact

- **Severité :** 🔴 Critique
- **Conséquence :** Tous les clics sur les procédures dans ResultPage échouent
- **Utilisateur :** Impossible d'accéder aux détails de procédure

#### Solution Recommandée

**Option 1 :** Changer le lien pour passer le PMID
```tsx
// ProcedureList.tsx:47
<Link to={`/procedure/${proc.pmid}`}>
  {proc.procedure_name}
</Link>
```

**Option 2 :** Changer la route et FichePage
```tsx
// App.tsx:27
<Route path="/procedure/:name" element={<FichePage />} />

// FichePage.tsx:9
const { name } = useParams();
// Appel API différent ou lookup name->pmid
```

**Recommandation :** Option 1 (plus simple et sémantiquement correct).

---

### 2.3 Problème : Page Orpheline `/research`

**Fichier:** [ResearcherPage.tsx](bigsis-app/src/pages/ResearcherPage.tsx)

#### Diagnostic

- **Route définie :** [App.tsx:26](bigsis-app/src/App.tsx#L26)
- **Navigation Header :** [Header.tsx:28-33](bigsis-app/src/components/Header.tsx#L28-L33) (5 routes, `/research` absent)
- **Liens internes :** Aucun lien vers `/research` dans tout le code

#### Impact

- **Découvrabilité :** Utilisateurs ne peuvent pas trouver la fonctionnalité "ASTRA Deep Research"
- **Accès :** Seulement si URL tapée directement ou bookmark

#### Solution Recommandée

**Ajouter dans Header.tsx après ligne 32 :**
```tsx
<NavLink
  to="/research"
  icon={<Search size={18} />}
  label="Research"
  active={location.pathname === '/research'}
/>
```

---

### 2.4 Patterns de Navigation Incohérents

#### A. Back Navigation

| Page | Méthode | Fichier & Ligne |
|------|---------|-----------------|
| ResultPage | `navigate('/')` (route hardcodée) | [ResultPage.tsx:23](bigsis-app/src/pages/ResultPage.tsx#L23) |
| FichePage | `navigate(-1)` (historique navigateur) | [FichePage.tsx:81](bigsis-app/src/pages/FichePage.tsx#L81) |
| ResultPage | `<Link to="/">` (composant Link) | [ResultPage.tsx:62](bigsis-app/src/pages/ResultPage.tsx#L62) |

**Problème :** 3 méthodes différentes pour "retour". Non cohérent.

**Recommandation :** Standardiser sur `navigate(-1)` sauf si besoin de forcer un retour à l'accueil.

#### B. Link vs useNavigate()

- **`<Link>`** utilisé dans : Header, ResultPage, ProcedureList
- **`useNavigate()`** utilisé dans : HomePage, ResultPage, FichePage, WizardForm, Header (logo)

**Recommandation :**
- Préférer `<Link>` pour les liens statiques (meilleure accessibilité, SEO)
- Réserver `useNavigate()` pour navigation avec state ou logique conditionnelle

---

### 2.5 Indicateurs d'État Actif

**Implémentation:** [Header.tsx:40-56](bigsis-app/src/components/Header.tsx#L40-L56)

```tsx
const NavLink = ({ to, icon, label, active }) => (
  <Link
    to={to}
    className={`
      ${active
        ? 'bg-white/10 border-white/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
        : 'text-gray-400 hover:text-white hover:bg-white/5'}
    `}
  >
```

| Route | Active State | Logique |
|-------|-------------|---------|
| `/` | ✅ | `location.pathname === '/' \|\| location.pathname === '/diagnostic'` |
| `/scanner` | ✅ | `location.pathname === '/scanner'` |
| `/knowledge` | ✅ | `location.pathname === '/knowledge'` |
| `/ingredients` | ✅ | `location.pathname === '/ingredients'` |
| `/studio` | ✅ | `location.pathname === '/studio'` |
| `/research` | ❌ | **Absent du Header** |

**Bonne pratique :** État actif bien implémenté avec changement de couleur + ombre + fond.

**Amélioration possible :** Ajouter `aria-current="page"` pour accessibilité.

---

### 2.6 Liens Externes - Sécurité

Tous les liens externes sont **correctement sécurisés** :

| Fichier | Attributs |
|---------|-----------|
| [ResultPage.tsx:113](bigsis-app/src/pages/ResultPage.tsx#L113) | `target="_blank" rel="noreferrer"` ✅ |
| [FichePage.tsx:228](bigsis-app/src/pages/FichePage.tsx#L228) | `target="_blank" rel="noreferrer"` ✅ |
| [StudyCard.tsx:53](bigsis-app/src/components/StudyCard.tsx#L53) | `target="_blank" rel="noreferrer"` ✅ |

**Statut :** Pas de problème de sécurité (protection contre tabnabbing).

---

### 2.7 Recommandations Navigation

#### 🔴 Critique

1. **Corriger la route `/procedure/:pmid`**
   - Fichier : [ProcedureList.tsx:47](bigsis-app/src/components/ProcedureList.tsx#L47)
   - Action : Passer `proc.pmid` au lieu de `proc.procedure_name`

2. **Ajouter `/research` au Header**
   - Fichier : [Header.tsx:29-33](bigsis-app/src/components/Header.tsx#L29-L33)
   - Action : Ajouter `<NavLink to="/research" icon={<Search />} label="Research" />`

#### 🟠 Haut

1. **Standardiser la navigation de retour**
   - Adopter `navigate(-1)` partout où approprié
   - Documenter quand utiliser route hardcodée vs historique

2. **Ajouter `aria-current="page"` aux liens actifs**
   - Fichier : [Header.tsx:42](bigsis-app/src/components/Header.tsx#L42)
   - Améliore l'accessibilité pour lecteurs d'écran

#### 🟡 Moyen

1. **Valider les URLs dynamiques**
   - Ajouter des checks null avant de rendre `<a href={ev.url}>`
   - Afficher un fallback si URL manquante

2. **Créer un composant `ExternalLink` réutilisable**
   - Encapsule `target="_blank" rel="noreferrer"`
   - DRY (Don't Repeat Yourself)

---

## 3. Cohérence des Composants UI

### 3.1 Boutons

#### A. Styles de Boutons Identifiés

| Type | Style | Padding | Border Radius | Font Weight | Fichiers |
|------|-------|---------|---------------|-------------|----------|
| **Primary CTA** | `bg-cyan-500 text-black` | `px-6 py-2` | `rounded-full` | `font-medium` | [WizardForm.tsx:112-114](bigsis-app/src/components/WizardForm.tsx#L112-L114) |
| **Primary CTA (gradient)** | `bg-gradient-to-r from-cyan-600 to-blue-600` | `px-8 py-3` | `rounded-xl` | `font-bold` | [StudioPage.tsx:111](bigsis-app/src/pages/StudioPage.tsx#L111) |
| **Primary CTA (gradient)** | `bg-gradient-to-r from-cyan-600 to-blue-600` | `py-3` (no px) | `rounded-xl` | `font-bold` | [ScannerPage.tsx:100](bigsis-app/src/pages/ScannerPage.tsx#L100) |
| **Secondary (glass)** | `.glass-button` gradient | Variable | `rounded-xl` | Aucun | [index.css:65-75](bigsis-app/src/index.css#L65-L75) |
| **Navigation** | `bg-white/10 text-cyan-400` | `px-4 py-2` | `rounded-lg` | `font-medium` | [Header.tsx:47](bigsis-app/src/components/Header.tsx#L47) |

#### B. Incohérences Détectées

1. **Padding Variation** (5+ schémas)
   - `px-6 py-2` → [WizardForm.tsx:117](bigsis-app/src/components/WizardForm.tsx#L117)
   - `px-8 py-3` → [StudioPage.tsx:111](bigsis-app/src/pages/StudioPage.tsx#L111)
   - `py-3` (sans px) → [ScannerPage.tsx:100](bigsis-app/src/pages/ScannerPage.tsx#L100)
   - `px-4 py-2.5` → [PdfUpload.tsx:124](bigsis-app/src/components/PdfUpload.tsx#L124)
   - `px-4 py-2` → [Header.tsx:45](bigsis-app/src/components/Header.tsx#L45)

2. **Border Radius Variation** (3 valeurs)
   - `rounded-full` → Boutons wizard
   - `rounded-xl` → Boutons StudioPage, ScannerPage
   - `rounded-lg` → Boutons Header, modales

3. **Font Weight** (3+ valeurs)
   - `font-medium` → Wizard, Header
   - `font-bold` → Scanner, Studio, Procedure
   - Aucune → Glass buttons

4. **Hover States Inconsistants**
   - Glow: `shadow-[0_0_15px_rgba(34,211,238,0.3)]` → [WizardForm.tsx:113](bigsis-app/src/components/WizardForm.tsx#L113)
   - Scale: `hover:scale-105` → [WizardForm.tsx:231](bigsis-app/src/components/WizardForm.tsx#L231)
   - Background change only: `hover:bg-white/10` → [Header.tsx:48](bigsis-app/src/components/Header.tsx#L48)

#### C. États Disabled

**Problème :** Pas de style disabled cohérent

- [WizardForm.tsx:114](bigsis-app/src/components/WizardForm.tsx#L114): `bg-white/10 text-white/30 cursor-not-allowed` (très faible contraste)
- [ScannerPage.tsx:100](bigsis-app/src/pages/ScannerPage.tsx#L100): `disabled:opacity-50 disabled:cursor-not-allowed`
- [StudioPage.tsx:111](bigsis-app/src/pages/StudioPage.tsx#L111): `disabled:opacity-50 disabled:cursor-not-allowed`

**Recommandation :** Créer une classe `.btn-disabled` avec un style unifié.

---

### 3.2 Formulaires

#### A. Inputs

**Classe de base :** `.glass-input` ([index.css:53-63](bigsis-app/src/index.css#L53-L63))

```css
.glass-input {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
}

.glass-input:focus {
  outline: none;
  border-color: rgba(165, 180, 252, 0.5);  /* ⚠️ Indigo non dans palette */
  background: rgba(0, 0, 0, 0.3);
}
```

#### B. Implémentations Divergentes

| Composant | Classes | Padding | Focus Ring Color | Fichier |
|-----------|---------|---------|------------------|---------|
| PubMedTrigger | `glass-input` | `pl-4 pr-12 py-3` | `focus:ring-1 focus:ring-blue-500/50` | [PubMedTrigger.tsx:63](bigsis-app/src/components/PubMedTrigger.tsx#L63) |
| SemanticScholarTrigger | `glass-input` | `pl-4 pr-12 py-3` | `focus:ring-1 focus:ring-teal-500/50` | [SemanticScholarTrigger.tsx:61](bigsis-app/src/components/SemanticScholarTrigger.tsx#L61) |
| DocumentList | `glass-input` | `pl-10 pr-4 py-2.5` | `focus:ring-1 focus:ring-cyan-500/50` | [DocumentList.tsx:161](bigsis-app/src/components/DocumentList.tsx#L161) |
| ScannerPage | Custom | `p-3` | `focus:border-cyan-500/50` (no ring) | [ScannerPage.tsx:92](bigsis-app/src/pages/ScannerPage.tsx#L92) |
| StudioPage | Custom | `py-3` | Aucun focus visible | [StudioPage.tsx:105](bigsis-app/src/pages/StudioPage.tsx#L105) |
| IngredientsPage | Custom | Aucun padding défini | Aucun focus visible | [IngredientsPage.tsx:78](bigsis-app/src/pages/IngredientsPage.tsx#L78) |

#### C. Focus Ring Colors (Problème Majeur)

**3 couleurs de focus différentes :**
- **Blue :** [PubMedTrigger.tsx:63](bigsis-app/src/components/PubMedTrigger.tsx#L63) → `focus:ring-blue-500/50`
- **Teal :** [SemanticScholarTrigger.tsx:61](bigsis-app/src/components/SemanticScholarTrigger.tsx#L61) → `focus:ring-teal-500/50`
- **Cyan :** [DocumentList.tsx:161](bigsis-app/src/components/DocumentList.tsx#L161) → `focus:ring-cyan-500/50`

**Problème :** Pas de standardisation. Devrait être **une seule couleur** (ex: cyan-400 de la palette).

#### D. Placeholders

**Opacité et couleur variées :**
- `placeholder-gray-600` → [StudioPage.tsx:104](bigsis-app/src/pages/StudioPage.tsx#L104)
- `placeholder-gray-500` → [IngredientsPage.tsx:78](bigsis-app/src/pages/IngredientsPage.tsx#L78), [ResearcherPage.tsx:49](bigsis-app/src/pages/ResearcherPage.tsx#L49)
- `placeholder-gray-300` → Aucun mais devrait exister pour meilleur contraste

#### E. Messages d'Erreur

**Bonne pratique :** Style d'erreur cohérent

```tsx
// PdfUpload.tsx:130-137
<div className="bg-red-500/10 text-red-400 border border-red-500/20 p-4 rounded-xl">
  {errorMsg}
</div>
```

**Statut :** ✅ Erreurs consistantes (PdfUpload, PubMedTrigger, SemanticScholarTrigger).

**Amélioration :** Ajouter des icônes d'alerte pour renforcer le message visuel.

---

### 3.3 Typographie

#### A. Hiérarchie des Titres (Incohérence Majeure)

| Niveau Sémantique | Tailles Utilisées | Fichiers |
|-------------------|-------------------|----------|
| **H1 (Page Title)** | `text-3xl`, `text-4xl`, `text-5xl`, `text-6xl` | [HomePage.tsx:41](bigsis-app/src/pages/HomePage.tsx#L41), [KnowledgePage.tsx:38](bigsis-app/src/pages/KnowledgePage.tsx#L38), [ScannerPage.tsx:64](bigsis-app/src/pages/ScannerPage.tsx#L64) |
| **H2 (Section)** | `text-lg`, `text-xl`, `text-2xl` | [ProcedureList.tsx:22](bigsis-app/src/components/ProcedureList.tsx#L22), [WizardForm.tsx:86](bigsis-app/src/components/WizardForm.tsx#L86) |
| **H3 (Subsection)** | `text-lg`, `text-xl` | [ResultPage.tsx:85](bigsis-app/src/pages/ResultPage.tsx#L85), [DocumentList.tsx:149](bigsis-app/src/components/DocumentList.tsx#L149) |
| **Card Title** | `text-xl`, `text-2xl`, `text-3xl` | Divers |

**Exemple d'incohérence :**

- **HomePage :** `text-5xl md:text-6xl` pour le titre principal ([ligne 41](bigsis-app/src/pages/HomePage.tsx#L41))
- **ScannerPage :** `text-3xl` pour le titre principal ([ligne 64](bigsis-app/src/pages/ScannerPage.tsx#L64))
- **KnowledgePage :** `text-4xl md:text-6xl` pour le titre principal ([ligne 38](bigsis-app/src/pages/KnowledgePage.tsx#L38))

**Recommandation :** Standardiser :
- H1 : `text-4xl md:text-5xl`
- H2 : `text-2xl md:text-3xl`
- H3 : `text-xl md:text-2xl`
- H4 : `text-lg`

#### B. Font Weights

**Utilisés :** `font-light`, `font-medium`, `font-semibold`, `font-bold`, `font-extrabold`, `font-black`

| Weight | Usage Principal | Occurrences |
|--------|----------------|-------------|
| `font-black` | Page titles, emphasis | 15+ |
| `font-extrabold` | HomePage title | 1 |
| `font-bold` | Section headers, buttons | 40+ |
| `font-semibold` | Card titles | 5+ |
| `font-medium` | Body text, buttons | 20+ |
| `font-light` | Subtitles, secondary | 10+ |

**Recommandation :** Limiter à 4 weights : `light`, `medium`, `bold`, `black`.

#### C. Line Heights

**Problème :** Pas de système cohérent.

- `leading-relaxed` (line-height: 1.625)
- `leading-snug` (line-height: 1.375)
- `leading-tight` (line-height: 1.25)
- `leading-loose` (line-height: 2)
- Default (line-height: 1.5)

#### D. Letter Spacing

**Incohérences :**
- `tracking-tight` → Titres
- `tracking-wider` → Certains titres
- `tracking-widest` → Labels, metadata
- `tracking-[0.2em]` → **Valeur arbitraire** ([FichePage.tsx:235](bigsis-app/src/pages/FichePage.tsx#L235), [HomePage.tsx:69](bigsis-app/src/pages/HomePage.tsx#L69))

**Recommandation :** Utiliser uniquement les valeurs Tailwind prédéfinies.

---

### 3.4 Espacements

#### A. Padding (Cards/Panels)

**Distribution :**
- `p-2` : Petits éléments, icônes
- `p-4` : Cards compactes, modales
- `p-6` : **Le plus courant** (PdfUpload, PubMedTrigger)
- `p-8` : Grandes cards (FichePage, FicheVeriteViewer)
- `p-10` : Très rare

**Problème :** Trop de variations pour les mêmes types de composants.

**Exemple :**
- PdfUpload card : `p-6` ([PdfUpload.tsx:56](bigsis-app/src/components/PdfUpload.tsx#L56))
- FichePage main card : `p-8 md:p-10` ([FichePage.tsx:92](bigsis-app/src/pages/FichePage.tsx#L92))
- ProcedureList card : `p-6` ([ProcedureList.tsx:31](bigsis-app/src/components/ProcedureList.tsx#L31))

**Recommandation :** Standardiser cards à `p-6`, grandes modales à `p-8`.

#### B. Margins (Vertical Rhythm)

**Valeurs utilisées :** `mb-2`, `mb-4`, `mb-6`, `mb-8`, `mb-12`

**Problème :** Pas de rythme vertical cohérent.

**Exemple ([ResultPage.tsx](bigsis-app/src/pages/ResultPage.tsx)) :**
- Entre titre et section : `mb-8` (ligne 74)
- Entre sections : `mb-4` (ligne 85)
- Entre paragraphes : `mb-2` (ligne 90)
- Entre sous-sections : `mb-6` (ligne 104)

**Recommandation :** Adopter un système :
- Petits gaps : `mb-2`
- Éléments liés : `mb-4`
- Sections : `mb-8`
- Grandes sections : `mb-12`

#### C. Gaps (Flexbox/Grid)

**Valeurs :** `gap-2`, `gap-3`, `gap-4`, `gap-6`, `gap-8`

**Distribution :**
- `gap-2` : Tags, badges
- `gap-3` : Icon + text
- `gap-4` : Cards grids, forms
- `gap-6` : Main layout sections
- `gap-8` : Large layout spacing

**Statut :** Relativement cohérent, mais pourrait être réduit à 3 valeurs (`gap-2`, `gap-4`, `gap-8`).

---

### 3.5 Component Patterns

#### A. Cards/Panels (5+ Variantes)

1. **Glass Panel** ([index.css:46-51](bigsis-app/src/index.css#L46-L51))
   ```css
   .glass-panel {
     background: rgba(255, 255, 255, 0.05);
     backdrop-filter: blur(10px);
     border: 1px solid rgba(255, 255, 255, 0.1);
   }
   ```
   **Usage :** PdfUpload, PubMedTrigger, DocumentList

2. **Dark Panel**
   ```tsx
   className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10"
   ```
   **Usage :** ProcedureList, FichePage

3. **White/5 Panel**
   ```tsx
   className="bg-white/5 border border-white/10 rounded-2xl"
   ```
   **Usage :** KnowledgePage stats, IngredientsPage cards

4. **Gradient Panel**
   ```tsx
   className="bg-gradient-to-br from-cyan-900/20 to-purple-900/20"
   ```
   **Usage :** StudioPage, FicheVeriteViewer

5. **Solid Dark** ([KnowledgePage.tsx:165](bigsis-app/src/pages/KnowledgePage.tsx#L165))
   ```tsx
   className="bg-[#0B1221]"
   ```

**Problème :** 5+ variantes sans composant unifié. Devrait avoir 2-3 variantes maximum.

#### B. Modals

**Structure Standard :**
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
  <div className="bg-[#0B1221] border border-white/10 rounded-2xl">
    {/* Contenu */}
  </div>
</div>
```

**Fichiers :**
- [DocumentList.tsx:256-328](bigsis-app/src/components/DocumentList.tsx#L256-L328) (2 modales)
- [IngredientsPage.tsx:127-205](bigsis-app/src/pages/IngredientsPage.tsx#L127-L205)
- [KnowledgePage.tsx:149-170](bigsis-app/src/pages/KnowledgePage.tsx#L149-L170)

**Incohérence :**
- Certaines modales : `bg-gray-900` ([DocumentList](bigsis-app/src/components/DocumentList.tsx))
- Autres : `bg-[#0B1221]` ([KnowledgePage](bigsis-app/src/pages/KnowledgePage.tsx))
- Autres : `bg-[#0f172a]` ([KnowledgePage:151](bigsis-app/src/pages/KnowledgePage.tsx#L151))

**Recommandation :** Créer un composant `<Modal>` réutilisable.

#### C. Badges/Chips

**3 styles différents :**

1. **Status Badges** ([DocumentList.tsx:211-219](bigsis-app/src/components/DocumentList.tsx#L211-L219))
   ```tsx
   className="px-2.5 py-1 rounded-full text-xs font-medium border"
   ```

2. **Match Score Badges** ([ProcedureList.tsx:35-42](bigsis-app/src/components/ProcedureList.tsx#L35-L42))
   ```tsx
   className="px-3 py-1 rounded-full text-xs font-bold border"
   ```

3. **Tag Chips** ([ProcedureList.tsx:57](bigsis-app/src/components/ProcedureList.tsx#L57))
   ```tsx
   className="px-2 py-1 rounded bg-white/5 text-xs border"
   ```

**Incohérence :**
- Padding : `px-2.5` vs `px-3` vs `px-2`
- Border radius : `rounded-full` vs `rounded`
- Font weight : `font-medium` vs `font-bold`

**Recommandation :** Créer un composant `<Badge variant="status|score|tag">`.

---

### 3.6 Recommandations Composants UI

#### 🔴 Critique

1. **Créer des variantes de boutons standardisées**
   ```tsx
   // Button.tsx
   type ButtonVariant = 'primary' | 'secondary' | 'glass' | 'danger';
   type ButtonSize = 'sm' | 'md' | 'lg';
   ```

2. **Unifier les focus rings**
   - Adopter `focus:ring-2 focus:ring-cyan-400/50` partout
   - Mettre à jour tous les inputs

3. **Standardiser la hiérarchie typographique**
   - Documenter les tailles H1-H6
   - Créer des composants `<Heading level={1}>` pour forcer la cohérence

#### 🟠 Haut

1. **Créer un composant Modal réutilisable**
   - Centralise le style (bg-[#0B1221], backdrop, animations)
   - Props : `isOpen`, `onClose`, `title`, `children`

2. **Créer un composant Badge réutilisable**
   - Variants : status, score, tag
   - Props : `variant`, `color`, `children`

3. **Documenter le spacing system**
   - Créer un guide : quand utiliser `gap-4` vs `gap-6`
   - Documenter le rythme vertical

#### 🟡 Moyen

1. **Extraire les card variants en composants**
   - `<GlassPanel>`, `<DarkPanel>`, `<GradientPanel>`

2. **Créer un système de design tokens** pour padding/margin
   ```js
   // spacing.config.js
   export const spacing = {
     compact: 'p-4',
     normal: 'p-6',
     relaxed: 'p-8'
   };
   ```

---

## 4. Redondances et Duplication

### 4.1 Code CSS Dupliqué

#### A. Styles de Loading Spinners

**2 implémentations différentes :**

1. **ScannerPage** ([ligne 131](bigsis-app/src/pages/ScannerPage.tsx#L131))
   ```tsx
   <div className="w-20 h-20 rounded-full border-4 border-cyan-500/30 border-t-cyan-400 animate-spin" />
   ```

2. **FichePage** ([ligne 34](bigsis-app/src/pages/FichePage.tsx#L34))
   ```tsx
   <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
   ```

**Différences :**
- Taille : `w-20 h-20` vs `h-12 w-12`
- Border : `border-4 border-t-cyan-400` vs `border-b-2`
- Couleur : `border-cyan-500/30` vs pas de fond

**Recommandation :** Créer un composant `<Spinner size="sm|md|lg" />`.

#### B. Modal Overlay Pattern

**Répété 5+ fois :**

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
```

**Fichiers :**
- [DocumentList.tsx:256](bigsis-app/src/components/DocumentList.tsx#L256)
- [DocumentList.tsx:299](bigsis-app/src/components/DocumentList.tsx#L299)
- [IngredientsPage.tsx:127](bigsis-app/src/pages/IngredientsPage.tsx#L127)
- [KnowledgePage.tsx:150](bigsis-app/src/pages/KnowledgePage.tsx#L150)

**Recommandation :** Factoriser dans `<ModalOverlay>` component.

#### C. Error Message Pattern

**Répété 3+ fois :**

```tsx
<div className="bg-red-500/10 text-red-400 border border-red-500/20 p-4 rounded-xl">
  {errorMsg}
</div>
```

**Fichiers :**
- [PdfUpload.tsx:130](bigsis-app/src/components/PdfUpload.tsx#L130)
- [PubMedTrigger.tsx:95](bigsis-app/src/components/PubMedTrigger.tsx#L95)
- [SemanticScholarTrigger.tsx:94](bigsis-app/src/components/SemanticScholarTrigger.tsx#L94)

**Recommandation :** Créer `<ErrorMessage message={string} />`.

#### D. Badge Color Logic

**Répété 3+ fois :**

```tsx
const getColor = (level: string) => {
  if (level === 'high') return 'bg-green-500/20 text-green-400';
  if (level === 'medium') return 'bg-yellow-500/20 text-yellow-400';
  return 'bg-red-500/20 text-red-400';
};
```

**Fichiers :**
- [ScannerPage.tsx:47-51](bigsis-app/src/pages/ScannerPage.tsx#L47-L51)
- [ResultPage.tsx:51-55](bigsis-app/src/pages/ResultPage.tsx#L51-L55)
- [ProcedureList.tsx:35-42](bigsis-app/src/components/ProcedureList.tsx#L35-L42) (variant)
- [IngredientsPage.tsx:47-54](bigsis-app/src/pages/IngredientsPage.tsx#L47-L54) (variant)

**Recommandation :** Créer un helper `getStatusColor(level)` dans `utils/colors.ts`.

---

### 4.2 Styles Inline vs Classes

**Problème :** Mélange de styles inline et Tailwind

#### A. Styles Inline (Rares, OK)

- [WizardForm.tsx:44](bigsis-app/src/components/WizardForm.tsx#L44) : `style={{ width: ${(step / 3) * 100}% }}`
- [ResearchAgent/AgentSession.tsx:145](bigsis-app/src/components/ResearchAgent/AgentSession.tsx#L145) : `style={{ animationDelay: ${idx * 150}ms }}`

**Statut :** ✅ Acceptable (valeurs dynamiques)

#### B. Valeurs Arbitraires Tailwind

**Exemples :**
- `bg-[#0B1221]` → [KnowledgePage.tsx:165](bigsis-app/src/pages/KnowledgePage.tsx#L165)
- `bg-[#0f172a]` → [KnowledgePage.tsx:151](bigsis-app/src/pages/KnowledgePage.tsx#L151)
- `bg-gradient-to-br from-[#0D3B4C] to-[#4B1D3F]` → [FichePage.tsx:92](bigsis-app/src/pages/FichePage.tsx#L92)
- `shadow-[0_0_15px_rgba(34,211,238,0.3)]` → [Header.tsx:47](bigsis-app/src/components/Header.tsx#L47)
- `tracking-[0.2em]` → [FichePage.tsx:235](bigsis-app/src/pages/FichePage.tsx#L235)

**Problème :** Couleurs arbitraires au lieu d'utiliser les variables CSS.

**Recommandation :** Ajouter ces couleurs dans tailwind.config.js :

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      'dark-primary': '#0B1221',
      'dark-secondary': '#0f172a',
      'brand-teal': '#0D3B4C',
      'brand-plum': '#4B1D3F',
    }
  }
}
```

---

### 4.3 Composants Similaires avec Implémentations Différentes

#### A. Upload Triggers (3 variantes)

**Composants :**
1. [PdfUpload.tsx](bigsis-app/src/components/PdfUpload.tsx)
2. [PubMedTrigger.tsx](bigsis-app/src/components/PubMedTrigger.tsx)
3. [SemanticScholarTrigger.tsx](bigsis-app/src/components/SemanticScholarTrigger.tsx)

**Similarités :**
- Formulaire avec input
- Bouton de soumission (glass-button)
- Message d'erreur (même style)
- Loading state

**Différences :**
- Couleur d'icône (purple vs blue vs teal)
- Focus ring color (différent pour chaque)
- Légères variations de padding

**Recommandation :** Créer un composant générique `<DataIngestionTrigger type="pdf|pubmed|semantic" />`.

#### B. Search Inputs (3+ implémentations)

**Fichiers :**
- [IngredientsPage.tsx:75-81](bigsis-app/src/pages/IngredientsPage.tsx#L75-L81)
- [DocumentList.tsx:156-162](bigsis-app/src/components/DocumentList.tsx#L156-L162)
- [ResearcherPage.tsx:44-50](bigsis-app/src/pages/ResearcherPage.tsx#L44-L50)

**Structure commune :**
```tsx
<div className="relative">
  <Search className="absolute left-3 top-3 text-gray-400" />
  <input className="pl-10 ..." placeholder="..." />
</div>
```

**Différences :**
- Styles de bordure
- Padding
- Focus states

**Recommandation :** Composant `<SearchInput placeholder onSearch />`.

---

### 4.4 Nomenclature Incohérente

#### A. Composants

**Nommage correct :**
- `Header.tsx`, `PdfUpload.tsx`, `DocumentList.tsx` → PascalCase ✅

**Statut :** Pas de problème.

#### B. Classes CSS

**Glassmorphism :**
- `.glass-panel` ✅
- `.glass-input` ✅
- `.glass-button` ✅

**Statut :** Préfixe cohérent.

#### C. Variables et Props

**TypeScript interfaces :**
- `FicheData`, `Ingredient`, `Procedure` → PascalCase ✅
- `procedure_name`, `match_score` → snake_case (vient de l'API Python) ⚠️

**Recommandation :** Convertir snake_case en camelCase côté frontend pour cohérence TypeScript.

---

### 4.5 Recommandations Redondances

#### 🔴 Critique

1. **Créer des composants réutilisables**
   - `<Spinner size />`
   - `<ModalOverlay />`
   - `<ErrorMessage message />`
   - `<Badge variant color />`

2. **Extraire les fonctions de couleur**
   ```ts
   // utils/colors.ts
   export const getStatusColor = (level: 'low' | 'medium' | 'high') => {
     // ...
   };
   ```

3. **Ajouter couleurs dans tailwind.config.js**
   - Supprimer les valeurs arbitraires `bg-[#...]`
   - Utiliser des noms sémantiques

#### 🟠 Haut

1. **Factoriser les upload triggers**
   - Créer `<DataIngestionTrigger type />`
   - Mutualiser la logique

2. **Créer un composant SearchInput**
   - Icon + input + focus state standardisé

3. **Convertir snake_case API en camelCase**
   ```ts
   // api.ts
   const transformKeys = (obj) => {
     // procedure_name → procedureName
   };
   ```

#### 🟡 Moyen

1. **Documenter les patterns**
   - Créer un Storybook avec exemples
   - Guide de style pour nouveaux composants

2. **Setup ESLint rules**
   - Interdire valeurs arbitraires Tailwind
   - Forcer camelCase pour props

---

## 5. Responsive et Accessibilité

### 5.1 Responsive Design

#### A. Breakpoints Utilisés

**Tailwind breakpoints :** `sm:`, `md:`, `lg:`, `xl:`

**Statistiques :**
- **Total de breakpoints `md:` :** 32 occurrences
- **Breakpoints `lg:` :** 8+ occurrences
- **Breakpoints `sm:` :** 5+ occurrences
- **Breakpoints `xl:` :** 2 occurrences

**Fichiers avec responsive :**
- [HomePage.tsx](bigsis-app/src/pages/HomePage.tsx) : `text-5xl md:text-6xl`, `text-2xl md:text-3xl`
- [KnowledgePage.tsx](bigsis-app/src/pages/KnowledgePage.tsx) : `lg:col-span-8`, `md:grid-cols-3`
- [FichePage.tsx](bigsis-app/src/pages/FichePage.tsx) : `p-8 md:p-10`, `md:flex-row`
- [ResultPage.tsx](bigsis-app/src/pages/ResultPage.tsx) : `md:flex-row`, `lg:col-span-2`

#### B. Patterns Responsive

**Typography scaling :**
```tsx
// HomePage.tsx:41
className="text-5xl md:text-6xl"
```

**Layout changes :**
```tsx
// HomePage.tsx:32
className="flex-col md:flex-row"
```

**Grid columns :**
```tsx
// KnowledgePage.tsx:82
className="grid-cols-1 md:grid-cols-3"
```

**Padding responsive :**
```tsx
// FichePage.tsx:92
className="p-8 md:p-10"
```

#### C. Éléments Non Responsive

**Problèmes détectés :**

1. **Modals** : Pas de breakpoints, largeur fixe
   - [DocumentList.tsx:298](bigsis-app/src/components/DocumentList.tsx#L298) : `max-w-5xl` (pas de mobile variant)
   - Peut déborder sur petits écrans

2. **Tables** ([DocumentList.tsx:176-233](bigsis-app/src/components/DocumentList.tsx#L176-L233))
   - Table structure : pas d'adaptation mobile
   - Risque de scroll horizontal sur mobile

3. **Header** ([Header.tsx](bigsis-app/src/components/Header.tsx))
   - Navigation : 5 liens sans breakpoint
   - Sur mobile, peut être trop serré (devrait être burger menu)

4. **Wizard Form** ([WizardForm.tsx](bigsis-app/src/components/WizardForm.tsx))
   - Progress bar et cards adaptent bien
   - Boutons : pas de changement mobile (OK)

#### D. Images Responsive

**Statistiques :**
- **Total `<img>` tags :** 0 (aucune image détectée)
- **Background images :** Aucune en HTML

**Statut :** Pas d'images donc pas de problème responsive image.

**Note :** Icônes via Lucide React (SVG) → responsive par défaut ✅

---

### 5.2 Accessibilité (Grave)

#### A. ARIA Attributes

**Statistiques :** 0 attributs ARIA dans tout le code

**Problèmes :**

1. **Modals** : Manque `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
   - Lecteurs d'écran ne détectent pas les modales

2. **Buttons** : Aucun `aria-label` sur les boutons icon-only
   - Ex: [Header.tsx:14](bigsis-app/src/components/Header.tsx#L14) : Logo clickable sans label

3. **Navigation** : Manque `aria-current="page"` sur liens actifs
   - [Header.tsx:42-50](bigsis-app/src/components/Header.tsx#L42-L50)

4. **Form inputs** : Pas d'`aria-describedby` pour erreurs
   - Lecteurs d'écran ne lient pas erreurs aux inputs

5. **Loading states** : Pas d'`aria-live` regions
   - Changements dynamiques non annoncés

#### B. Semantic HTML

**Points positifs :**
- Utilisation de `<header>` → [Header.tsx:10](bigsis-app/src/components/Header.tsx#L10) ✅
- Utilisation de `<main>` → [KnowledgePage.tsx:35](bigsis-app/src/pages/KnowledgePage.tsx#L35) ✅
- Utilisation de `<footer>` → [HomePage.tsx:68](bigsis-app/src/pages/HomePage.tsx#L68) ✅
- Balises `<h1>`, `<h2>`, `<h3>` utilisées correctement ✅

**Points négatifs :**
- Pas de `<nav>` autour de la navigation Header
- Boutons DIV : Aucun détecté (tous sont `<button>` ✅)

#### C. Focus Management

**Clavier navigation :**

1. **Inputs** : Focus visible avec ring (✅ mais 3 couleurs différentes)
   - [PubMedTrigger.tsx:63](bigsis-app/src/components/PubMedTrigger.tsx#L63) : `focus:ring-1`

2. **Buttons** : Focus states présents mais pas systématiques
   - [WizardForm.tsx](bigsis-app/src/components/WizardForm.tsx) : Bons focus states
   - [Header.tsx:45](bigsis-app/src/components/Header.tsx#L45) : Focus via hover (⚠️)

3. **Modals** : Pas de focus trap
   - Focus peut sortir de la modale
   - Pas de gestion de retour de focus après fermeture

#### D. Contraste (Déjà documenté dans Section 1.4)

Résumé :
- **8+ violations critiques** de WCAG AA (4.5:1)
- Text-white/30 : Ratio ~1.5:1
- Gray-400 : Ratio ~3.2:1
- Blue-100/80 : Ratio ~3.5:1

#### E. Alt Text sur Images

**Statistiques :** 0 images `<img>` détectées

**Statut :** N/A (pas d'images dans le code HTML)

**Note :** Icônes Lucide ont `aria-hidden="true"` par défaut ✅

#### F. Skip Links

**Problème :** Aucun "skip to content" link

Pour utilisateurs clavier, pas de moyen de sauter la navigation.

**Recommandation :**
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to content
</a>
```

---

### 5.3 Recommandations Responsive & A11y

#### 🔴 Critique (Accessibilité)

1. **Ajouter ARIA attributes aux modals**
   ```tsx
   <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
     <h2 id="modal-title">Titre</h2>
   </div>
   ```

2. **Ajouter aria-current="page" sur navigation active**
   - [Header.tsx:42](bigsis-app/src/components/Header.tsx#L42)

3. **Corriger les contrastes** (voir Section 1.4)

4. **Ajouter aria-label sur boutons icon-only**
   - Logo Header ([ligne 14](bigsis-app/src/components/Header.tsx#L14))

5. **Ajouter aria-live regions pour loading states**
   ```tsx
   <div role="status" aria-live="polite">
     Chargement...
   </div>
   ```

#### 🟠 Haut (Responsive)

1. **Adapter la navigation Header pour mobile**
   - Burger menu en dessous de `md:`
   - Liens horizontaux au-dessus

2. **Rendre les modals responsive**
   - Pleine largeur sur mobile : `max-w-full md:max-w-5xl`
   - Padding réduit : `p-4 md:p-8`

3. **Adapter les tables pour mobile**
   - [DocumentList.tsx](bigsis-app/src/components/DocumentList.tsx)
   - Cards empilées sur mobile au lieu de table

#### 🟡 Moyen

1. **Implémenter focus trap dans modals**
   - Utiliser `react-focus-lock` ou similaire

2. **Ajouter skip links**
   - `<a href="#main-content">Skip to content</a>`

3. **Tester avec lecteur d'écran**
   - NVDA (Windows) ou VoiceOver (Mac)

4. **Ajouter tests automatisés a11y**
   - `jest-axe` ou `pa11y`

---

## 6. Plan d'Action Priorisé

### Phase 1 : Quick Wins (1-2 jours) 🔴

#### Blockers Critiques

1. **Fix route `/procedure/:pmid` cassée**
   - **Fichier :** [ProcedureList.tsx:47](bigsis-app/src/components/ProcedureList.tsx#L47)
   - **Action :** Changer `proc.procedure_name` en `proc.pmid`
   - **Impact :** Déblocage fonctionnel critique
   - **Effort :** 10 min

2. **Ajouter ResearcherPage au Header**
   - **Fichier :** [Header.tsx:29-33](bigsis-app/src/components/Header.tsx#L29-L33)
   - **Action :** Ajouter `<NavLink to="/research" icon={<Search />} label="Research" />`
   - **Impact :** Découvrabilité de la fonctionnalité
   - **Effort :** 5 min

3. **Corriger les contrastes critiques**
   - **Fichiers :** [WizardForm.tsx:114](bigsis-app/src/components/WizardForm.tsx#L114), [Header.tsx:48](bigsis-app/src/components/Header.tsx#L48)
   - **Action :**
     - `text-white/30` → `text-white/70`
     - `text-gray-400` → `text-gray-300`
   - **Impact :** Accessibilité WCAG AA
   - **Effort :** 30 min

4. **Ajouter labels textuels aux verdicts Scanner**
   - **Fichier :** [ScannerPage.tsx:116-121](bigsis-app/src/pages/ScannerPage.tsx#L116-L121)
   - **Action :** Ajouter "Validé", "Attention", "Risque" en plus de la couleur
   - **Impact :** Accessibilité pour daltoniens
   - **Effort :** 15 min

#### ARIA Basics

5. **Ajouter ARIA aux modals**
   - **Fichiers :** [DocumentList.tsx](bigsis-app/src/components/DocumentList.tsx), [IngredientsPage.tsx](bigsis-app/src/pages/IngredientsPage.tsx), [KnowledgePage.tsx](bigsis-app/src/pages/KnowledgePage.tsx)
   - **Action :** `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
   - **Effort :** 1 heure

6. **Ajouter aria-current="page" navigation**
   - **Fichier :** [Header.tsx:42](bigsis-app/src/components/Header.tsx#L42)
   - **Action :** Ajouter dans le composant NavLink
   - **Effort :** 10 min

---

### Phase 2 : Standardisation Couleurs (2-3 jours) 🟠

7. **Définir palette dans tailwind.config.js**
   - **Fichier :** [tailwind.config.js](bigsis-app/tailwind.config.js)
   - **Action :**
     ```js
     colors: {
       'brand-teal': '#0D3B4C',
       'brand-plum': '#4B1D3F',
       'brand-cyan': '#22D3EE',
       'brand-green': '#10B981',
       'brand-coral': '#FB7185',
       'brand-red': '#EF4444',
       'dark-primary': '#0B1221',
       'dark-secondary': '#0f172a',
     }
     ```
   - **Effort :** 30 min

8. **Remplacer toutes les couleurs non-officielles**
   - **Fichiers :** Tous les TSX (40+ occurrences)
   - **Action :**
     - `cyan-400` → `brand-cyan`
     - `purple-500` → `brand-plum`
     - etc.
   - **Effort :** 4-6 heures (recherche/remplacement)

9. **Utiliser CSS custom properties**
   - **Fichiers :** Tous les TSX
   - **Action :** `bg-[var(--accent-cyan)]` au lieu de classes Tailwind
   - **Effort :** 3-4 heures

10. **Standardiser les opacités**
    - **Règle :** Uniquement `/10`, `/20`, `/50`, `/80`
    - **Effort :** 2 heures

---

### Phase 3 : Composants Réutilisables (3-5 jours) 🟠

11. **Créer composant Button**
    ```tsx
    <Button variant="primary|secondary|glass" size="sm|md|lg" />
    ```
    - **Effort :** 2 heures (création + migration)

12. **Créer composant Modal**
    ```tsx
    <Modal isOpen onClose title>
      {children}
    </Modal>
    ```
    - **Effort :** 3 heures

13. **Créer composant Badge**
    ```tsx
    <Badge variant="status|score|tag" color="green|yellow|red" />
    ```
    - **Effort :** 1 heure

14. **Créer composant Spinner**
    ```tsx
    <Spinner size="sm|md|lg" />
    ```
    - **Effort :** 30 min

15. **Créer composant ErrorMessage**
    ```tsx
    <ErrorMessage message={string} />
    ```
    - **Effort :** 30 min

16. **Créer composant SearchInput**
    ```tsx
    <SearchInput placeholder onSearch />
    ```
    - **Effort :** 1 heure

---

### Phase 4 : Typography & Spacing (2-3 jours) 🟡

17. **Standardiser la hiérarchie typographique**
    - **Action :** Documenter H1-H6 dans un guide de style
    - **Règles :**
      - H1 : `text-4xl md:text-5xl font-black`
      - H2 : `text-2xl md:text-3xl font-bold`
      - H3 : `text-xl md:text-2xl font-bold`
      - H4 : `text-lg font-semibold`
    - **Effort :** 4 heures (doc + migration)

18. **Créer composants Heading**
    ```tsx
    <Heading level={1|2|3|4}>Titre</Heading>
    ```
    - **Effort :** 2 heures

19. **Standardiser le spacing system**
    - **Règle :**
      - Petits gaps : `gap-2`, `mb-2`
      - Éléments liés : `gap-4`, `mb-4`
      - Sections : `gap-6`, `mb-8`
      - Grandes sections : `gap-8`, `mb-12`
    - **Effort :** 3 heures

20. **Unifier les paddings cards**
    - Cards standards : `p-6`
    - Grandes modales : `p-8`
    - **Effort :** 2 heures

---

### Phase 5 : Responsive & Focus Management (2-3 jours) 🟡

21. **Adapter Header pour mobile**
    - **Action :** Burger menu en dessous de `md:`
    - **Effort :** 4 heures

22. **Rendre modals responsive**
    - **Action :** `max-w-full md:max-w-5xl`, `p-4 md:p-8`
    - **Effort :** 2 heures

23. **Adapter tables pour mobile**
    - [DocumentList.tsx](bigsis-app/src/components/DocumentList.tsx)
    - **Action :** Cards empilées sur mobile
    - **Effort :** 3 heures

24. **Implémenter focus trap modals**
    - **Library :** `react-focus-lock`
    - **Effort :** 2 heures

25. **Ajouter skip links**
    - **Action :** `<a href="#main-content">Skip to content</a>`
    - **Effort :** 30 min

---

### Phase 6 : Tests & Documentation (2-3 jours) 🟡

26. **Setup tests a11y automatisés**
    - **Tool :** `jest-axe`
    - **Effort :** 4 heures

27. **Créer guide de style / Storybook**
    - **Composants :** Button, Modal, Badge, Heading, etc.
    - **Effort :** 6 heures

28. **Documenter design tokens**
    - Couleurs, spacing, typography
    - **Effort :** 2 heures

29. **Setup ESLint rules**
    - Interdire valeurs arbitraires Tailwind
    - Forcer camelCase
    - **Effort :** 2 heures

---

## Récapitulatif Effort

| Phase | Durée Estimée | Priorité |
|-------|---------------|----------|
| **Phase 1 : Quick Wins** | 1-2 jours | 🔴 Critique |
| **Phase 2 : Couleurs** | 2-3 jours | 🟠 Haut |
| **Phase 3 : Composants** | 3-5 jours | 🟠 Haut |
| **Phase 4 : Typography** | 2-3 jours | 🟡 Moyen |
| **Phase 5 : Responsive** | 2-3 jours | 🟡 Moyen |
| **Phase 6 : Tests** | 2-3 jours | 🟡 Moyen |
| **TOTAL** | **12-19 jours** | - |

---

## Annexe : Métriques du Projet

### Code Statistics

- **Total fichiers frontend :** 25 fichiers TSX/TS
- **Pages :** 8 (HomePage, ResultPage, IngredientsPage, StudioPage, ScannerPage, KnowledgePage, ResearcherPage, FichePage)
- **Composants :** 12+ (Header, WizardForm, ProcedureList, etc.)
- **Routes :** 8 routes
- **Navigation links :** 12+
- **Occurrences color classes :** 443+
- **Breakpoints responsive :** 32 `md:`, 8+ `lg:`
- **ARIA attributes :** 0

### Violations Summary

| Catégorie | Critique | Moyen | Mineur | Total |
|-----------|----------|-------|--------|-------|
| **Couleurs** | 3 | 20+ | 15+ | 38+ |
| **Navigation** | 2 | 2 | 3 | 7 |
| **UI Components** | 5 | 12+ | 8+ | 25+ |
| **Accessibilité** | 8 | 5 | 4 | 17 |
| **Responsive** | 0 | 3 | 2 | 5 |
| **Redondances** | 0 | 8+ | 5+ | 13+ |
| **TOTAL** | **18** | **50+** | **37+** | **105+** |

---

## Conclusion

L'audit révèle un projet avec **une bonne base architecturale** (React, TypeScript, TailwindCSS) mais souffrant de **sérieuses incohérences** accumulées au fil du développement :

### Points Forts
- Structure de pages claire
- Utilisation de React Router
- Composants fonctionnels
- Sécurité des liens externes
- Glassmorphism design cohérent

### Points Faibles Critiques
- **Dérive totale de la palette de couleurs** (10 couleurs définies, 0 utilisées)
- **Route cassée** (`/procedure/:pmid`)
- **Accessibilité insuffisante** (0 ARIA, 8+ violations contraste)
- **40+ couleurs non standardisées**

### Recommandation Globale

**Prioriser la Phase 1 (Quick Wins)** pour corriger les blockers critiques en 1-2 jours, puis **investir 2-3 semaines** pour standardiser progressivement les couleurs, composants, et accessibilité.

Le ROI le plus élevé est obtenu en :
1. Fixant les bugs de navigation (Phase 1)
2. Standardisant la palette (Phase 2)
3. Créant des composants réutilisables (Phase 3)

---

**Document généré le 21 janvier 2026**
**Audit réalisé par Claude Sonnet 4.5**
**Projet BigSIS - Version actuelle du main branch**
