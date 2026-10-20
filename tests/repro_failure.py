import json
import os
import subprocess


def test_repro_failure():
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
                "clientInfo": {"name": "test-repro", "version": "1.0"},
            },
        }
    )

    # Test Query 1: Nitrado Logs (Expected: Code results, Actual: likely HTML junk or zero)
    print("\n🚀 Testing Query 1: 'nitrado webinterface log dayz'")
    res1 = exchange(
        {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {
                "name": "search_github",
                "arguments": {"query": "nitrado webinterface log dayz", "limit": 3, "type": "code"},
            },
        }
    )

    if res1 and "result" in res1:
        data = json.loads(res1["result"]["content"][0]["text"])
        results = data.get("results", [])
        print(f"Result Count: {len(results)}")
        for i, item in enumerate(results):
            print(f"[{i}] Type: {item.get('type')}")
            print(f"    Path: {item.get('path')}")
            print(f"    Repo: {item.get('repo')}")
    else:
        print(f"❌ Search 1 failed: {res1}")

    # Test Query 2: Complex Extension Query (Expected: Python code with 'readability', Actual: Opportunity Detected)
    print("\n🚀 Testing Query 2: 'extension:py \"calculate readability\" ...'")
    res2 = exchange(
        {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": "search_github",
                "arguments": {
                    "query": 'extension:py "calculate readability" OR "code quality score" OR "text match score" stars:>50',
                    "limit": 3,
                    "type": "code",
                },
            },
        }
    )

    if res2 and "result" in res2:
        data = json.loads(res2["result"]["content"][0]["text"])
        results = data.get("results", [])
        if results and results[0].get("type") == "emergent":
            print("❌ FAILURE REPRODUCED: Opportunity Detected (Genesis Mode) returned instead of code.")
        else:
            print(f"Result Count: {len(results)}")
            for i, item in enumerate(results):
                print(f"[{i}] Type: {item.get('type')}")
                print(f"    Path: {item.get('path')}")
                print(f"    Quality Score: {item.get('quality_score')}")
    else:
        print(f"❌ Search 2 failed: {res2}")

    proc.terminate()


if __name__ == "__main__":
    test_repro_failure()
