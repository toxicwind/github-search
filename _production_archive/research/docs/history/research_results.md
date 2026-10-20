# GitHub Search Results

## 1. Code Snippet: richfrem/Project_Sanctuary :: mcp_servers/council/README.md
- **URL**: https://github.com/richfrem/Project_Sanctuary/blob/99db89a74a311747fbb8e3eb6d902bfd95053f6a/mcp_servers/council/README.md
- **Readability**: 1.5/4.0
- **Description**: README.md

### Content Snippet
```
# Council MCP Server

**Status:** ✅ Operational
**Version:** 2.0.0 (Refactored)
**Protocol:** Model Context Protocol (MCP)

**Description:** The Council MCP Server exposes the Sanctuary Council's **multi-agent deliberation** capabilities to external AI agents via the Model Context Protocol. It coordinates specialized agents (Coordinator, Strategist, Auditor) to solve complex tasks through iterative reasoning and context retrieval.

## Tools

...[elided]...
# Optional
COUNCIL_DEFAULT_ROUNDS=3
```

### MCP Config
Add this to your `mcp_config.json`:

```json
"council": {
  "command": "uv",
  "args": [
    "--directory",
    "mcp_servers/council",
    "run",
    "server.py"
...[elided]...
```

---

**Summary**: Found 1 results across 1 categories.
# GitHub Search Results

## 1. Issue/PR: #362: Cannot get MCP init on Google's Antigravity
- **URL**: https://github.com/laravel/boost/issues/362
- **Readability**: 0.0/4.0
- **Description**: closed by rolandorojas

### Content Snippet
```
### Laravel Package Version

1.8.1

### Laravel Version

12.39.0

### PHP Version

8.4.11

### System Info

Windows 11 (x64) with Laragon

### Description

I've been trying to set up Boost in Google's
```

---
## 2. Code Snippet: VulnZap/vulnzap-main :: src/utils/mcpConfig.ts
- **URL**: https://github.com/VulnZap/vulnzap-main/blob/f8c4332cc9086ce79c2eed0a6e9cf258155cb0d9/src/utils/mcpConfig.ts
- **Readability**: 3.5/4.0
- **Description**: mcpConfig.ts

### Content Snippet
```
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * MCP Configuration Handler for VulnZap
 * Supports VS Code, Cursor, Windsurf, Antigravity, and Claude
 * 
 * Schema differences:
 * - VS Code: uses "servers" key with "type": "stdio"
...[elided]...
    const config: MCPServerConfig = {
        command: 'npx',
        args: ['vulnzap', 'mcp']
    };

    // VS Code requires type field
    if (ide === 'vscode') {
        config.type = 'stdio';
    }

    return config;
}

/**
 * Get the appropriate JSON schema key for an IDE
...[elided]...
```

---
## 3. Code Snippet: oraios/serena :: docs/02-usage/030_clients.md
- **URL**: https://github.com/oraios/serena/blob/7908319e40bdb2e2b5c23d28bee557a6099d095b/docs/02-usage/030_clients.md
- **Readability**: 1.5/4.0
- **Description**: 030_clients.md

### Content Snippet
```
# Connecting Your MCP Client

In the following, we provide general instructions on how to connect Serena to your MCP-enabled client,
as well as specific instructions for popular clients.

:::{note}
The configurations we provide for particular clients below will run the latest version of Serena
using the `stdio` protocol with `uvx`.  
Adapt the commands to your preferred way of [running Serena](020_running), adding any additional
command-line arguments as needed.
...[elided]...
    with Claude Code's built-in capabilities).
  * We specify the current directory as the project directory with `--project "$(pwd)"`, such 
    that Serena is configured to work on the current project from the get-go, following 
    Claude Code's mode of operation.

Alternatively, use `--project-from-cwd` for user-level configuration that works across all projects:

```shell
claude mcp add --scope user serena -- <serena> start-mcp-server --context=claude-code --project-from-cwd
```

This searches up from the current directory for `.serena/project.yml` or `.git` markers,
falling back to the current directory if neither is found. This makes it suitable for a
single global MCP configuration. The `--project-from-cwd` option is intended for CLI-based agents
(like Claude Code, Gemina or Codex) that invoke Serena from within project directories.
...[elided]...
```

---
## 4. Code Snippet: neovateai/neovate-code :: CHANGELOG.md
- **URL**: https://github.com/neovateai/neovate-code/blob/c8e1d38ed7d8840d1fc7ee0b873d5aaf323ee0cb/CHANGELOG.md
- **Readability**: 3.3/4.0
- **Description**: CHANGELOG.md

### Content Snippet
```
## 0.22.0

`2025-12-19`

- fix: add missing -g flag in config set httpProxy example by [@unknown_](https://github.com/unknown_) in [#541](https://github.com/umijs/takumi/pull/541)
- feat: add gemini 3 flash preview model support by @chencheng (云谦) in [#543](https://github.com/umijs/takumi/pull/543)
- feat: add skill source tracking and support claude directories by [@sorrycc](https://github.com/sorrycc)
- feat: add skill tool implementation with skill manager by @chencheng (云谦) in [#540](https://github.com/umijs/takumi/pull/540)


...[elided]...
- fix: update copilot documentation url in model configuration by [@sorrycc](https://github.com/sorrycc)
- fix(mcp): fix redundant console output for stdio-type MCP by [@QuietlyChan](https://github.com/QuietlyChan) in [#463](https://github.com/umijs/takumi/pull/463)
- feat: add visionModel support for multimodal tasks by [@Yuwang Liu](https://github.com/Yuwang Liu) in [#467](https://github.com/umijs/takumi/pull/467)
- refactor: unify list navigation logic using useListNavigation hook by [@Yuwang Liu](https://github.com/Yuwang Liu) in [#456](https://github.com/umijs/takumi/pull/456)
- fix: add reasoning content conversion for assistant messages in compact normalization by [@阿平](https://github.com/阿平) in [#468](https://github.com/umijs/takumi/pull/468)
- feat: add antigravity provider and improve github provider by [@sorrycc](https://github.com/sorrycc)
- fix: simplify summary message generation and assignment by [@阿平](https://github.com/阿平) in [#459](https://github.com/umijs/takumi/pull/459)
- feat(browser): add model selection dropdown to chat sender footer [AI] by [@Kying-star](https://github.com/Kying-star) in [#369](https://github.com/umijs/takumi/pull/369)
- feat: add poe provider with claude gemini gpt grok models support, Close #455 by [@sorrycc](https://github.com/sorrycc)
- feat: add reverse history search (Ctrl+R) functionality by [@Yuwang Liu](https://github.com/Yuwang Liu) in [#451](https://github.com/umijs/takumi/pull/451)


## 0.18.1

`2025-11-25`
...[elided]...
```

---
## 5. Code Snippet: dlants/magenta.nvim :: README.md
- **URL**: https://github.com/dlants/magenta.nvim/blob/30e319e1edcc27c51484cc82b97e602c51ff5e3c/README.md
- **Readability**: 3.3/4.0
- **Description**: README.md

### Content Snippet
```
# magenta.nvim

```
  ___ ___
/' __` __`\
/\ \/\ \/\ \
\ \_\ \_\ \_\
 \/_/\/_/\/_/
 magenta is for agentic flow
