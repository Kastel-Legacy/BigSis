import asyncio
import sys
import os

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.pubmed import ingest_pubmed_results

QUERIES = [
    "botulinum toxin facial wrinkles systematic review",
    "hyaluronic acid soft tissue fillers aging face",
    "topical retinol photoaging clinical trial",
    "laser resurfacing facial rejuvenation efficacy",
    "radiofrequency skin tightening facial wrinkles"
]

async def seed():
    print("🌱 Starting PubMed Seeding for MVP...")
    total_docs = 0
    for q in QUERIES:
        print(f"\n--- Processing Query: '{q}' ---")
        try:
            count = await ingest_pubmed_results(q)
            total_docs += count
        except Exception as e:
            print(f"❌ Error for query '{q}': {e}")
            
    print(f"\n✅ Seeding Complete! Total Documents Ingested: {total_docs}")

if __name__ == "__main__":
    asyncio.run(seed())
