import logging
import json
from datetime import datetime
from typing import Dict, Any, List

from core.rules.engine import RulesEngine
from core.rag.retriever import retrieve_evidence
from core.llm_client import LLMClient
from core.db.database import AsyncSessionLocal
from core.db.models import DecisionTrace

logger = logging.getLogger(__name__)

class Orchestrator:
    def __init__(self):
        self.rules_engine = RulesEngine()
        self.llm_client = LLMClient()

    async def process_request(self, session_id: str, user_input: Dict[str, Any]):
        """
        Main pipeline: Input -> Rules -> RAG -> LLM -> Output
        """
        start_time = datetime.utcnow()
        logger.info(f"Processing request for session {session_id}")

        # 1. Execute Rules
        # Flatten input for simple rules engine (e.g. nested dicts might need flattening)
        rules_context = self._prepare_context(user_input)
        rule_outputs = self.rules_engine.evaluate(rules_context)
        
        triggered_rules_ids = [r.key for r in rule_outputs] # Storing output keys or rule IDs? 
        # Engine returns RuleOutput objects. They have 'key' (conceptual output) but not rule ID directly in output.
        # Ideally we want trace of rule IDs. Let's assume engine logs it or we improve engine later.
        
        # 2. Retrieval (RAG)
        # Construct query from input
        query_text = f"{user_input.get('area', '')} {user_input.get('wrinkle_type', '')} procedures risks"
        evidence_items = await retrieve_evidence(query_text, limit=3)
        
        # 3. Construct "Dossier" for LLM
        dossier = {
            "user_profile": user_input,
            "expert_rules_output": [r.dict() for r in rule_outputs],
            "verified_evidence": evidence_items
        }

        # 4. LLM Narration
        system_prompt = self._build_system_prompt()
        llm_response = await self.llm_client.generate_response(
            system_prompt=system_prompt,
            user_content=json.dumps(dossier, indent=2)
        )

        final_output = llm_response
        # Inject evidence into the response so the UI can show it
        final_output["evidence_used"] = evidence_items

        # 5. Audit Logging
        await self._log_decision(
            session_id=session_id,
            input_data=user_input,
            rules_triggered=triggered_rules_ids, 
            evidence=[e['chunk_id'] for e in evidence_items],
            final_output=final_output
        )

        return final_output

    def _prepare_context(self, input_data: Dict) -> Dict:
        # Simple pass-through for V1
        return input_data

    async def _log_decision(self, session_id, input_data, rules_triggered, evidence, final_output):
        async with AsyncSessionLocal() as session:
            trace = DecisionTrace(
                session_id=session_id,
                input_snapshot=input_data,
                rules_triggered=rules_triggered,
                evidence_used=evidence,
                final_output=final_output
            )
            session.add(trace)
            await session.commit()

    def _build_system_prompt(self) -> str:
        return """
You are Big SIS, a trusted expert in facial aesthetics. 
Your goal is to explain the provided 'Expert Rules' and 'Evidence' to the user in a neutral, pedagogical way.

STRICT GUIDELINES:
1. DO NOT diagnose or prescribe.
2. Use ONLY the provided 'verified_evidence' and 'expert_rules_output'.
3. If the evidence is insufficient, state clearly: "Je ne dispose pas d'assez d'informations vérifiées."
4. Structure your response in JSON:
{
  "summary": "Brief summary...",
  "explanation": "Detailed pedagogical explanation...",
  "options_discussed": ["List of options mentioned in rules..."],
  "risks_and_limits": ["List of specific risks from evidence/rules..."],
  "questions_for_practitioner": ["Q1...", "Q2..."],
  "uncertainty_level": "Low/Medium/High"
}
"""