```
...[elided]...

Regex patterns should be carefully designed to avoid security risks. You can find the default allowlist patterns in [lua/magenta/options.lua](lua/magenta/options.lua).

**⚠️ Security Warning: Prompt Injection & Data Exfiltration**

Be extremely careful when configuring the command allowlist. Malicious actors can use [prompt injection attacks](https://www.promptarmor.com/resources/google-antigravity-exfiltrates-data) to manipulate the LLM into executing commands that exfiltrate sensitive data from your system.

**Key risks:**

- **Credential theft**: Commands that can read files (like `cat`, `grep`, `head`, `tail`) can be exploited to steal API keys, passwords, and tokens from files like `.env`, `~/.ssh/`, `~/.aws/credentials`, etc.
- **Data exfiltration**: Even seemingly safe commands can be chained or misused to leak sensitive information through command output that the agent can see
- **Prompt injection**: Untrusted content (from files, web search results, or user input) could contain hidden instructions that trick the agent into running malicious commands

**Best practices:**

...[elided]...
```

---
## 6. Code Snippet: twardoch/synchromcp :: PLAN.md
- **URL**: https://github.com/twardoch/synchromcp/blob/db7ac63e051a6ee948697648aa1ad24369012687/PLAN.md
- **Readability**: 0.0/4.0
- **Description**: PLAN.md

### Content Snippet
```
# synchromcp - MCP Settings Synchronization Tool

## Scope

A Python CLI tool that synchronizes MCP (Model Context Protocol) server configurations between different AI apps and across machines.

---

## 1. MCP Config File Locations

...[elided]...
| Jan | `~/jan/mcp_config.json` |
| Factory | `~/.factory/mcp.json` |
| Void Editor | `~/.void-editor/mcp.json` |
| llxprt | `~/.llxprt/settings.json` |
| Qwen | `~/.qwen/settings.json` |
| Antigravity/Gemini | `~/.gemini/antigravity/mcp_config.json` |
| VSCode Kilo Code | `~/Library/Application Support/Code/User/globalStorage/kilocode.kilo-code/settings/mcp_settings.json` |
| VSCode Roo Code | `~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json` |
| VSCode Insiders Kilo | `~/Library/Application Support/Code - Insiders/User/globalStorage/kilocode.kilo-code/settings/mcp_settings.json` |
| VSCode Insiders Roo | `~/Library/Application Support/Code - Insiders/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json` |
| Cursor Kilo Code | `~/Library/Application Support/Cursor/User/globalStorage/kilocode.kilo-code/settings/mcp_settings.json` |
| Cursor Roo Code | `~/Library/Application Support/Cursor/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json` |
| Antigravity Kilo | `~/Library/Application Support/Antigravity/User/globalStorage/kilocode.kilo-code/settings/mcp_settings.json` |
| Antigravity Roo | `~/Library/Application Support/Antigravity/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json` |

...[elided]...
```

---

**Summary**: Found 6 results across 2 categories.
# GitHub Search Results

## 1. Issue/PR: #105: Validate toolchain via Docker-based CMake build workflow [WIP - Awaiting Diagnostic Data]
- **URL**: https://github.com/grahame-student/gnu-tools-for-stm32/pull/105
- **Readability**: 0.0/4.0
- **Description**: open by Copilot

### Content Snippet
```
## Validate Generated Toolchain Using Generic CMake Project Build Workflow

⚠️ **Work in Progress - Awaiting Diagnostic Data**

Automates toolchain validation by building a CMake test project in Docke
```

---
## 2. Issue/PR: #7: Comprehensive system architecture analysis for SaaS dashboard and AI ads platform
- **URL**: https://github.com/milosriki/video-edit/pull/7
- **Readability**: 0.0/4.0
- **Description**: open by Copilot

### Content Snippet
```
Request to analyze all configurations, orchestration patterns, and intelligence systems for SaaS dashboard and personal "best ads maker" use cases.

## Analysis Summary

### Multi-Runtime Backend Arch
```

---
## 3. Issue/PR: #7: from-builder
- **URL**: https://github.com/julianobarbosa/holmesgpt/pull/7
- **Readability**: 0.0/4.0
- **Description**: open by julianobarbosa

### Content Snippet
```
<!-- This is an auto-generated comment: release notes by coderabbit.ai -->
## Summary by CodeRabbit

* **New Features**
  * Interactive CLI mode, MCP server support, custom runbook catalogs, many ne
```

---
## 4. Issue/PR: #10903: Ai sdk 5 migration
- **URL**: https://github.com/posit-dev/positron/pull/10903
- **Readability**: 0.0/4.0
- **Description**: open by timtmok

### Content Snippet
```
Address #10818 

This used Vercel's MCP server to assist in the migration to v5.

* Removed the workaround for the temperature
* Updated the field names that changed
* Fixed the responses to mat
```

---
## 5. Code Snippet: HermeticOrmus/tesseract-knowledge-system :: docs-cache/mcp-servers-2025-10-12.md
- **URL**: https://github.com/HermeticOrmus/tesseract-knowledge-system/blob/6932ed69d00323f8b2f22cdabf242c9d8fdc8199/docs-cache/mcp-servers-2025-10-12.md
- **Readability**: 3.8/4.0
- **Description**: mcp-servers-2025-10-12.md

### Content Snippet
```
# Awesome MCP Servers [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

[![ไทย](https://img.shields.io/badge/Thai-Click-blue)](README-th.md)
[![English](https://img.shields.io/badge/English-Click-yellow)](README.md)
[![繁體中文](https://img.shields.io/badge/繁體中文-點擊查看-orange)](README-zh_TW.md)
[![简体中文](https://img.shields.io/badge/简体中文-点击查看-orange)](README-zh.md)
[![日本語](https://img.shields.io/badge/日本語-クリック-青)](README-ja.md)
[![한국어](https://img.shields.io/badge/한국어-클릭-yellow)](README-ko.md)
[![Português Brasileiro](https://img.shields.io/badge/Português_Brasileiro-Clique-green)](README-pt_BR.md)
[![Discord](https://img.shields.io/discord/1312302100125843476?logo=discord&label=discord)](https://glama.ai/mcp/discord)
# Awesome MCP Servers [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

[![ไทย](https://img.shields.io/badge/Thai-Click-blue)](README-th.md)
[![English](https://img.shields.io/badge/English-Click-yellow)](README.md)
[![繁體中文](https://img.shields.io/badge/繁體中文-點擊查看-orange)](README-zh_TW.md)
[![简体中文](https://img.shields.io/badge/简体中文-点击查看-orange)](README-zh.md)
[![日本語](https://img.shields.io/badge/日本語-クリック-青)](README-ja.md)
[![한국어](https://img.shields.io/badge/한국어-클릭-yellow)](README-ko.md)
[![Português Brasileiro](https://img.shields.io/badge/Português_Brasileiro-Clique-green)](README-pt_BR.md)
[![Discord](https://img.shields.io/discord/1312302100125843476?logo=discord&label=discord)](https://glama.ai/mcp/discord)
...[elided]...
```

