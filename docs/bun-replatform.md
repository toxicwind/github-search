# Bun-First Runtime

This repository now treats Bun as the active runtime contract.

## Topology

- `apps/frontend`: Next.js presentation layer
- `apps/api`: Bun control plane and public API
- `apps/mcp`: Bun MCP service with HTTP bridge and stdio support
- `packages/*`: shared contracts, GitHub client, search logic

## Active ports

- Frontend: `35160`
- API: `35161`
- MCP: `35162`

## Legacy Rust

Rust remains in `legacy/rust/*` as migration reference only. It is not part of the default dev loop, stack startup, or local hot-reload path.
