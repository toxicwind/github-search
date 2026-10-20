import json
import os
import subprocess


def call_mcp(method, params):
    proc = subprocess.Popen(
        ["python3", "github-search-fastmcp.py"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=os.environ,
    )

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
    init_notif = {"jsonrpc": "2.0", "method": "notifications/initialized"}
    tool_call = {"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": method, "arguments": params}}

    input_str = json.dumps(init) + "\n" + json.dumps(init_notif) + "\n" + json.dumps(tool_call) + "\n"
    stdout, stderr = proc.communicate(input=input_str.encode())

    try:
        json_responses = []
        for line in stdout.decode().splitlines():
            if line.strip().startswith('{"jsonrpc"'):
                json_responses.append(json.loads(line))
        return json_responses[-1] if json_responses else {"error": "No JSON found"}
    except Exception:
        return {"error": "Failed to parse stdout", "stdout": stdout.decode(), "stderr": stderr.decode()}


if __name__ == "__main__":
    print("Testing God-Eye Search (Code + Metadata)...")
    res = call_mcp("search_github", {"query": "OrganizationSwitcher clerk", "depth": "normal", "limit": 2})
    print(json.dumps(res, indent=2))
