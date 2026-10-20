import json
import os
import subprocess


def test_full_parity():
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
                "clientInfo": {"name": "test", "version": "1.0"},
            },
        }
    )

    # 2. Test search_github with deep mode (pattern distillation)
    print("🚀 Testing Code Search + Pattern Distillation...")
    res = exchange(
        {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {
                "name": "search_github",
                "arguments": {
                    "query": "extension:py pytest mock patch raise Exception",
                    "depth": "deep",
                    "limit": 1,
                },
            },
        }
    )

    if res and "result" in res:
        data = json.loads(res["result"]["content"][0]["text"])
        item = data.get("results", [{}])[0]
        print(f"✅ Code Result Found: {bool(item.get('path'))}")
        print(f"✅ Snippet Present: {bool(item.get('snippet'))}")
        print(f"✅ Distillation Present: {bool(item.get('pattern_distillation'))}")
    else:
        print(f"❌ Code search failed: {res}")

    # 3. Test search_github for users
    print("\n🚀 Testing User Search...")
    res_users = exchange(
        {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {"name": "search_github", "arguments": {"query": "user:toxicwind", "limit": 1}},
        }
    )
    if res_users and "result" in res_users:
        data = json.loads(res_users["result"]["content"][0]["text"])
        print(f"✅ User Search Found Login: {data.get('results', [{}])[0].get('login') == 'toxicwind'}")
    else:
        print(f"❌ User search failed: {res_users}")

    # 4. Test search_github for commits
    print("\n🚀 Testing Commit Search...")
    res_commits = exchange(
        {
            "jsonrpc": "2.0",
            "id": 4,
            "method": "tools/call",
            "params": {"name": "search_github", "arguments": {"query": "author:toxicwind extension:py", "limit": 1}},
        }
    )
    if res_commits and "result" in res_commits:
        print("✅ Commit Search Succeeded")
    else:
        print("❌ Commit search failed")

    # 5. Test Genesis Fallback
    print("\n🚀 Testing Genesis Fallback (Opportunity Detection)...")
    res_genesis = exchange(
        {
            "jsonrpc": "2.0",
            "id": 5,
            "method": "tools/call",
            "params": {
                "name": "search_github",
                "arguments": {"query": "zxyqwopq_nonsense_12345_missing_project", "limit": 1},
            },
        }
    )
    if res_genesis and "result" in res_genesis:
        data = json.loads(res_genesis["result"]["content"][0]["text"])
        res_list = data.get("results", [])
        is_emergent = any(x.get("type") == "emergent" for x in res_list)
        print(f"✅ Opportunity Detected: {is_emergent}")
        if is_emergent:
            print(f"💎 Genesis Msg: {res_list[0].get('message')}")
    else:
        print(f"❌ Genesis test failed: {res_genesis}")

    proc.terminate()


if __name__ == "__main__":
    test_full_parity()
