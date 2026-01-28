
import asyncio
from core.trends.google_trends import get_interest_score

def test_trends():
    print("Testing Google Trends Integration...")
    
    # Test 1: Known popular term
    keyword = "Botox"
    print(f"\n--- Testing '{keyword}' ---")
    result = get_interest_score(keyword)
    print(f"Score: {result.get('score')}")
    print(f"Justification: {result.get('justification')}")
    print(f"Meta: {result.get('meta')}")
    
    # Test 2: Obscure term
    keyword = "Xyliprozine Fake Molecule"
    print(f"\n--- Testing '{keyword}' ---")
    result = get_interest_score(keyword)
    print(f"Score: {result.get('score')}")
    print(f"Justification: {result.get('justification')}")

if __name__ == "__main__":
    test_trends()
