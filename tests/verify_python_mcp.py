import json
import os
import subprocess


def test_tool(method, params=None):
    if params is None:
        params = {}

    proc = subprocess.Popen(
        ["python3", "github-search-fastmcp.py"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=os.environ,
    )

    # Initialize
    init = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "test", "version": "1.0"},
        },
    }
    proc.stdin.write((json.dumps(init) + "\n").encode())
    proc.stdin.flush()
    proc.stdout.readline()  # server response

    # Initialized
    proc.stdin.write(b'{"jsonrpc":"2.0","method":"notifications/initialized"}\n')
    proc.stdin.flush()

    # Call tool
    tool_call = {"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": method, "arguments": params}}
    proc.stdin.write((json.dumps(tool_call) + "\n").encode())
    proc.stdin.flush()

    line = proc.stdout.readline()
    stderr = proc.stderr.read().decode()
    if stderr:
        print(f"DEBUG Stderr: {stderr}")

    if not line:
        return f"Error: No output from server. Stderr: {stderr}"

    resp = json.loads(line)
    proc.terminate()
    return resp


if __name__ == "__main__":
    print("=== Testing Cycle 1: Code Search ===")
    res1 = test_tool("search_code", {"query": 'path:**/config.py "database_url"'})
    print(f"Cycle 1 Result: {res1.get('result', res1.get('error'))}")

    print("\n=== Testing Cycle 2: Repo Search ===")
    res2 = test_tool("search_repositories", {"query": "stars:>1000 topic:mcp sort:updated"})
    print(f"Cycle 2 Result: {res2.get('result', res2.get('error'))}")

    print("\n=== Testing Cycle 3: Issue Search ===")
    res3 = test_tool(
        "search_issues", {"query": 'label:bug state:open comments:>5 created:>2023-01-01 "race condition"'}
    )
    print(f"Cycle 3 Result: {res3.get('result', res3.get('error'))}")
