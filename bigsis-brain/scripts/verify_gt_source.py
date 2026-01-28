import asyncio
import sys
import os

# Add project root to path
sys.path.append(os.getcwd())

from core.trends.scout import mine_rising_trends

async def main():
    print("--- Mining Google Trends Directly ---")
    try:
        # mine_rising_trends is synchronous, but in the app it's run in threadpool.
        # Here we just run it directly.
        results = mine_rising_trends()
        
        print(f"\nFound {len(results)} total rising queries.")
        print("Top 10 Raw Results:")
        for r in results[:10]:
            print(f"- {r['query']} (Topic: {r['topic']}, Growth: {r['growth']})")
            
        # Also print a sample of 5 random ones to show diversity if many results
        import random
        if len(results) > 10:
            print("\nRandom Sample of 5 others:")
            for r in random.sample(results[10:], 5):
                print(f"- {r['query']} (Topic: {r['topic']}, Growth: {r['growth']})")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
