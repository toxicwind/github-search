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

    # FastMCP might expect these sequentially. We'll send them and then close stdin to get communicate to return.
    input_str = json.dumps(init) + "\n" + json.dumps(init_notif) + "\n" + json.dumps(tool_call) + "\n"
    stdout, stderr = proc.communicate(input=input_str.encode())

    return stdout.decode(), stderr.decode()


if __name__ == "__main__":
    out, err = call_mcp("search_repositories", {"query": "mcp-server stars:>100"})
    print("STDOUT:", out)
    print("STDERR:", err)