---
## 6. Issue/PR: #8306: Add board Luckfox Nova W
- **URL**: https://github.com/armbian/build/pull/8306
- **Readability**: 0.0/4.0
- **Description**: open by nikvoid

### Content Snippet
```
# Description
Add initial support for board Luckfox Nova W.
Luckfox Nova W is recently produced board on SoC Rockchip RK3308B: 4 x Cortex-A35 CPU, 512 RAM, 8 GB eMMC.
It also has Ethernet, WIFI & B
```

---
## 7. Code Snippet: OpenAiTx/OpenAiTx :: projects/punkpeye/awesome-mcp-servers/README.md
- **URL**: https://github.com/OpenAiTx/OpenAiTx/blob/5f8085e3cbe2ccb5448866beb75d0e8f97c70dd4/projects/punkpeye/awesome-mcp-servers/README.md
- **Readability**: 1.3/4.0
- **Description**: README.md

### Content Snippet
```
# Awesome MCP Servers [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

[![ไทย](https://img.shields.io/badge/Thai-Click-blue)](README-th.md)
[![English](https://img.shields.io/badge/English-Click-yellow)](README.md)
[![繁體中文](https://img.shields.io/badge/繁體中文-點擊查看-orange)](README-zh_TW.md)
[![简体中文](https://img.shields.io/badge/简体中文-点击查看-orange)](README-zh.md)
[![日本語](https://img.shields.io/badge/日本語-クリック-青)](README-ja.md)
[![한국어](https://img.shields.io/badge/한국어-클릭-yellow)](README-ko.md)
[![Português Brasileiro](https://img.shields.io/badge/Português_Brasileiro-Clique-green)](README-pt_BR.md)
[![Discord](https://img.shields.io/discord/1312302100125843476?logo=discord&label=discord)](https://glama.ai/mcp/discord)
# Awesome MCP Servers [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

[![ไทย](https://img.shields.io/badge/Thai-Click-blue)](README-th.md)
[![English](https://img.shields.io/badge/English-Click-yellow)](README.md)
[![繁體中文](https://img.shields.io/badge/繁體中文-點擊查看-orange)](README-zh_TW.md)
[![简体中文](https://img.shields.io/badge/简体中文-点击查看-orange)](README-zh.md)
[![日本語](https://img.shields.io/badge/日本語-クリック-青)](README-ja.md)
[![한국어](https://img.shields.io/badge/한국어-클릭-yellow)](README-ko.md)
[![Português Brasileiro](https://img.shields.io/badge/Português_Brasileiro-Clique-green)](README-pt_BR.md)
[![Discord](https://img.shields.io/discord/1312302100125843476?logo=discord&label=discord)](https://glama.ai/mcp/discord)
...[elided]...
```

---
## 8. Code Snippet: kaustavdassoa/Book-Notes :: GenAILearning/MCP-ServerLists.md
- **URL**: https://github.com/kaustavdassoa/Book-Notes/blob/c48e8e090eb7fffc6c1c90d925ea70c2f9d953c9/GenAILearning/MCP-ServerLists.md
- **Readability**: 3.3/4.0
- **Description**: MCP-ServerLists.md

### Content Snippet
```
# Awesome MCP Servers [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

[![ไทย](https://img.shields.io/badge/Thai-Click-blue)](README-th.md)
[![English](https://img.shields.io/badge/English-Click-yellow)](README.md)
[![繁體中文](https://img.shields.io/badge/繁體中文-點擊查看-orange)](README-zh_TW.md)
[![简体中文](https://img.shields.io/badge/简体中文-点击查看-orange)](README-zh.md)
[![日本語](https://img.shields.io/badge/日本語-クリック-青)](README-ja.md)
[![한국어](https://img.shields.io/badge/한국어-클릭-yellow)](README-ko.md)
[![Português Brasileiro](https://img.shields.io/badge/Português_Brasileiro-Clique-green)](README-pt_BR.md)
[![Discord](https://img.shields.io/discord/1312302100125843476?logo=discord&label=discord)](https://glama.ai/mcp/discord)
...[elided]...
- [kimtaeyoon83/mcp-server-youtube-transcript](https://github.com/kimtaeyoon83/mcp-server-youtube-transcript) 📇 ☁️ - Fetch YouTube subtitles and transcripts for AI analysis
- [kimtth/mcp-aoai-web-browsing](https://github.com/kimtth/mcp-aoai-web-browsing) 🐍 🏠 - A `minimal` server/client MCP implementation using Azure OpenAI and Playwright.
- [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) - Official Microsoft Playwright MCP server, enabling LLMs to interact with web pages through structured accessibility snapshots
- [modelcontextprotocol/server-puppeteer](https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer) 📇 🏠 - Browser automation for web scraping and interaction
- [ndthanhdev/mcp-browser-kit](https://github.com/ndthanhdev/mcp-browser-kit) 📇 🏠 - An MCP Server for interacting with manifest v2 compatible browsers.
- [operative_sh/web-eval-agent](https://github.com/Operative-Sh/web-eval-agent) 🐍 🏠 🍎 - An MCP Server that autonomously debugs web applications with browser-use browser agents
- [agent-infra/mcp-server-browser](https://github.com/bytedance/UI-TARS-desktop/tree/main/packages/agent-infra/mcp-servers/browser) 📇 🏠 - Browser automation capabilities using Puppeteer, both support local and remote browser connection.
- [ndthanhdev/mcp-browser-kit](https://github.com/ndthanhdev/mcp-browser-kit) 📇 🏠 - An MCP Server that enables AI assistants to interact with your local browsers.
- [pskill9/web-search](https://github.com/pskill9/web-search) 📇 🏠 - An MCP server that enables free web searching using Google search results, with no API keys required.
- [recursechat/mcp-server-apple-shortcuts](https://github.com/recursechat/mcp-server-apple-shortcuts) 📇 🏠 🍎 - An MCP Server Integration with Apple Shortcuts
- [lightpanda-io/gomcp](https://github.com/lightpanda-io/gomcp) 🏎 🏠/☁️ 🐧/🍎 - An MCP server in Go for Lightpanda, the ultra fast headless browser designed for web automation

### ☁️ <a name="cloud-platforms"></a>Cloud Platforms

Cloud platform service integration. Enables management and interaction with cloud infrastructure and services.
...[elided]...
```

---
## 9. Code Snippet: RMerl/asuswrt-merlin.ng :: release/src/router/nettle/NEWS
- **URL**: https://github.com/RMerl/asuswrt-merlin.ng/blob/4090acdc79f6bbece1daa91d347287a3c96af31a/release/src/router/nettle/NEWS
- **Readability**: 1.0/4.0
- **Description**: NEWS

### Content Snippet
```
NEWS for the Nettle 3.8.1 release

	This is a bugfix release, fixing a few portability issues
	reported for Nettle-3.8.

	Bug fixes:

	* Avoid non-posix m4 argument references in the chacha
	  implementation for arm64, powerpc64 and s390x. Reported by
	  Christian Weisgerber, fix contributed by Mamone Tarsha.
...[elided]...
	Optimizations:

	* Implemented runtime detection of cpu features for OpenBSD on
	  arm64. Contributed by Christian Weisgerber.

	The new version is intended to be fully source and binary
	compatible with Nettle-3.6. The shared library names are
	libnettle.so.8.6 and libhogweed.so.6.6, with sonames
	libnettle.so.8 and libhogweed.so.6.

NEWS for the Nettle 3.8 release

	This release includes a couple of new features, and many
	performance improvements. It adds assembly code for two more
	architectures: ARM64 and S390x.
...[elided]...
```

