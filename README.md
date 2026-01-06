# Big SIS - Trusted Aesthetic Assistant (V1)

## 📌 Mission
Big SIS is a platform dedicated to centralizing **reliable, neutral, and scientific information** about aesthetic procedures (starting with facial aesthetics). Unlike traditional AI chatbots, Big SIS is designed to be **anti-hallucination** by using a hybrid architecture that combines strict rules with verified evidence.

## 🚀 Key Features (V1)
- **Guided Wizard**: A step-by-step questionnaire to understand specific user concerns (e.g., "Forehead Wrinkles" -> "Dynamic lines").
- **Reliable Analysis**: A standardized "Dossier" output that covers:
  - **Summary**: Concise advice.
  - **Explanation**: Scientific background.
  - **Options**: Comparison of treatments (Botox, Hyaluronic Acid, etc.).
  - **Risks**: Clear safety information and contraindications (e.g., Pregnancy).
  - **Evidence**: Citations from verified medical sources.
- **Knowledge Base Ingestion**: 
  - **PDF Reader**: Upload scientific papers/documents via UI.
  - **PubMed Integration**: Automated retrieval of verified medical studies (Abstracts + Metadata).
- **Mock Mode**: A simulation mode that allows testing the full flow without improved cost (OpenAI credits) or live backend availability.

## 🏗️ Architecture
Big SIS uses a **Hybrid AI** approach:
1.  **Rules Engine (Deterministic)**: Checks for "Red Flags" (e.g., Pregnancy) and hard constraints.
2.  **RAG (Retrieval-Augmented Generation)**: Searches a vector database (`pgvector`) for trusted PDF/Text chunks.
3.  **Orchestrator**: The "Brain" that gathers inputs, rules, and evidence.
4.  **LLM (Narrator)**: Acts only as a formatter/writer, using *only* the provided evidence to generate the final response.

## 🛠️ Tech Stack
- **Frontend**: Next.js (React), Typescript, Vite, Tailwind.
- **Backend**: Python, FastAPI.
- **Database**: PostgreSQL + pgvector (for AI search).
- **AI**: OpenAI (GPT-4o-mini), OpenAI Embeddings (text-embedding-ada-002).
- **Infrastructure**: Docker & Docker Compose.

## 🏁 How to Run

### Prerequisites
- Docker Desktop installed and running.

### Quick Start
1.  **Launch the App**:
    ```bash
    ./launch.sh
    ```
    This script handles building containers and setting up the environment.

2.  **Access**:
    - **Frontend**: [http://localhost:5173](http://localhost:5173) (or 3000 if configured)
    - **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
    - **PDF Reader**: [http://localhost:5173/pdf](http://localhost:5173/pdf)

3.  **Mock Mode**:
    By default, if no `OPENAI_API_KEY` is provided in `bigsis-backend/.env`, the system runs in **Mock Mode**, returning safe, pre-defined headers to verify the UI flow.

## 📂 Project Structure
- `bigsis-web/`: Frontend application.
- `bigsis-backend/`: API, Orchestrator, Rules Engine.
- `launch.sh`: Helper script for Docker startup.
- `docker-compose.yml`: Infrastructure definition.

---
*Created by Antigravity (Google DeepMind) for Big SIS V3.*
