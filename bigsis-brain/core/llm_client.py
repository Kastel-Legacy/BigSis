from openai import AsyncOpenAI
import os
import json
import logging

logger = logging.getLogger(__name__)

class LLMClient:
    def __init__(self, api_key: str = None, model: str = "gpt-4o-mini"): # using mini for cost/speed in V1
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        
        masked_key = (self.api_key[:8] + "...") if self.api_key else "None"
        logger.info(f"LLMClient initialized with key: {masked_key}")

        # Ensure client is created safely even without real key for mock scenarios
        safe_key = self.api_key or "sk-placeholder"
        self.client = AsyncOpenAI(api_key=safe_key)
        self.model = model

    async def generate_response(
        self, 
        system_prompt: str, 
        user_content: str, 
        json_mode: bool = True, 
        language: str = 'fr',
        model_override: str = None,
        temperature_override: float = None
    ) -> any:
        if not self.api_key or self.api_key.startswith("sk-placeholder"):
            logger.warning("Using MOCK LLM response due to missing/placeholder API key.")
            return {"mock": "data", "note": "Please set OPENAI_API_KEY"}

        try:
            target_model = model_override or self.model
            # default temp 0.1 unless overridden
            target_temp = temperature_override if temperature_override is not None else 0.1
            
            kwargs = {
                "model": target_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                "temperature": target_temp,
            }
            
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}

            response = await self.client.chat.completions.create(**kwargs)
            content = response.choices[0].message.content
            
            if json_mode:
                return json.loads(content)
            return content

        except Exception as e:
            logger.error(f"LLM Generation Error: {e}")
            return {"error": "Failed to generate narrative", "details": str(e)}