---
## 10. Code Snippet: mindspore-ai/mindspore :: RELEASE.md
- **URL**: https://github.com/mindspore-ai/mindspore/blob/bd3c5dd1236bb5f2199b7f5ac2f2e6452879128f/RELEASE.md
- **Readability**: 0.0/4.0
- **Description**: RELEASE.md

### Content Snippet
```
# MindSpore Release Notes

[查看中文](./RELEASE_CN.md)

## MindSpore 2.3.0 Release Notes

### Major Features and Improvements

#### AutoParallel


## MindSpore 2.3.0 Release Notes

### Major Features and Improvements

#### AutoParallel

- [STABLE] Extend functional parallelism. [mindspore.shard](https://www.mindspore.cn/docs/en/r2.3.0/api_python/mindspore/mindspore.shard.html) supports now the Graph mode. In Graph mode, the parallel sharding strategy of input and weight can be set for nn.Cell/function. For other operators, the parallel strategy can be automatically configured through "sharding_propagation". Add [mindspore.reshard](https://www.mindspore.cn/docs/en/r2.3.0/api_python/mindspore/mindspore.reshard.html) interface that supports manual rearranging and set up a precise sharding strategy ([mindspore.Layout](https://www.mindspore.cn/docs/en/r2.3.0/api_python/mindspore/mindspore.Layout.html)) for tensors.
- [STABLE] Added Callback interface [mindspore.train.FlopsUtilizationCollector](https://www.mindspore.cn/docs/en/r2.3.0/api_python/train/mindspore.train.FlopsUtilizationCollector.html) statistical model flops utilization information MFU and hardware flops utilization information HFU.
- [STABLE] Add functional communication API [mindspore.communication.comm_func](https://www.mindspore.cn/docs/en/r2.3.0/api_python/mindspore.communication.comm_func.html).
- [BETA] Optimize the memory usage of interleaved pipeline in O0 and O1 mode.
- [BETA] AutoParallel supports automatic pipeline strategy generation in multi-nodes scenarios (not supported in single-node scenario). Need to set `parallel_mode` to ``auto_parallel`` and `search_mode` to ``recursive_programming``.

#### PyNative

...[elided]...
```

---

**Summary**: Found 10 results across 2 categories.
# GitHub Search Results

## 1. Issue/PR: #9: Create Complete Antigravity Integration Specification Document
- **URL**: https://github.com/OmarA1-Bakri/sales-automation-mcp/pull/9
- **Readability**: 0.0/4.0
- **Description**: open by Copilot

### Content Snippet
```
Create comprehensive integration specification document (`docs/ANTIGRAVITY_INTEGRATION_SPEC.md`) for integrating Antigravity Orchestrator Agent + Enterprise Security into the RTGS Sales Automation pla
```

---
## 2. Issue/PR: #7: Comprehensive system architecture analysis for SaaS dashboard and AI ads platform
- **URL**: https://github.com/milosriki/video-edit/pull/7
- **Readability**: 0.0/4.0
- **Description**: open by Copilot

### Content Snippet
```
Request to analyze all configurations, orchestration patterns, and intelligence systems for SaaS dashboard and personal "best ads maker" use cases.

## Analysis Summary

### Multi-Runtime Backend Arch
```

---
## 3. Issue/PR: #1: Add Hugging Face Spaces deployment support
- **URL**: https://github.com/Sakuralaaa/Antigravity2api/pull/1
- **Readability**: 0.0/4.0
- **Description**: open by Copilot

### Content Snippet
```
Adds complete Docker-based deployment configuration for Hugging Face Spaces with automated deployment tooling.

## Changes

### Docker Configuration
- **Dockerfile**: Multi-stage Node.js 18 build with
```

---
## 4. Issue/PR: #10: feat: Antigravity Enterprise Orchestrator v2.4.0
- **URL**: https://github.com/OmarA1-Bakri/sales-automation-mcp/pull/10
- **Readability**: 0.0/4.0
- **Description**: open by OmarA1-Bakri

### Content Snippet
```
## Summary

Major release introducing the Antigravity Enterprise Orchestrator - a comprehensive multi-agent AI platform with enterprise features.

### New Features
- **Swarm AI Orchestration** - Multi
```

---
## 5. Code Snippet: repr0bated/op-dbus-v2 :: ANTIGRAVITY-CONFIG-VERIFIED.md
- **URL**: https://github.com/repr0bated/op-dbus-v2/blob/4ced42a0f8f13563466c311986d2a1c642f3077a/ANTIGRAVITY-CONFIG-VERIFIED.md
- **Readability**: 2.5/4.0
- **Description**: ANTIGRAVITY-CONFIG-VERIFIED.md

### Content Snippet
```
# ✅ Antigravity MCP Configuration - VERIFIED WORKING

## Configuration Status: READY ✅

The MCP server has been fixed and configured for Antigravity IDE.

---

## 📍 Configuration File

...[elided]...
---

## 🎯 What Was Fixed

### The Problem
Gemini introduced a bug in `/home/jeremy/op-dbus-v2/crates/op-mcp/src/bin/mcp-http-server.rs` (lines 46-49) that was treating `MCP_CONFIG_FILE` as a command-line argument instead of an environment variable.

### The Solution
Removed the buggy lines because:
1. The environment variable is already exported by the shell script
2. The http_server.rs already inherits all environment variables
3. No special handling needed - environment flows naturally through the process tree

---

...[elided]...
```

---
## 6. Issue/PR: #2192: docs: Add Antigravity connection steps for Looker
- **URL**: https://github.com/googleapis/genai-toolbox/pull/2192
- **Readability**: 0.0/4.0
- **Description**: open by NirajNandre

### Content Snippet
```
## Description

This PR adds a new section to the `looker_mcp.md` document that explains how to connect Looker to Antigravity.

The new **"Connect with Antigravity"** section provides two methods
```

---
## 7. Code Snippet: mrexodia/ida-pro-mcp :: src/ida_pro_mcp/server.py
- **URL**: https://github.com/mrexodia/ida-pro-mcp/blob/a63cb930a4f611b1302cb36d6efd866177f4e3de/src/ida_pro_mcp/server.py
- **Readability**: 1.3/4.0
- **Description**: server.py

### Content Snippet
```
import os
import sys
import json
import shutil
import argparse
import http.client
import tempfile
import traceback
import tomllib
import tomli_w
...[elided]...
def copy_python_env(env: dict[str, str]):
    # Reference: https://docs.python.org/3/using/cmdline.html#environment-variables
    python_vars = [
        "PYTHONHOME",
        "PYTHONPATH",
        "PYTHONSAFEPATH",
        "PYTHONPLATLIBDIR",
        "PYTHONPYCACHEPREFIX",
        "PYTHONNOUSERSITE",
        "PYTHONUSERBASE",
    ]
...[elided]...
```

