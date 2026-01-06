from openai import OpenAI
from src.config import settings
import json

class LLMClient:
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def generate_json(self, system_prompt: str, user_content: str) -> dict:
        try:
            response = self.client.chat.completions.create(
                model=settings.MODEL_NAME,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                # CORRECTION ICI : On passe de 1500 à 4000 (ou plus)
                # Cela laisse assez de place pour lister 10+ études sans couper.
                max_tokens=4000 
            )
            content = response.choices[0].message.content
            return json.loads(content)
        except json.JSONDecodeError:
            print("❌ Erreur : Le JSON généré est incomplet (coupé). Augmentez encore max_tokens.")
            return {}
        except Exception as e:
            print(f"❌ Erreur LLM : {e}")
            return {}