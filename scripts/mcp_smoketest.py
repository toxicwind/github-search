#!/usr/bin/env python3
"""MCP Stdio Smoke Test V2 - Using proper byte boundaries."""

import json
import os
import subprocess
import sys
import time

BINARY = sys.argv[1] if len(sys.argv) > 1 else "./target/release/gh-search-mcp"
LOGDIR = "logs/mcp_smoke_py"
os.makedirs(LOGDIR, exist_ok=True)


def main():
    print("=== MCP Smoke Test V2 (Python) ===")
    print(f"Binary: {BINARY}")

    if not os.path.isfile(BINARY):
        print(f"FAIL: Binary not found: {BINARY}")
        return 1

    # Start MCP server
    proc = subprocess.Popen(
        [BINARY],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        bufsize=0,  # Unbuffered
    )

    try:
        # 1. Initialize
        init_req = (
            json.dumps(
                {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "initialize",
                    "params": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {},
                        "clientInfo": {"name": "smoketest-v2", "version": "1.0"},
                    },
                }
            )
            + "\n"
        )
        proc.stdin.write(init_req.encode())
        proc.stdin.flush()

        # Read init response
        resp_line = proc.stdout.readline().decode()
        if not resp_line:
            print("FAIL: No response to initialize")
            return 1
        resp = json.loads(resp_line)
        if "result" in resp and "protocolVersion" in resp["result"]:
            caps = resp["result"].get("capabilities", {})
            print(f"✓ Initialize: OK (version={resp['result']['protocolVersion']}, tools={caps.get('tools')})")
        else:
            print(f"✗ Initialize: FAIL ({resp})")
            return 1

        # 2. Send initialized notification
        init_notify = json.dumps({"jsonrpc": "2.0", "method": "notifications/initialized"}) + "\n"
        proc.stdin.write(init_notify.encode())
        proc.stdin.flush()
        time.sleep(0.5)  # Give it time to process

        # 3. tools/list
        list_req = json.dumps({"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}) + "\n"
        proc.stdin.write(list_req.encode())
        proc.stdin.flush()

        # Read list response with timeout
        import select

        ready, _, _ = select.select([proc.stdout], [], [], 10)
        if ready:
            resp_line = proc.stdout.readline().decode()
            if resp_line:
                resp = json.loads(resp_line)
                if "result" in resp and "tools" in resp["result"]:
                    tools = resp["result"]["tools"]
                    tool_names = [t.get("name", "?") for t in tools]
                    print(f"✓ tools/list: OK ({len(tools)} tools: {tool_names})")
                else:
                    print(f"✗ tools/list: FAIL ({resp})")
                    return 1
            else:
                print("✗ tools/list: FAIL (empty response)")
                return 1
        else:
            print("✗ tools/list: FAIL (timeout)")
            # Dump stderr for debugging
            stderr = proc.stderr.read()
            print(f"stderr: {stderr.decode()}")
            return 1

        # 4. tools/call
        call_req = (
            json.dumps(
                {
                    "jsonrpc": "2.0",
                    "id": 3,
                    "method": "tools/call",
                    "params": {"name": "github_search", "arguments": {"query": "topic:mcp", "per_page": 1}},
                }
            )
            + "\n"
        )
        proc.stdin.write(call_req.encode())
        proc.stdin.flush()

        # Wait for call response (may take longer due to network)
        ready, _, _ = select.select([proc.stdout], [], [], 30)
        if ready:
            resp_line = proc.stdout.readline().decode()
            if resp_line:
                resp = json.loads(resp_line)
                if "result" in resp and "content" in resp["result"]:
                    print(f"✓ tools/call: OK ({len(resp['result']['content'])} content items)")
                else:
                    print(f"✗ tools/call: FAIL ({resp})")
                    return 1
            else:
                print("✗ tools/call: FAIL (empty response)")
                return 1
        else:
            print("✗ tools/call: FAIL (timeout)")
            return 1

        print("\n=== MCP Smoke Test PASSED ===")
        return 0

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()


if __name__ == "__main__":
    sys.exit(main())
