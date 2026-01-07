from typing import List, Dict, Optional
import json
from core.llm_client import LLMClient

class ClaimsExtractor:
    """
    Extracts structured scientific claims (EvidenceClaim) from raw text/abstracts using LLM.
    """
    
    SYSTEM_PROMPT = """
    You are an expert Dermatologist Researcher. Your task is to extract SCIENTIFIC CLAIMS from a PubMed abstract.
    
    Target: {ingredient_name}
    Indication Context: {indication} (if specified)
    
    Return a JSON object with this key:
    "claim": {{
        "outcome": "positive" | "negative" | "inconclusive",
        "confidence": "High" (RCT/Meta-analysis) | "Medium" (Open Label) | "Low",
        "summary": "1 sentence summarizing the specific finding about the target.",
        "study_type": "RCT" | "Meta-Analysis" | "Review" | "In-Vitro" | "Other"
    }}
    
    If the text does NOT provide evidence for {ingredient_name}, return null.
    """

    def __init__(self):
        self.llm = LLMClient()

    async def extract_claim(self, abstract: str, ingredient_name: str, indication: str = "skin benefit") -> Optional[Dict]:
        """
        Analyzes one abstract. Returns structured claim data or None.
        """
        prompt = f"Abstract:\n{abstract}\n\nAnalyze scientific evidence for: {ingredient_name}."
        
        # Inject dynamic context into system prompt
        sys_prompt = self.SYSTEM_PROMPT.format(
            ingredient_name=ingredient_name,
            indication=indication
        )
        
        try:
            # Call LLM
            response_data = await self.llm.generate_response(
                system_prompt=sys_prompt,
                user_content=prompt,
                model_override="gpt-4o",
                temperature_override=0,
                json_mode=True
            )
            
            # Since generate_response handles JSON parsing if json_mode=True
            if isinstance(response_data, dict):
                 return response_data.get("claim")
            
            return None
            
        except Exception as e:
            print(f"❌ Claim Extraction Failed: {e}")
            return None
