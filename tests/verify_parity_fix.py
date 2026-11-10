import json
import os
import subprocess


def test_repro_fix():
    # Use the Rust binary for verification
    full_cmd = ["/home/toxic/development/github-advanced-search-mcp/target/release/gh-search-mcp"]
    env = os.environ.copy()
    env["GITHUB_TOKEN"] = os.environ["GITHUB_TOKEN"]

    proc = subprocess.Popen(full_cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)

    def exchange(req):
        try:
            payload = json.dumps(req) + "\n"
            proc.stdin.write(payload.encode())
            proc.stdin.flush()
            for _ in range(100):
                line = proc.stdout.readline().decode().strip()
                if not line:
                    continue
                if line.startswith("{"):
                    return json.loads(line)
        except Exception as e:
            print(f"DEBUG: Exchange error: {e}")
        return None

    # 1. Initialize
    init_res = exchange(
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "test-verify", "version": "1.0"},
            },
        }
    )

    if not init_res:
        print("❌ Initialization failed")
        proc.terminate()
        return

    # 2. Send Initialized Notification (Required by MCP Protocol)
    # The 'exchange' function waits for a response, but notifications don't return one.
    # We just write line conformant to JSON-RPC notification.
    notify = {"jsonrpc": "2.0", "method": "notifications/initialized"}
    payload = json.dumps(notify) + "\n"
    proc.stdin.write(payload.encode())
    proc.stdin.flush()

    # Test Query: DayZ killfeed real-time (The Parity Case)
    print("\n🚀 Testing Parity Fix: 'DayZ killfeed real-time'")
    res = exchange(
        {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {
                "name": "github_search",
                "arguments": {
                    "query": "DayZ killfeed real-time",
                    "per_page": 5,
                    "categories": ["code"],
                    "raw": False,
                    "smart": True,
                },
            },
        }
    )

    if res and "result" in res:
        text_content = res["result"]["content"][0]["text"]
        data = json.loads(text_content)

        repos = data.get("repositories", [])
        code = data.get("code", [])
        derived = data.get("derived_repositories", [])

        print(f"Direct Repos: {len(repos)}")
        print(f"Code Results: {len(code)}")
        print(f"Derived Repos: {len(derived)}")

        if len(repos) == 0 and len(code) > 0 and len(derived) > 0:
            print("✅ SUCCESS: Parity Logic Triggered. Repos=0, Code>0, Derived>0.")
            for i, d in enumerate(derived):
                print(f"  [Derived {i}] {d['full_name']} ({d['stars']} stars)")
        else:
            print("❌ FAILURE: Parity Logic not confirmed as expected.")
            print(f"Data: {json.dumps(data, indent=2)}")
    else:
        print(f"❌ Search failed: {res}")
        stderr = proc.stderr.read().decode()
        if stderr:
            print(f"Stderr: {stderr}")

    proc.terminate()


if __name__ == "__main__":
    test_repro_fix()
