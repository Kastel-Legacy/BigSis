from openai import AsyncOpenAI
import os
import json
import asyncio
import logging

logger = logging.getLogger(__name__)

MOCK_RESPONSE = {
    "summary": "Mode demonstration - connectez une cle API OpenAI pour des resultats reels.",
    "explanation": "BigSIS utilise l'intelligence artificielle pour analyser les options esthetiques. Cette reponse est un exemple statique car aucune cle API valide n'est configuree.",
    "options_discussed": ["Toxine botulique (Botox)", "Acide hyaluronique", "Skinboosters"],
    "risks_and_limits": ["Cette analyse est generee sans IA - les resultats reels seront personnalises."],
    "questions_for_practitioner": ["Quelle est la meilleure option pour mon type de peau ?", "Quels sont les effets secondaires attendus ?"],
    "uncertainty_level": "high"
}

MAX_RETRIES = 3
RETRY_DELAYS = [1, 2, 4]


class LLMClient:
    def __init__(self, api_key: str = None, model: str = "gpt-4o-mini"):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self._is_mock = not self.api_key or self.api_key.startswith("sk-placeholder") or self.api_key == ""

        masked_key = (self.api_key[:8] + "...") if self.api_key else "None"
        logger.info(f"LLMClient initialized (key: {masked_key}, mock: {self._is_mock})")

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
        if self._is_mock:
            logger.warning("MOCK LLM: returning static response (no valid API key)")
            return MOCK_RESPONSE.copy()

        target_model = model_override or self.model
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

        last_error = None
        for attempt in range(MAX_RETRIES):
            try:
                response = await self.client.chat.completions.create(**kwargs)
                content = response.choices[0].message.content

                if json_mode:
                    return json.loads(content)
                return content

            except Exception as e:
                last_error = e
                if attempt < MAX_RETRIES - 1:
                    delay = RETRY_DELAYS[attempt]
                    logger.warning(f"LLM attempt {attempt+1}/{MAX_RETRIES} failed ({e}), retrying in {delay}s...")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"LLM failed after {MAX_RETRIES} attempts: {e}")

        return {"error": "Service temporairement indisponible", "details": str(last_error)}

    async def stream_response(
        self,
        system_prompt: str,
        user_content: str,
        model_override: str = None,
        temperature_override: float = None
    ):
        """Yield tokens one by one for SSE streaming."""
        if self._is_mock:
            mock_text = "Je suis BigSis en mode demo. Connectez une cle API OpenAI pour des reponses reelles. Dis-moi ce qui t'amene !"
            for word in mock_text.split():
                yield word + " "
            return

        target_model = model_override or self.model
        target_temp = temperature_override if temperature_override is not None else 0.4

        try:
            stream = await self.client.chat.completions.create(
                model=target_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                temperature=target_temp,
                stream=True
            )

            async for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    yield delta.content

        except Exception as e:
            logger.error(f"Stream LLM failed: {e}")
            yield "Desole, une erreur est survenue. Reessaie dans quelques instants."
