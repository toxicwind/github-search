set shell := ["bash", "-c"]

ROOT := justfile_directory()

default:
    @just --list

setup:
    @bun install

install-complete:
    @bash scripts/install-complete.sh

install-tools:
    @echo "bun is the only required runtime for the active stack"

# Firefox live control (the feature added during "install that github completely")
firefox-profile:
    @bash scripts/estate-scripts-browser/launch-firefox-from-profile.sh

firefox-dev:
    @GHAS_BROWSER=firefox just dev:headed

ghas-mcp:
    @bun run dev:mcp

api:
    @cd {{ROOT}} && bun run dev:api

mcp:
    @cd {{ROOT}} && bun run dev:mcp

frontend:
    @cd {{ROOT}} && bun run dev:frontend

dev:
    @cd {{ROOT}} && bun run dev:stack

test:
    @cd {{ROOT}} && bun run test:stack

clean:
    @rm -rf {{ROOT}}/apps/frontend/.next-clean {{ROOT}}/node_modules {{ROOT}}/bun.lock
