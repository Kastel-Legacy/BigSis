import os
from typing import List
import openai
from openai import AsyncOpenAI

api_key = os.getenv("OPENAI_API_KEY")
client = None
if api_key:
    try:
        client = AsyncOpenAI(api_key=api_key)
    except:
        pass

async def get_embedding(text: str, model="text-embedding-ada-002") -> List[float]:
    # Mock mode if no client or placeholder key
    if not client or not api_key or api_key.startswith("sk-placeholder"):
        # Return a zero vector of size 1536 (standard for ada-002)
        return [0.0] * 1536

    text = text.replace("\n", " ")
    response = await client.embeddings.create(input=[text], model=model)
    return response.data[0].embedding
