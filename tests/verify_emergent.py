import json
import os
import subprocess


def test_emergent_scoring():
    full_cmd = ["python3", "/home/toxic/development/github-advanced-search-mcp/apps/mcp-server/main.py"]
    env = os.environ.copy()

    proc = subprocess.Popen(full_cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)

    def exchange(req):
        proc.stdin.write((json.dumps(req) + "\n").encode())
        proc.stdin.flush()
        for _ in range(50):
            line = proc.stdout.readline().decode().strip()
            if not line:
                continue
            if line.startswith("{"):
                return json.loads(line)
        return None

    # 1. Initialize
    exchange(
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "test-emergent", "version": "1.0"},
            },
        }
    )

    # 2. Test Normal Search (Heat Score + Sorting)
    print("🚀 Testing Heat Scoring & Sorting (Normal Mode)...")
    res = exchange(
        {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {
                "name": "search_github",
                "arguments": {
                    "query": "nextjs dashboard template",  # Queries likely to have stars/forks
                    "depth": "normal",
                    "limit": 3,
                },
            },
        }
    )

    if res and "result" in res:
        data = json.loads(res["result"]["content"][0]["text"])
        results = data.get("results", [])

        if len(results) >= 2:
            h1 = results[0].get("heat_score", 0)
            h2 = results[1].get("heat_score", 0)
            print(f"✅ Result 1 Heat: {h1}")
            print(f"✅ Result 2 Heat: {h2}")
            if h1 >= h2:
                print("✅ Sorting Verified (Hot > Cold)")
            else:
                print("❌ Sorting Failed (Cold > Hot)")

            print(f"✅ Emergent Flag Present: {'is_emergent' in results[0]}")
        else:
            print("❌ Not enough results to verify sorting.")

    else:
        print(f"❌ Search failed: {res}")

    # 3. Test Deep Search (Velocity)
    print("\n🚀 Testing Velocity (Deep Mode)...")
    res_deep = exchange(
        {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": "search_github",
                "arguments": {
                    "query": "fastmcp",  # Likely to have recent commits
                    "depth": "deep",
                    "limit": 1,
                },
            },
        }
    )

    if res_deep and "result" in res_deep:
        data = json.loads(res_deep["result"]["content"][0]["text"])
        item = data.get("results", [{}])[0]
        velocity = item.get("velocity_14d")
        print(f"✅ Velocity (14d) Retrieved: {velocity}")

        if velocity != "N/A":
            print("✅ Deep Velocity Check: PASS")
        else:
            print("⚠️ Deep Velocity Check: N/A (Might be API limit or no commits)")
    else:
        print(f"❌ Deep search failed: {res_deep}")

    proc.terminate()


if __name__ == "__main__":
    test_emergent_scoring()
