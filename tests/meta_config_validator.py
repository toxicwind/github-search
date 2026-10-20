import json
import os
import subprocess
import sys

# The authoritative config path we "ghostbusted" earlier
CONFIG_PATH = "/home/toxic/.gemini/antigravity/mcp_config.json"


def meta_verify():
    print(f"🔍 [Meta-Verify] Reading authoritative config: {CONFIG_PATH}")

    if not os.path.exists(CONFIG_PATH):
        print("❌ Config file not found!")
        return False

    try:
        with open(CONFIG_PATH) as f:
            config = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ Failed to parse JSON: {e}")
        return False

    server_config = config.get("mcpServers", {}).get("github-advanced-search")
    if not server_config:
        print("❌ 'github-advanced-search' entry missing in config.")
        return False

    cmd = server_config.get("command")
    args = server_config.get("args", [])
    env_vars = server_config.get("env", {})

    # Merge env vars with current environment
    full_env = os.environ.copy()
    full_env.update(env_vars)

    full_cmd = [cmd, *args]
    print(f"🚀 [Meta-Verify] Simulating partial Windsurf launch: {' '.join(full_cmd)}")

    try:
        proc = subprocess.Popen(
            full_cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=full_env
        )
        print(f"🆔 [Meta-Verify] Spawned PID: {proc.pid}")

        # Artifact C3: Capture exact kernel cmdline
        try:
            with open(f"/proc/{proc.pid}/cmdline", "rb") as f:
                cmdline_bytes = f.read()
                # split by null bytes
                cmdline_args = cmdline_bytes.split(b"\0")
                clean_args = [arg.decode("utf-8") for arg in cmdline_args if arg]
                print(f"📜 [Meta-Verify] Artifact C3 (Kernel Cmdline): {clean_args}")
        except Exception as e:
            print(f"⚠️ Failed to read /proc cmdline: {e}")

    except Exception as e:
        print(f"❌ Failed to spawn process: {e}")
        return False

    # Perform Handshake
    try:
        print("🤝 [Meta-Verify] Sending 'initialize' JSON-RPC...")
        init_req = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "meta-verifier", "version": "1.0"},
            },
        }
        proc.stdin.write((json.dumps(init_req) + "\n").encode())
        proc.stdin.flush()

        # Read response line by line (skipping logs)
        print("⏳ [Meta-Verify] Waiting for response...")
        for _ in range(20):
            line = proc.stdout.readline().decode().strip()
            if not line:
                continue
            if line.startswith("{"):
                data = json.loads(line)
                if data.get("id") == 1 and "result" in data:
                    print("✅ [Meta-Verify] Handshake SUCCESS!")
                    server_info = data["result"].get("serverInfo", {})
                    print(f"   Server: {server_info.get('name')} v{server_info.get('version')}")

                    # Phase 2: Tool Execution (Proof of Token & Logic)
                    print("🛠️ [Meta-Verify] Executing tool call 'search_github' (Chain of Verification)...")
                    tool_req = {
                        "jsonrpc": "2.0",
                        "id": 2,
                        "method": "tools/call",
                        "params": {"name": "search_github", "arguments": {"query": "latency", "limit": 1}},
                    }
                    proc.stdin.write((json.dumps(tool_req) + "\n").encode())
                    proc.stdin.flush()

                    # Wait for tool result
                    for _ in range(30):
                        line = proc.stdout.readline().decode().strip()
                        if not line:
                            continue
                        if line.startswith("{"):
                            t_data = json.loads(line)
                            if t_data.get("id") == 2:
                                if "result" in t_data:
                                    print("✅ [Meta-Verify] Tool Execution SUCCESS!")
                                    content = t_data["result"].get("content", [{"text": "No content"}])[0].get("text")
                                    print(f"   Result Snippet: {content[:100]}...")
                                    proc.terminate()
                                    return True
                                elif "error" in t_data:
                                    print(f"❌ [Meta-Verify] Tool Execution FAILED: {t_data['error']}")
                                    proc.terminate()
                                    return False

                    print("❌ Tool execution timed out.")
                    proc.terminate()
                    return False

        print("❌ Handshake timed out or failed.")
        print(f"STDERR Snippet: {proc.stderr.readline().decode()}")
        proc.terminate()
        return False

    except Exception as e:
        print(f"❌ Error during handshake: {e}")
        proc.terminate()
        return False


if __name__ == "__main__":
    if meta_verify():
        sys.exit(0)
    else:
        sys.exit(1)
