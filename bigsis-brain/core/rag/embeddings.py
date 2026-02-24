import os
import asyncio
import logging
from typing import List
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

api_key = os.getenv("OPENAI_API_KEY")
_is_mock = not api_key or api_key.startswith("sk-placeholder") or api_key == ""

client = None
if not _is_mock:
    try:
        client = AsyncOpenAI(api_key=api_key)
        logger.info(f"Embeddings client initialized (key: {api_key[:8]}...)")
    except Exception as e:
        logger.error(f"Failed to init embeddings client: {e}")
        _is_mock = True
else:
    logger.warning("EMBEDDINGS MOCK MODE: No valid API key. Vectors will be zeros.")


async def get_embedding(text: str, model="text-embedding-ada-002") -> List[float]:
    """Get embedding vector for text. Retries once on transient errors."""
    if _is_mock or not client:
        logger.warning("MOCK EMBEDDING: returning zero vector")
        return [0.0] * 1536

    text = text.replace("\n", " ").strip()
    if not text:
        return [0.0] * 1536

    for attempt in range(2):
        try:
            response = await client.embeddings.create(input=[text], model=model)
            return response.data[0].embedding
        except Exception as e:
            if attempt == 0:
                logger.warning(f"Embedding attempt 1 failed ({e}), retrying in 1s...")
                await asyncio.sleep(1)
            else:
                logger.error(f"Embedding failed after 2 attempts: {e}")
                return [0.0] * 1536

    return [0.0] * 1536
