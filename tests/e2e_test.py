import json
import os
import subprocess
import sys


def run_e2e():
    print("Starting E2E Test for GitHub Search MCP...")

    # Check for GITHUB_TOKEN
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        print("ERROR: GITHUB_TOKEN environment variable is not set.")
        sys.exit(1)

    # Use the current path to the server script
    server_path = "apps/mcp-server/main.py"
    if not os.path.exists(server_path):
        # Try local path if called from within tests/
        server_path = "../apps/mcp-server/main.py"
        if not os.path.exists(server_path):
            print(f"ERROR: Cannot find server script at {server_path}")
            sys.exit(1)

    # Launch the server
    proc = subprocess.Popen(
        ["python3", server_path], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=os.environ
    )

    try:
        # Helper to read JSON-RPC lines
        def read_json_rpc(proc, target_id=None):
            for _ in range(20):  # Try up to 20 lines
                line = proc.stdout.readline().decode().strip()
                if not line:
                    continue
                if line.startswith("{"):
                    try:
                        data = json.loads(line)
                        if target_id is None or data.get("id") == target_id:
                            return data
                    except Exception:
                        continue
            return None

        # 1. Initialize
        print("Phase 1: Initializing...")
        init_req = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "e2e-test", "version": "1.0"},
            },
        }
        proc.stdin.write((json.dumps(init_req) + "\n").encode())
        proc.stdin.flush()

        init_res = read_json_rpc(proc, 1)
        if not init_res or "result" not in init_res:
            print(f"FAILED: Initialization failed. Last response object: {init_res}")
            return False

        # 2. Call search_github
        print("Phase 2: Calling search_github...")
        search_req = {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {"name": "search_github", "arguments": {"query": "nextjs clerk multi-tenant", "limit": 1}},
        }
        proc.stdin.write((json.dumps(search_req) + "\n").encode())
        proc.stdin.flush()

        search_res = read_json_rpc(proc, 2)
        if search_res and "result" in search_res:
            content = search_res["result"]["content"][0]["text"]
            data = json.loads(content)
            if "results" in data and len(data["results"]) > 0:
                print("SUCCESS: search_github returned results.")
                print(f"Found: {data['results'][0].get('repo', 'N/A')}")
                return True
            else:
                print("FAILED: No results returned in JSON.")
                print(f"Response: {content}")
        else:
            print(f"FAILED: Tool call failed. Response: {search_res}")

    except Exception as e:
        print(f"ERROR during execution: {e}")
    finally:
        proc.terminate()

    return False


if __name__ == "__main__":
    success = run_e2e()
    if not success:
        sys.exit(1)