---
## 8. Code Snippet: Scarmonit/antigravity-jules-orchestration :: docs/api/MCP_CONFIG_FIXED.md
- **URL**: https://github.com/Scarmonit/antigravity-jules-orchestration/blob/993e2bff76a4d338978e645d95ebaea32971b582/docs/api/MCP_CONFIG_FIXED.md
- **Readability**: 2.5/4.0
- **Description**: MCP_CONFIG_FIXED.md

### Content Snippet
```
﻿# MCP Configuration Fixed - 100% Functionality Achieved

**Date:** December 1, 2025  
**Status:** ✅ CONFIGURATION UPDATED

---

## ✅ WHAT WAS FIXED

### Issue Identified

### Issue Identified
Your `llm-framework-self-improve` server was missing the ChromaDB connection configuration in `mcp.json`.

### Solution Applied
Added the following environment variables to both `servers` and `mcpServers` sections:

```json
"env": {
    "LOG_LEVEL": "INFO",
    "CHROMA_URL": "http://localhost:8000",
    "CHROMA_SERVER_HOST": "localhost",
    "CHROMA_SERVER_HTTP_PORT": "8000"
}
```
...[elided]...
```

---
## 9. Code Snippet: teoat/reconciliation-platform-378 :: scripts/verify-mcp-config.sh
- **URL**: https://github.com/teoat/reconciliation-platform-378/blob/f4cffac8928575579e00974e72fb56ac22395118/scripts/verify-mcp-config.sh
- **Readability**: 2.8/4.0
- **Description**: verify-mcp-config.sh

### Content Snippet
```
#!/bin/bash
# Verify MCP configuration and server status
# This script checks if MCP servers are properly configured and built

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MCP_CONFIG="$PROJECT_ROOT/.cursor/mcp.json"
CLAUDE_CONFIG="$PROJECT_ROOT/claude-desktop-config.json"
#!/bin/bash
# Verify MCP configuration and server status
# This script checks if MCP servers are properly configured and built

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MCP_CONFIG="$PROJECT_ROOT/.cursor/mcp.json"
CLAUDE_CONFIG="$PROJECT_ROOT/claude-desktop-config.json"

...[elided]...
```

---
## 10. Code Snippet: upstash/context7 :: packages/mcp/README.md
- **URL**: https://github.com/upstash/context7/blob/e859a6b99070a88bdc6a79507ebbb3c0180d2362/packages/mcp/README.md
- **Readability**: 1.5/4.0
- **Description**: README.md

