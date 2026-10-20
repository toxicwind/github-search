import requests

URL = "http://localhost:42305/api/search"


def test_query(q):
    print(f"Testing query: '{q}'")
    try:
        resp = requests.get(URL, params={"query": q, "smart": "false"}, timeout=30)
        if resp.status_code == 200:
            results = resp.json()
            print(f"Found {len(results)} results.")
            for r in results[:3]:
                print(f" - [{r.get('repository')}] {r.get('title')} (Score: {r.get('score'):.2f})")
                if "snippet" in r:
                    print(f"   Snippet: {r['snippet'][:100]}...")
        else:
            print(f"Error: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"Exception: {e}")


if __name__ == "__main__":
    test_query("DayZ ADM log parser python regex")
