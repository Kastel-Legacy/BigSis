import asyncio
import sys
import os
from unittest.mock import MagicMock, AsyncMock

# Setup path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock Database & OpenAI to run without Docker/API Keys
sys.modules["core.db.database"] = MagicMock()
sys.modules["core.db.database"].AsyncSessionLocal = MagicMock()
sys.modules["openai"] = MagicMock()

# Now import core modules
from core.orchestrator import Orchestrator

async def run_verification():
    print("--- Starting Verification ---")
    
    # 1. Init Orchestrator
    orchestrator = Orchestrator()
    
    # 2. Mock RAG retrieval
    # We mock retrieve_evidence function if it's imported in orchestrator
    # Since it is imported, we need to patch it in the 'core.orchestrator' namespace or where it's used.
    # But since we imported Orchestrator above, we might need to mock it differently.
    # For simplicity, we'll rely on the fact that without DB it might fail unless we mock the calls inside methods.
    
    # Let's mock the internal components of the instance
    orchestrator.retrieve_evidence = AsyncMock(return_value=[
        {"chunk_id": 1, "text": "Botox helps dynamic wrinkles.", "source": "Doc A", "url": "http://test"}
    ])
    
    orchestrator.llm_client.generate_response = AsyncMock(return_value={
        "summary": "Mocked Summary",
        "explanation": "Mocked Explanation",
        "options_discussed": ["Option A"],
        "risks_and_limits": ["Risk B"],
        "questions_for_practitioner": ["Question C"],
        "uncertainty_level": "Low"
    })
    
    orchestrator._log_decision = AsyncMock()
    
    # 3. Define Test Input (Forehead + Dynamic)
    user_input = {
        "area": "front",
        "wrinkle_type": "expression",
        "pregnancy": False
    }
    session_id = "test-session-123"
    
    print(f"Input: {user_input}")
    
    # 4. Run Pipeline
    # Note: RulesEngine is real, so it should trigger R_FRONT_DYN_01
    # We need to ensure logic flow calls our mocks.
    # Since retrieve_evidence is imported as a function in orchestrator.py, mocking instance.retrieve_evidence won't work
    # unless we patch the module.
    
    from core import orchestrator as orchestrator_module
    orchestrator_module.retrieve_evidence = AsyncMock(return_value=[
        {"chunk_id": 1, "text": "Evidence Text", "source": "Doc A"}
    ])
    
    try:
        result = await orchestrator.process_request(session_id, user_input)
        print("\n--- Result ---")
        print(result)
        print("\n[SUCCESS] Orchestrator ran successfully.")
    except Exception as e:
        print(f"\n[FAILURE] Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_verification())