### Content Snippet
```
![Cover](https://github.com/upstash/context7/blob/master/public/cover.png?raw=true)

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=context7&config=eyJ1cmwiOiJodHRwczovL21jcC5jb250ZXh0Ny5jb20vbWNwIn0%3D) [<img alt="Install in VS Code (npx)" src="https://img.shields.io/badge/Install%20in%20VS%20Code-0098FF?style=for-the-badge&logo=visualstudiocode&logoColor=white">](https://insiders.vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%7B%22name%22%3A%22context7%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40upstash%2Fcontext7-mcp%40latest%22%5D%7D)

# Context7 MCP - Up-to-date Code Docs For Any Prompt

[![Website](https://img.shields.io/badge/Website-context7.com-blue)](https://context7.com) [![smithery badge](https://smithery.ai/badge/@upstash/context7-mcp)](https://smithery.ai/server/@upstash/context7-mcp) [![NPM Version](https://img.shields.io/npm/v/%40upstash%2Fcontext7-mcp?color=red)](https://www.npmjs.com/package/@upstash/context7-mcp) [![MIT licensed](https://img.shields.io/npm/l/%40upstash%2Fcontext7-mcp)](./LICENSE)

[![繁體中文](https://img.shields.io/badge/docs-繁體中文-yellow)](./i18n/README.zh-TW.md) [![简体中文](https://img.shields.io/badge/docs-简体中文-yellow)](./i18n/README.zh-CN.md) [![日本語](https://img.shields.io/badge/docs-日本語-b7003a)](./i18n/README.ja.md) [![한국어 문서](https://img.shields.io/badge/docs-한국어-green)](./i18n/README.ko.md) [![Documentación en Español](https://img.shields.io/badge/docs-Español-orange)](./i18n/README.es.md) [![Documentation en Français](https://img.shields.io/badge/docs-Français-blue)](./i18n/README.fr.md) [![Documentação em Português (Brasil)](<https://img.shields.io/badge/docs-Português%20(Brasil)-purple>)](./i18n/README.pt-BR.md) [![Documentazione in italiano](https://img.shields.io/badge/docs-Italian-red)](./i18n/README.it.md) [![Dokumentasi Bahasa Indonesia](https://img.shields.io/badge/docs-Bahasa%20Indonesia-pink)](./i18n/README.id-ID.md) [![Dokumentation auf Deutsch](https://img.shields.io/badge/docs-Deutsch-darkgreen)](./i18n/README.de.md) [![Документация на русском языке](https://img.shields.io/badge/docs-Русский-darkblue)](./i18n/README.ru.md) [![Українська документація](https://img.shields.io/badge/docs-Українська-lightblue)](./i18n/README.uk.md) [![Türkçe Doküman](https://img.shields.io/badge/docs-Türkçe-blue)](./i18n/README.tr.md) [![Arabic Documentation](https://img.shields.io/badge/docs-Arabic-white)](./i18n/README.ar.md) [![Tiếng Việt](https://img.shields.io/badge/docs-Tiếng%20Việt-red)](./i18n/README.vi.md)

...[elided]...
Kilo Code will automatically detect and load the configuration.

</details>

<details>
<summary><b>Install in Google Antigravity</b></summary>

Add this to your Antigravity MCP config file. See [Antigravity MCP docs](https://antigravity.google/docs/mcp) for more info.

#### Google Antigravity Remote Server Connection

```json
{
  "mcpServers": {
    "context7": {
...[elided]...
```

---

**Summary**: Found 10 results across 2 categories.
# GitHub Search Results

## 1. Issue/PR: #9: Create Complete Antigravity Integration Specification Document
- **URL**: https://github.com/OmarA1-Bakri/sales-automation-mcp/pull/9
- **Readability**: 0.0/4.0
- **Description**: open by Copilot

### Content Snippet
```
Create comprehensive integration specification document (`docs/ANTIGRAVITY_INTEGRATION_SPEC.md`) for integrating Antigravity Orchestrator Agent + Enterprise Security into the RTGS Sales Automation pla
```

---
## 2. Issue/PR: #7: Comprehensive system architecture analysis for SaaS dashboard and AI ads platform
- **URL**: https://github.com/milosriki/video-edit/pull/7
- **Readability**: 0.0/4.0
- **Description**: open by Copilot

### Content Snippet
```
Request to analyze all configurations, orchestration patterns, and intelligence systems for SaaS dashboard and personal "best ads maker" use cases.

## Analysis Summary

### Multi-Runtime Backend Arch
```

---
## 3. Issue/PR: #318: [BUG] Google Antigravity - Failure in MCP tool execution
- **URL**: https://github.com/homeassistant-ai/ha-mcp/issues/318
- **Readability**: 0.0/4.0
- **Description**: open by mvanhaperen

### Content Snippet
```
## Bug Type

- [ ] **Runtime bug** - Error occurred while using ha-mcp (use `ha_bug_report` tool)
- [x] **Startup/Installation error** - Can't start the server or install (fill manually below)

---

#
```

---
## 4. Issue/PR: #14974: Failed to connect to OAuth notifications: dial unix \\.\pipe\dockerBackendApiServer: connect: connection refused on Windows
- **URL**: https://github.com/docker/for-win/issues/14974
- **Readability**: 0.0/4.0
- **Description**: open by AnDr3w7911

### Content Snippet
```
### Description

the docker mcp gateway run command consistently fails with the dockerBackendApiServer connection refused error.

```
PS C:\Users\aturn\code\PB> docker mcp gateway run --verbose
- Read
```

---
## 5. Issue/PR: #10: feat: Antigravity Enterprise Orchestrator v2.4.0
- **URL**: https://github.com/OmarA1-Bakri/sales-automation-mcp/pull/10
- **Readability**: 0.0/4.0
- **Description**: open by OmarA1-Bakri

### Content Snippet
```
## Summary

Major release introducing the Antigravity Enterprise Orchestrator - a comprehensive multi-agent AI platform with enterprise features.

### New Features
- **Swarm AI Orchestration** - Multi
```

---
## 6. Code Snippet: github/github-mcp-server :: docs/installation-guides/install-antigravity.md
- **URL**: https://github.com/github/github-mcp-server/blob/b79d1264d5b8fac6c02b01c4c70b415e5a89cc1c/docs/installation-guides/install-antigravity.md
- **Readability**: 1.0/4.0
- **Description**: install-antigravity.md

### Content Snippet
```
# Installing GitHub MCP Server in Antigravity

This guide covers setting up the GitHub MCP Server in Google's Antigravity IDE.

## Prerequisites

- Antigravity IDE installed (latest version)
- GitHub Personal Access Token with appropriate scopes

## Installation Methods
...[elided]...
### Option 1: Remote Server (Recommended)

Uses GitHub's hosted server at `https://api.githubcopilot.com/mcp/`.

> [!NOTE]
> We recommend this manual configuration method because the "official" installation via the Antigravity MCP Store currently has known issues (often resulting in Docker errors). This direct remote connection is more reliable.

#### Step 1: Access MCP Configuration

1. Open Antigravity
2. Click the "..." (Additional Options) menu in the Agent panel
3. Select "MCP Servers"
4. Click "Manage MCP Servers"
5. Click "View raw config"

...[elided]...
```

---
## 7. Code Snippet: sandraschi/mcp-studio :: src/mcp_studio/mcp_server.py
- **URL**: https://github.com/sandraschi/mcp-studio/blob/999021728c4ad970d67855d9e0a80bbb1950d4e3/src/mcp_studio/mcp_server.py
- **Readability**: 1.0/4.0
- **Description**: mcp_server.py

### Content Snippet
```
#!/usr/bin/env python3
"""
MCP Studio MCP Server

This is the MCP server implementation for MCP Studio, providing tools for
managing and interacting with MCP servers through the Model Control Protocol.
"""

import os
import sys
#!/usr/bin/env python3
"""
MCP Studio MCP Server

This is the MCP server implementation for MCP Studio, providing tools for
managing and interacting with MCP servers through the Model Control Protocol.
"""

import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
...[elided]...
```

---
## 8. Code Snippet: google-gemini/gemini-cli :: packages/core/src/ide/ide-client.ts
- **URL**: https://github.com/google-gemini/gemini-cli/blob/181da07dd9f6a5d9f6006382bd1df52d3b4cb56c/packages/core/src/ide/ide-client.ts
- **Readability**: 1.0/4.0
- **Description**: ide-client.ts

### Content Snippet
```
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import { isSubpath } from '../utils/paths.js';
import { detectIde, type IdeInfo } from '../ide/detect-ide.js';
import { ideContextStore } from './ideContext.js';
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import { isSubpath } from '../utils/paths.js';
import { detectIde, type IdeInfo } from '../ide/detect-ide.js';
import { ideContextStore } from './ideContext.js';
import {
  IdeContextNotificationSchema,
  IdeDiffAcceptedNotificationSchema,
  IdeDiffClosedNotificationSchema,
  IdeDiffRejectedNotificationSchema,
} from './types.js';
import { getIdeProcessInfo } from './process-utils.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
...[elided]...
```

---
## 9. Code Snippet: upstash/context7 :: packages/mcp/README.md
- **URL**: https://github.com/upstash/context7/blob/e859a6b99070a88bdc6a79507ebbb3c0180d2362/packages/mcp/README.md
- **Readability**: 1.0/4.0
- **Description**: README.md

### Content Snippet
```
![Cover](https://github.com/upstash/context7/blob/master/public/cover.png?raw=true)

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=context7&config=eyJ1cmwiOiJodHRwczovL21jcC5jb250ZXh0Ny5jb20vbWNwIn0%3D) [<img alt="Install in VS Code (npx)" src="https://img.shields.io/badge/Install%20in%20VS%20Code-0098FF?style=for-the-badge&logo=visualstudiocode&logoColor=white">](https://insiders.vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%7B%22name%22%3A%22context7%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40upstash%2Fcontext7-mcp%40latest%22%5D%7D)

# Context7 MCP - Up-to-date Code Docs For Any Prompt

[![Website](https://img.shields.io/badge/Website-context7.com-blue)](https://context7.com) [![smithery badge](https://smithery.ai/badge/@upstash/context7-mcp)](https://smithery.ai/server/@upstash/context7-mcp) [![NPM Version](https://img.shields.io/npm/v/%40upstash%2Fcontext7-mcp?color=red)](https://www.npmjs.com/package/@upstash/context7-mcp) [![MIT licensed](https://img.shields.io/npm/l/%40upstash%2Fcontext7-mcp)](./LICENSE)

[![繁體中文](https://img.shields.io/badge/docs-繁體中文-yellow)](./i18n/README.zh-TW.md) [![简体中文](https://img.shields.io/badge/docs-简体中文-yellow)](./i18n/README.zh-CN.md) [![日本語](https://img.shields.io/badge/docs-日本語-b7003a)](./i18n/README.ja.md) [![한국어 문서](https://img.shields.io/badge/docs-한국어-green)](./i18n/README.ko.md) [![Documentación en Español](https://img.shields.io/badge/docs-Español-orange)](./i18n/README.es.md) [![Documentation en Français](https://img.shields.io/badge/docs-Français-blue)](./i18n/README.fr.md) [![Documentação em Português (Brasil)](<https://img.shields.io/badge/docs-Português%20(Brasil)-purple>)](./i18n/README.pt-BR.md) [![Documentazione in italiano](https://img.shields.io/badge/docs-Italian-red)](./i18n/README.it.md) [![Dokumentasi Bahasa Indonesia](https://img.shields.io/badge/docs-Bahasa%20Indonesia-pink)](./i18n/README.id-ID.md) [![Dokumentation auf Deutsch](https://img.shields.io/badge/docs-Deutsch-darkgreen)](./i18n/README.de.md) [![Документация на русском языке](https://img.shields.io/badge/docs-Русский-darkblue)](./i18n/README.ru.md) [![Українська документація](https://img.shields.io/badge/docs-Українська-lightblue)](./i18n/README.uk.md) [![Türkçe Doküman](https://img.shields.io/badge/docs-Türkçe-blue)](./i18n/README.tr.md) [![Arabic Documentation](https://img.shields.io/badge/docs-Arabic-white)](./i18n/README.ar.md) [![Tiếng Việt](https://img.shields.io/badge/docs-Tiếng%20Việt-red)](./i18n/README.vi.md)

![Cover](https://github.com/upstash/context7/blob/master/public/cover.png?raw=true)

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=context7&config=eyJ1cmwiOiJodHRwczovL21jcC5jb250ZXh0Ny5jb20vbWNwIn0%3D) [<img alt="Install in VS Code (npx)" src="https://img.shields.io/badge/Install%20in%20VS%20Code-0098FF?style=for-the-badge&logo=visualstudiocode&logoColor=white">](https://insiders.vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%7B%22name%22%3A%22context7%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40upstash%2Fcontext7-mcp%40latest%22%5D%7D)

# Context7 MCP - Up-to-date Code Docs For Any Prompt

[![Website](https://img.shields.io/badge/Website-context7.com-blue)](https://context7.com) [![smithery badge](https://smithery.ai/badge/@upstash/context7-mcp)](https://smithery.ai/server/@upstash/context7-mcp) [![NPM Version](https://img.shields.io/npm/v/%40upstash%2Fcontext7-mcp?color=red)](https://www.npmjs.com/package/@upstash/context7-mcp) [![MIT licensed](https://img.shields.io/npm/l/%40upstash%2Fcontext7-mcp)](./LICENSE)

[![繁體中文](https://img.shields.io/badge/docs-繁體中文-yellow)](./i18n/README.zh-TW.md) [![简体中文](https://img.shields.io/badge/docs-简体中文-yellow)](./i18n/README.zh-CN.md) [![日本語](https://img.shields.io/badge/docs-日本語-b7003a)](./i18n/README.ja.md) [![한국어 문서](https://img.shields.io/badge/docs-한국어-green)](./i18n/README.ko.md) [![Documentación en Español](https://img.shields.io/badge/docs-Español-orange)](./i18n/README.es.md) [![Documentation en Français](https://img.shields.io/badge/docs-Français-blue)](./i18n/README.fr.md) [![Documentação em Português (Brasil)](<https://img.shields.io/badge/docs-Português%20(Brasil)-purple>)](./i18n/README.pt-BR.md) [![Documentazione in italiano](https://img.shields.io/badge/docs-Italian-red)](./i18n/README.it.md) [![Dokumentasi Bahasa Indonesia](https://img.shields.io/badge/docs-Bahasa%20Indonesia-pink)](./i18n/README.id-ID.md) [![Dokumentation auf Deutsch](https://img.shields.io/badge/docs-Deutsch-darkgreen)](./i18n/README.de.md) [![Документация на русском языке](https://img.shields.io/badge/docs-Русский-darkblue)](./i18n/README.ru.md) [![Українська документація](https://img.shields.io/badge/docs-Українська-lightblue)](./i18n/README.uk.md) [![Türkçe Doküman](https://img.shields.io/badge/docs-Türkçe-blue)](./i18n/README.tr.md) [![Arabic Documentation](https://img.shields.io/badge/docs-Arabic-white)](./i18n/README.ar.md) [![Tiếng Việt](https://img.shields.io/badge/docs-Tiếng%20Việt-red)](./i18n/README.vi.md)

## ❌ Without Context7

...[elided]...
```

---
## 10. Code Snippet: TencentCloudBase/CloudBase-AI-ToolKit :: doc/mcp-tools.md
- **URL**: https://github.com/TencentCloudBase/CloudBase-AI-ToolKit/blob/b4f1bec7adca72ee6b5431a316f746f2f18e8445/doc/mcp-tools.md
- **Readability**: 1.0/4.0
- **Description**: mcp-tools.md

### Content Snippet
```
# MCP 工具

当前包含 38 个工具。

源数据: [tools.json](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit/blob/main/scripts/tools.json)

---

## 工具总览

...[elided]...
<tr><td><code>deleteFiles</code></td><td>删除静态网站托管的文件或文件夹</td></tr>
<tr><td><code>findFiles</code></td><td>搜索静态网站托管的文件</td></tr>
<tr><td><code>domainManagement</code></td><td>统一的域名管理工具，支持绑定、解绑、查询和修改域名配置</td></tr>
<tr><td><code>queryStorage</code></td><td>查询云存储信息，支持列出目录文件、获取文件信息、获取临时下载链接等只读操作。返回的文件信息包括文件名、大小、修改时间、下载链接等。</td></tr>
<tr><td><code>manageStorage</code></td><td>管理云存储文件，支持上传文件/目录、下载文件/目录、删除文件/目录等操作。删除操作需要设置force=true进行确认，防止误删除重要文件。</td></tr>
<tr><td><code>downloadTemplate</code></td><td>自动下载并部署CloudBase项目模板。⚠️ **MANDATORY FOR NEW PROJECTS** ⚠️&lt;br/&gt;**CRITICAL**: This tool MUST be called FIRST when starting a new project.&lt;br/&gt;支持的模板:&lt;br/&gt;- react: React + CloudBase 全栈应用模板&lt;br/&gt;- vue: Vue + CloudBase 全栈应用模板&lt;br/&gt;- miniprogram: 微信小程序 + 云开发模板  &lt;br/&gt;- uniapp: UniApp + CloudBase 跨端应用模板&lt;br/&gt;- rules: 只包含AI编辑器配置文件（包含Cursor、WindSurf、CodeBuddy等所有主流编辑器配置），适合在已有项目中补充AI编辑器配置&lt;br/&gt;支持的IDE类型:&lt;br/&gt;- all: 下载所有IDE配置（默认）&lt;br/&gt;- cursor: Cursor AI编辑器&lt;br/&gt;- windsurf: WindSurf AI编辑器&lt;br/&gt;- codebuddy: CodeBuddy AI编辑器&lt;br/&gt;- claude-code: Claude Code AI编辑器&lt;br/&gt;- cline: Cline AI编辑器&lt;br/&gt;- gemini-cli: Gemini CLI&lt;br/&gt;- opencode: OpenCode AI编辑器&lt;br/&gt;- qwen-code: 通义灵码&lt;br/&gt;- baidu-comate: 百度Comate&lt;br/&gt;- openai-codex-cli: OpenAI Codex CLI&lt;br/&gt;- augment-code: Augment Code&lt;br/&gt;- github-copilot: GitHub Copilot&lt;br/&gt;- roocode: RooCode AI编辑器&lt;br/&gt;- tongyi-lingma: 通义灵码&lt;br/&gt;- trae: Trae AI编辑器&lt;br/&gt;- qoder: Qoder AI编辑器&lt;br/&gt;- antigravity: Google Antigravity AI编辑器&lt;br/&gt;- vscode: Visual Studio Code&lt;br/&gt;特别说明：&lt;br/&gt;- rules 模板会自动包含当前 mcp 版本号信息（版本号：2.6.3），便于后续维护和版本追踪&lt;br/&gt;- 下载 rules 模板时，如果项目中已存在 README.md 文件，系统会自动保护该文件不被覆盖（除非设置 overwrite=true）</td></tr>
<tr><td><code>interactiveDialog</code></td><td>统一的交互式对话工具，支持需求澄清和任务确认，当需要和用户确认下一步的操作的时候，可以调用这个工具的clarify，如果有敏感的操作，需要用户确认，可以调用这个工具的confirm</td></tr>
<tr><td><code>searchWeb</code></td><td>使用联网来进行信息检索，如查询最新的新闻、文章、股价、天气等。支持自然语言查询，也可以直接输入网址获取网页内容</td></tr>
<tr><td><code>searchKnowledgeBase</code></td><td>云开发知识库智能检索工具，支持向量查询 (vector)、固定文档 (doc) 和 OpenAPI 文档 (openapi) 查询。&lt;br/&gt;      强烈推荐始终优先使用固定文档 (doc) 或 OpenAPI 文档 (openapi) 模式进行检索，仅当固定文档无法覆盖你的问题时，再使用向量查询 (vector) 模式。&lt;br/&gt;      固定文档 (doc) 查询当前支持 17 个固定文档，分别是：&lt;br/&gt;      文档名：auth-http-api 文档介绍：Use when you need to implement CloudBase Auth v2 over raw HTTP endpoints (login/signup, tokens, user operations) from backends or scripts that are not using the Web or Node SDKs.&lt;br/&gt;文档名：auth-nodejs 文档介绍：Complete guide for CloudBase Auth using the CloudBase Node SDK – caller identity, user lookup, custom login tickets, and server-side best practices.&lt;br/&gt;文档名：auth-tool 文档介绍：Use CloudBase Auth tool to configure and manage authentication providers for web applications - enable/disable login methods (SMS, Email, WeChat Open Platform, Google, Anonymous, Username/password, OAuth, SAML, CAS, Dingding, etc.) and configure provider settings via MCP tools.&lt;br/&gt;文档名：auth-web 文档介绍：Complete guide for CloudBase Auth v2 using Web SDK (@cloudbase/js-sdk@2.x) - all login flows, user management, captcha handling, and best practices in one file.&lt;br/&gt;文档名：auth-wechat 文档介绍：Complete guide for WeChat Mini Program authentication with CloudBase - native login, user identity, and cloud function integration.&lt;br/&gt;文档名：cloudbase-platform 文档介绍：CloudBase platform knowledge and best practices. Use this skill for general CloudBase platform understanding, including storage, hosting, authentication, cloud functions, database permissions, and data models.&lt;br/&gt;文档名：cloudrun-development 文档介绍：CloudBase Run backend development rules (Function mode/Container mode). Use this skill when deploying backend services that require long connections, multi-language support, custom environments, or AI agent development.&lt;br/&gt;文档名：data-model-creation 文档介绍：Optional advanced tool for complex data modeling. For simple table creation, use relational-database-tool directly with SQL statements.&lt;br/&gt;文档名：http-api 文档介绍：Use CloudBase HTTP API to access CloudBase platform features (database, authentication, cloud functions, cloud hosting, cloud storage, AI) via HTTP protocol from backends or scripts that are not using SDKs.&lt;br/&gt;文档名：miniprogram-development 文档介绍：WeChat Mini Program development rules. Use this skill when developing WeChat mini programs, integrating CloudBase capabilities, and deploying mini program projects.&lt;br/&gt;文档名：no-sql-web-sdk 文档介绍：Use CloudBase document database Web SDK to query, create, update, and delete data. Supports complex queries, pagination, aggregation, and geolocation queries.&lt;br/&gt;文档名：no-sql-wx-mp-sdk 文档介绍：Use CloudBase document database WeChat MiniProgram SDK to query, create, update, and delete data. Supports complex queries, pagination, aggregation, and geolocation queries.&lt;br/&gt;文档名：relational-database-tool 文档介绍：This is the required documentation for agents operating on the CloudBase Relational Database. It lists the only four supported tools for running SQL and managing security rules. Read the full content to understand why you must NOT use standard Application SDKs and how to safely execute INSERT, UPDATE, or DELETE operations without corrupting production data.&lt;br/&gt;文档名：relational-database-web 文档介绍：Use when building frontend Web apps that talk to CloudBase Relational Database via @cloudbase/js-sdk – provides the canonical init pattern so you can then use Supabase-style queries from the browser.&lt;br/&gt;文档名：spec-workflow 文档介绍：Standard software engineering workflow for requirement analysis, technical design, and task planning. Use this skill when developing new features, complex architecture designs, multi-module integrations, or projects involving database/UI design.&lt;br/&gt;文档名：ui-design 文档介绍：Professional UI design and frontend interface guidelines. Use this skill when creating web pages, mini-program interfaces, prototypes, or any frontend UI components that require distinctive, production-grade design with exceptional aesthetic quality.&lt;br/&gt;文档名：web-development 文档介绍：Web frontend project development rules. Use this skill when developing web frontend pages, deploying static hosting, and integrating CloudBase Web SDK.&lt;br/&gt;      OpenAPI 文档 (openapi) 查询当前支持 5 个 API 文档，分别是：&lt;br/&gt;      API名：mysqldb API介绍：MySQL RESTful API - 云开发 MySQL 数据库 HTTP API&lt;br/&gt;API名：functions API介绍：Cloud Functions API - 云函数 HTTP API&lt;br/&gt;API名：auth API介绍：Authentication API - 身份认证 HTTP API&lt;br/&gt;API名：cloudrun API介绍：CloudRun API - 云托管服务 HTTP API&lt;br/&gt;API名：storage API介绍：Storage API - 云存储 HTTP API</td></tr>
<tr><td><code>queryCloudRun</code></td><td>查询云托管服务信息，支持获取服务列表、查询服务详情和获取可用模板列表。返回的服务信息包括服务名称、状态、访问类型、配置详情等。</td></tr>
<tr><td><code>manageCloudRun</code></td><td>管理云托管服务，按开发顺序支持：初始化项目（可从模板开始，模板列表可通过 queryCloudRun 查询）、下载服务代码、本地运行（仅函数型服务）、部署代码、删除服务。部署可配置CPU、内存、实例数、访问类型等参数。删除操作需要确认，建议设置force=true。</td></tr>
<tr><td><code>createFunctionHTTPAccess</code></td><td>创建云函数的 HTTP 访问</td></tr>
<tr><td><code>downloadRemoteFile</code></td><td>下载远程文件到项目根目录下的指定相对路径。例如：小程序的 Tabbar 等素材图片，必须使用 **png** 格式，可以从 Unsplash、wikimedia【一般选用 500 大小即可、Pexels、Apple 官方 UI 等资源中选择来下载。</td></tr>
<tr><td><code>readSecurityRule</code></td><td>读取指定资源（noSQL 数据库、SQL 数据库、云函数、存储桶）的安全规则和权限类别。</td></tr>
<tr><td><code>writeSecurityRule</code></td><td>设置指定资源（数据库集合、云函数、存储桶）的安全规则。</td></tr>
...[elided]...
```

---

**Summary**: Found 10 results across 2 categories.
