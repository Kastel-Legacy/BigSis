# Big SIS Brain 🧠 - The Intelligence Layer

The `bigsis-brain` is the core backend engine of the Big SIS ecosystem. It is a high-performance FastAPI application that acts as the guardian of medical truth.

## 🎯 Primary Objectives
1.  **Strict Compliance**: Ensure every AI response follows the "Medical Soul" rules (Never hallucinate, always cite, score accurately).
2.  **RAG Orchestration**: Manage complex retrieval from multiple sources (PubMed, PDF, internal database).
3.  **Data Harmonization**: Expose a unified API for generating structured medical "Fiches" that can be consumed by both the app and social media tools.

## 🛠 Features

### 🏛 Layered Prompt Architecture
Prompts are no longer monolithic. They are composed dynamically:
- `medical_rules.py`: Shared constraints (The "Medical Soul").
- `app_fiches.py`: Instructions for the pedagogical app voice.
- `social_content.py`: Instructions for the catchy social voice.
- `diagnostics.py`: Expert deduction logic.
- `recommendations.py`: Procedure matching algorithms.

### 📚 RAG & PubMed Intelligence
- **Automated Scout**: Searches PubMed on-the-fly if knowledge is low.
- **Deep ingestion**: Chunks PDFs and studies into a `pgvector` store.
- **Source tracking**: Every claim is linked back to a PMID or source document.

### ✅ Data Integrity
- **Strict Typing**: All LLM outputs are validated against the `FicheMaster` Pydantic schema before being returned or cached.
- **Internal Verification**: Automatic detection of inconsistent scores or missing citations.

## 🧱 Local Development

### Requirements
- Python 3.11+
- PostgreSQL with `pgvector`

### Setup
```bash
cd bigsis-brain
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### API Endpoints
- `/api/v1/analyze`: Root diagnostic logic.
- `/api/v1/social/generate`: Unified generator for fiches/recoms/diag.
- `/api/v1/fiches/{id}`: Retrieval of generated medical fiches.
- `/api/v1/knowledge/*`: CRUD operations for documents and procedures.

## 📂 Core Structure
- `api/`: FastAPI routes and Pydantic schemas.
- `core/prompts/`: Modular prompt library.
- `core/social/`: Generation orchestrators.
- `core/rag/`: Retrieval and embedding logic.
- `core/db/`: SQLAlchemy models and migration scripts.
