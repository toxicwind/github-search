import requests

URL = "http://localhost:42305/api/search"


def test_query(q, desc):
    print(f"\n{'=' * 80}")
    print(f"Test: {desc}")
    print(f"Query: '{q}'")
    print("=" * 80)
    try:
        resp = requests.get(URL, params={"query": q, "smart": "false", "per_page": 5}, timeout=30)
        if resp.status_code == 200:
            results = resp.json()
            print(f"✓ Found {len(results)} results")
            for r in results[:3]:
                print(f"  - [{r.get('repository')}] {r.get('title')}")
        else:
            print(f"✗ Error: {resp.status_code}")
    except Exception as e:
        print(f"✗ Exception: {e}")


if __name__ == "__main__":
    # Test negation syntax
    test_query("docker setup buildx platform:linux/amd64 -tutorial -medium", "Agent Query #1 (Negations)")

    test_query('Next.js "fetch failed" Docker -medium -tutorial', "Agent Query #2 (Mixed Quotes + Negations)")

    test_query("rust async -tokio -tutorial", "Agent Query #3 (Exclusions)")
