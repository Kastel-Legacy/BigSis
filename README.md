# Big SIS Monorepo - The Scientific Soul of Aesthetics

Big SIS is a hybrid AI ecosystem designed to centralize and democratize reliable, scientific information about aesthetic procedures and dermatology. Our primary mission is to provide **anti-hallucination** medical advice by strictly separating scientific truth (The Brain) from presentation tones (The Voice).

---

## 🏗️ The Three Pillars

The project is structured as a monorepo containing three specialized modules:

### 🧠 [bigsis-brain](file:///Users/steeveadolphe/Documents/BUSINESS/BigSIS/BigSis-Monorepo/bigsis-brain) - The Knowledge Hub
The central intelligence of the ecosystem. It manages the "Medical Soul" of Big SIS.
- **Core Mission**: Truth-seeking and score calculation.
- **Features**: 
  - **RAG Orchestrator**: Multi-source retrieval (PubMed, Scientific PDFs, Internal Knowledge).
  - **Layered Prompting**: Separates medical rules from platform-specific instructions.
  - **Data Integrity**: Strict Pydantic schemas ensuring LLM outputs match medical standards.
  - **Vector Database**: High-performance semantic search using `pgvector`.

### 📱 [bigsis-app](file:///Users/steeveadolphe/Documents/BUSINESS/BigSIS/BigSis-Monorepo/bigsis-app) - The User Portal
The consumer-facing web and mobile interface.
- **Core Mission**: Providing an expert, pedagogical user experience.
- **Features**:
  - **Diagnostic Wizard**: Intelligent questionnaire leading to clinical-grade fiches.
  - **Ingredients Scanner**: Real-time analysis of cosmetic INCI lists via PubMed data.
  - **Knowledge Library**: UI to manage and consult the ingested scientific base.
  - **Studio**: Dynamic workspace for advanced medical inquiries.

### 📸 [bigsis-social](file:///Users/steeveadolphe/Documents/BUSINESS/BigSIS/BigSis-Monorepo/bigsis-social) - The Social Voice
A specialized client for high-impact content generation.
- **Core Mission**: Translating complex science into catchy, direct social media content.
- **Features**:
  - **Insta-Generator**: Direct API consumption of the Brain to create "Fiches Vérité".
  - **Tone Management**: Specific prompt layers to ensure a bold, direct, yet scientific voice for platforms like Instagram.

---

## 🔬 Architecture: "Medical Soul" vs. "Platform Voice"

Big SIS implements a unique layered architecture to ensure reliability:
1. **Medical Soul**: Fixed rules defined in `bigsis-brain` that apply to ALL generations. This includes scoring logic, risk assessment, and citation requirements.
2. **Platform Voice**: Dynamic layers that adjust the tone based on the consumer:
   - **App Voice**: Pedagogical, reassuring, expert.
   - **Social Voice**: Viral, direct, catchy.
   - **Diagnostic Voice**: Empathic, clinical.

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- OpenAI API Key (or use Mock Mode)

### Quick Launch
```bash
./launch.sh
```
This script initializes the environment, starts the PostgreSQL/pgvector database, and launches both the Brain (API) and the App (Frontend).

### Console Access
- **Frontend (App)**: [http://localhost:5173](http://localhost:5173)
- **API Documentation (Brain)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Social Generation**: Accessible via the Brain API endpoints.

---

*Powered by Advanced Agentic Coding - Antigravity (Google DeepMind).*
