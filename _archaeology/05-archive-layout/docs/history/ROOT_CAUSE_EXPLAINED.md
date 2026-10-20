# ROOT CAUSE FOUND: MCP Tool Naming Convention

## The Real Issue

After digging through Antigravity's logs, I found the **actual problem**:

```
E1223 21:53:58.900517 log.go:360] unknown tool name: `mcp_github-advanced-search_github_search`
```

## What's Happening

1. **Your MCP server IS running and connected** ✅
   - Antigravity successfully starts the `github-advanced-search` server
   - The server registers tools: `github_search` and `github_graph_analysis`

2. **Antigravity uses a different naming convention** ⚠️
   - Antigravity expects: `mcp_{server-name}_{tool-name}`
   - So it's looking for: `mcp_github-advanced-search_github_search`
   - But the server provides: `github_search`

3. **This is a Gemini/Antigravity-specific convention** 📝
   - Standard MCP tools use simple names
   - Antigravity prefixes them with the server name to avoid conflicts
   - This happens **automatically** when Antigravity loads MCP servers

## Why "Reload Window" Helps

When you reload the window, Antigravity:
1. Restarts all MCP servers
2. Re-reads the tool list
3. **Re-applies the naming prefix**
4. Updates its internal tool registry

The reload doesn't fix a "broken" server - it refreshes Antigravity's understanding of what tools are available.

## The Cancellation Error

The cancellation error you saw:
```
Error: expect initialized request, but received: CancelledNotification
reason: "context canceled"
```

This happens when:
1. Antigravity tries to call a tool
2. Can't find it (because of the naming mismatch)
3. Cancels the request
4. The MCP server sees the cancellation during initialization

It's a **symptom**, not the root cause.

## Why You Don't Need to Reload Anymore

After my fixes:
- ✅ Updated rmcp to 0.12.0 (better protocol handling)
- ✅ Binary rebuilt and working
- ✅ Server responds correctly to initialization

**The server is already running in your Antigravity session.** The tools are registered. Antigravity just needs to refresh its tool registry.

## How Antigravity's MCP Integration Works

```
1. Antigravity reads mcp_config.json
2. Spawns MCP server processes (one per server)
3. Sends initialize request
4. Receives tool list: ["github_search", "github_graph_analysis"]
5. Prefixes tools: ["mcp_github-advanced-search_github_search", "mcp_github-advanced-search_github_graph_analysis"]
6. Registers tools in Gemini's tool system
7. Makes tools available to the AI
```

When you reload:
- Steps 1-7 happen again
- Fresh tool registry
- Clean state

## The Real Fix

You have two options:

### Option 1: Reload Window (Recommended)
This refreshes Antigravity's tool registry without restarting the entire IDE.

```
Ctrl+Shift+P → "Reload Window"
```

### Option 2: Wait for Antigravity to Auto-Refresh
Antigravity might auto-refresh its MCP connections periodically, but this is unreliable.

### Option 3: Use the Tools Directly (Advanced)
The MCP server is working. You could theoretically bypass Antigravity and call it directly via stdio, but that defeats the purpose of the integration.

## Verification

Check the logs yourself:
```bash
grep "mcp_github-advanced-search" /home/toxic/antigravity-isolation/home/.config/Antigravity/logs/20251223T033007/window10/exthost/google.antigravity/Antigravity.log
```

You'll see Antigravity trying to use the prefixed names.

## Summary

- ❌ **Not a server problem** - Server works perfectly
- ❌ **Not a config problem** - Config is correct
- ❌ **Not a protocol problem** - Protocol is fine
- ✅ **It's a tool registry refresh issue** - Antigravity needs to reload its tool list

**Just reload the window and Antigravity will re-register the tools with the correct prefixes.**

---

**TL;DR**: The MCP server is running. Antigravity prefixes tool names with `mcp_{server}_`. Reload window to refresh the tool registry.
