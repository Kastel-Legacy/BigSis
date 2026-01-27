import asyncio
import sys
import os

# Add project root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.semantic_scholar import ingest_semantic_results

async def test():
    query = "botulinum toxin efficacy glabellar lines"
    print(f"--- 🧪 Testing Semantic Scholar Ingestion ---")
    print(f"Query: '{query}'")
    
    try:
        count = await ingest_semantic_results(query)
        if count > 0:
            print(f"✅ SUCCESS: Ingested {count} papers.")
        else:
            print(f"⚠️ WARNING: No papers ingested (count=0). Check API response or query.")
            
    except Exception as e:
        print(f"❌ ERROR: Ingestion failed with {e}")

if __name__ == "__main__":
    asyncio.run(test())
