import asyncio
import sys
import os

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.claims.extractor import ClaimsExtractor

ABSTRACT_MOCK = """
Background: Retinol is the gold standard for anti-aging. However, it causes irritation. Bakuchiol is a plant-based alternative.
Methods: A randomized, double-blind study compared 0.5% bakuchiol and 0.5% retinol in 44 patients for 12 weeks.
Results: Both groups showed significant improvement in wrinkles and pigmentation. There was no statistically significant difference between the two. However, the bakuchiol group reported less scaling and stinging.
Conclusion: Bakuchiol is comparable to retinol in its ability to improve photoaging and is better tolerated.
"""

async def test():
    extractor = ClaimsExtractor()
    print("--- Testing Claims Extractor ---")
    
    # Test 1: Bakuchiol for Wrinkles
    print("\n1. Analyzing Bakuchiol for Wrinkles...")
    claim = await extractor.extract_claim(ABSTRACT_MOCK, "Bakuchiol", "Wrinkles")
    print(f"Result: {claim}")
    
    # Test 2: Retinol for Acne (Not mentioned in abstract)
    print("\n2. Analyzing Retinol for Acne...")
    claim2 = await extractor.extract_claim(ABSTRACT_MOCK, "Retinol", "Acne")
    print(f"Result: {claim2}")

if __name__ == "__main__":
    asyncio.run(test())
