from openai import AsyncOpenAI
import os
import json
import logging

logger = logging.getLogger(__name__)

class LLMClient:
    def __init__(self, api_key: str = None, model: str = "gpt-4o-mini"): # using mini for cost/speed in V1
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.client = AsyncOpenAI(api_key=self.api_key)
        self.model = model

    async def generate_response(self, system_prompt: str, user_content: str, json_mode: bool = True) -> dict:
            if not self.api_key or self.api_key.startswith("sk-placeholder"):
                logger.warning("Using MOCK LLM response due to missing/placeholder API key.")
                mock_response = {
                    "summary": "This is a MOCK response because no valid OpenAI API key was found.",
                    "explanation": "To get real AI analysis, please provide a valid OPENAI_API_KEY in the .env file.",
                    "options_discussed": ["Consultation Dermatologue", "Injections (Mock)"],
                    "risks_and_limits": ["Rougeurs temporaires", "Eviter aspirine"],
                    "questions_for_practitioner": ["Quelles sont les alternatives ?", "Combien de temps durent les effets ?"],
                    "uncertainty_level": "High (Mock)"
                }
                return mock_response

            response = await self.client.chat.completions.create(**kwargs)
            content = response.choices[0].message.content
            
            if json_mode:
                return json.loads(content)
            return {"content": content}

        except Exception as e:
            logger.error(f"LLM Generation Error: {e}")
            return {"error": "Failed to generate narrative", "details": str(e)}