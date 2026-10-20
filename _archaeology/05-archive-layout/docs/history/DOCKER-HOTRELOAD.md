# Docker Hot-Reload Development Setup

## Quick Start

### Development Mode (Hot-Reload)
```bash
# Start with autonomous rebuilding
./watch-dev.sh

# Or manually
docker compose up --watch
```

### Production Mode
```bash
BUILD_TARGET=production docker compose up
```

## What's New (2025 Modern Stack)

✅ **Single Entrypoint** - `docker compose up --watch`  
✅ **Autonomous Rebuilding** - File changes trigger auto-rebuild  
✅ **Multi-Stage Builds** - Separate dev/prod environments  
✅ **Modular .dockerignore** - Organized by category  
✅ **30s Timeout** - Prevents hanging MCP calls  

## Architecture

```
Development:  cargo-watch → auto-rebuild → hot-reload
Production:   optimized binary → minimal image
```

## Environment Variables

```bash
GITHUB_TOKEN=your_token_here
RUST_LOG=info
BUILD_TARGET=development  # or 'production'
MCP_PORT=8877
```

## File Changes & Hot-Reload

| Change Type | Action | Speed |
|------------|--------|-------|
| Rust source (`crates/**/*.rs`) | Sync + rebuild | ~5-10s |
| Dependencies (`Cargo.toml`) | Full rebuild | ~30s |
| Config files | Sync only | <1s |

## MCP Configuration

Update your `mcp_config.json`:

```json
{
  "mcpServers": {
    "github-advanced-search": {
      "command": "docker",
      "args": ["compose", "exec", "mcp-server", "gh-search-mcp"],
      "env": {}
    }
  }
}
```

## Troubleshooting

**Search hangs?** - 30s timeout will return error  
**Build slow?** - Use `docker compose build --no-cache`  
**Hot-reload not working?** - Check `docker compose logs -f`

## Development Workflow

1. Edit code in `crates/`
2. Save file
3. Watch auto-rebuild in terminal
4. Test immediately - no manual steps!

---

**Old way**: `cargo build --release` (manual, slow)  
**New way**: Save file → auto-rebuild (autonomous, fast)
