# Bruteforce Research Report
Generated on Fri Dec 19 12:48:07 PM MST 2025
## Researching: antigravity mcp_config.json example
# GitHub Search Results

## 1. Issue/PR: #757: Better integration with major agentic CLIs and IDEs
- **URL**: https://github.com/oraios/serena/issues/757
- **Readability**: 0.0/4.0
- **Description**: open by MischaPanch

### Content Snippet
```
A lot has happened in the last 5 months on the market. For the 1.0.0 release, we should create dedicated contexts and modes as well as improved documentation for integrating Serena with the major prov
```

---
## 2. Issue/PR: #1624: Add Antigravity installation docs
- **URL**: https://github.com/github/github-mcp-server/pull/1624
- **Readability**: 0.0/4.0
- **Description**: closed by tommaso-moro

### Content Snippet
```
This PR adds an installation guide for Antigravity.

Supersedes **[#1549](https://github.com/github/github-mcp-server/pull/1549)** and is up to date with the main branch. 

**All credit for this w
```

---
## 3. Issue/PR: #2192: docs: Add Antigravity connection steps for Looker
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
## 4. Issue/PR: #4: Feature Request - Add MCP Configuration for Seamless Antigravity Editor Integration
- **URL**: https://github.com/stevei101/antigravity-boots/issues/4
- **Readability**: 0.0/4.0
- **Description**: open by stevei101

### Content Snippet
```
---

**Title:** [Feature] Add MCP Configuration for Seamless Antigravity Editor Integration

**Is your feature request related to a problem? Please describe.**
Developers working on `antigravity-boot
```

---
## 5. Issue/PR: #8: Example configuration for Antigravity?
- **URL**: https://github.com/GarethCott/enhanced-postgres-mcp-server/issues/8
- **Readability**: 0.0/4.0
- **Description**: open by nealrauhauser

### Content Snippet
```
Antigravity's MCP setup is funny, to say the least. The following config works just fine for Claude Desktop. The other npx software I have all has a @scope before the package name. I have no great me
```

---
## 6. Code Snippet: langwatch/better-agents :: src/providers/coding-assistants/antigravity/index.ts
- **URL**: https://github.com/langwatch/better-agents/blob/1bc1816891716ecbf184bd5dbb7285e19145592b/src/providers/coding-assistants/antigravity/index.ts
- **Readability**: 1.0/4.0
- **Description**: index.ts

### Content Snippet
```
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { logger } from "../../../utils/logger/index.js";
import type { CodingAssistantProvider, MCPConfigFile } from "../index.js";

/**
 * Antigravity assistant provider implementation.
 * Handles availability checking and launch instructions for Antigravity IDE.
 *
import * as os from "os";
import { logger } from "../../../utils/logger/index.js";
import type { CodingAssistantProvider, MCPConfigFile } from "../index.js";

/**
 * Antigravity assistant provider implementation.
 * Handles availability checking and launch instructions for Antigravity IDE.
 *
 * Note: Antigravity has special MCP config handling - it uses ~/.gemini/antigravity/mcp_config.json
 * instead of project-local config files.
 */
export const AntigravityCodingAssistantProvider: CodingAssistantProvider = {
  id: "antigravity",
  displayName: "Antigravity",
  command: "agy",
...[elided]...
```

---
## 7. Code Snippet: googleapis/genai-toolbox :: docs/LOOKER_README.md
- **URL**: https://github.com/googleapis/genai-toolbox/blob/a02ca45ba37a0fb9165dea0d1babe5b554c2ddff/docs/LOOKER_README.md
- **Readability**: 3.0/4.0
- **Description**: LOOKER_README.md

### Content Snippet
```
# Looker MCP Server

The Looker Model Context Protocol (MCP) Server gives AI-powered development tools the ability to work with your Looker instance. It supports exploring models, running queries, managing dashboards, and more.

## Features

An editor configured to use the Looker MCP server can use its AI capabilities to help you:

- **Explore Models** - Get models, explores, dimensions, measures, filters, and parameters
- **Run Queries** - Execute Looker queries, generate SQL, and create query URLs
...[elided]...
## Custom MCP Server Configuration

The MCP server is configured using environment variables.

```bash
export LOOKER_BASE_URL="<your-looker-instance-url>"  # e.g. `https://looker.example.com`. You may need to add the port, i.e. `:19999`.
export LOOKER_CLIENT_ID="<your-looker-client-id>"
export LOOKER_CLIENT_SECRET="<your-looker-client-secret>"
export LOOKER_VERIFY_SSL="true" # Optional, defaults to true
export LOOKER_SHOW_HIDDEN_MODELS="true" # Optional, defaults to true
export LOOKER_SHOW_HIDDEN_EXPLORES="true" # Optional, defaults to true
export LOOKER_SHOW_HIDDEN_FIELDS="true" # Optional, defaults to true
```

Add the following configuration to your MCP client (e.g., `settings.json` for Gemini CLI, `mcp_config.json` for Antigravity):
...[elided]...
```

---
## 8. Code Snippet: homeassistant-ai/ha-mcp :: site/src/content/clients/antigravity.md
- **URL**: https://github.com/homeassistant-ai/ha-mcp/blob/53d3d22a29dd525b18a7391de82e1511c02e23ac/site/src/content/clients/antigravity.md
- **Readability**: 1.0/4.0
- **Description**: antigravity.md

### Content Snippet
```
---
name: Antigravity
company: Google
logo: /logos/google.svg
transports: ['stdio']
configFormat: json
configLocation: mcp_config.json (in Antigravity UI)
accuracy: 3
order: 15
---
name: Antigravity
company: Google
logo: /logos/google.svg
transports: ['stdio']
configFormat: json
configLocation: mcp_config.json (in Antigravity UI)
accuracy: 3
order: 15
---

## Configuration

Google Antigravity supports MCP servers via the built-in MCP Store and custom configuration.

> **Recommended:** Use stdio mode for reliable connectivity. HTTP mode may experience connection timeout issues.
...[elided]...
```

---
## 9. Code Snippet: czlonkowski/n8n-mcp :: docs/ANTIGRAVITY_SETUP.md
- **URL**: https://github.com/czlonkowski/n8n-mcp/blob/562f4b0c4ecb98d3e9c8993ea4a911f64a5d7c40/docs/ANTIGRAVITY_SETUP.md
- **Readability**: 1.0/4.0
- **Description**: ANTIGRAVITY_SETUP.md

### Content Snippet
```
# Antigravity Setup

:white_check_mark: This n8n MCP server is compatible with Antigravity (Chat in IDE).

## Preconditions

Assuming you've already deployed the n8n MCP server locally and connected it to the n8n API, and it's available at:
`http://localhost:5678`

Or if you are using `https://n8n.your.production.url/` then just replace the URLs in the below code.
# Antigravity Setup

:white_check_mark: This n8n MCP server is compatible with Antigravity (Chat in IDE).

## Preconditions

Assuming you've already deployed the n8n MCP server locally and connected it to the n8n API, and it's available at:
`http://localhost:5678`

Or if you are using `https://n8n.your.production.url/` then just replace the URLs in the below code.
...[elided]...
```

---
## 10. Code Snippet: appwrite/website :: src/routes/docs/tooling/mcp/antigravity/+page.markdoc
- **URL**: https://github.com/appwrite/website/blob/ba3e12e18a462352ce2556407e5cb3cb993d953d/src/routes/docs/tooling/mcp/antigravity/%2Bpage.markdoc
- **Readability**: 0.0/4.0
- **Description**: +page.markdoc

### Content Snippet
```
---
layout: article
title: Appwrite MCP and Google Antigravity
description: Learn how to add the Appwrite MCP servers to Agent Manager in Google Antigravity to interact with both the Appwrite API and documentation.
---

Learn how you can add the Appwrite MCP servers to Agent Manager in Google Antigravity to interact with both the Appwrite API and documentation.

Before you begin, ensure you have the following **pre-requisites** installed on your system:

...[elided]...
To add the Appwrite MCP server, open Antigravity and go to the drop-down (...) menu in the Agent window . From there, navigate to Manage MCP Servers in the MCP Store, and then click View raw config in the main panel to add your custom MCP server.

{% tabs %}
{% tabsitem #api-only title="API server" %}

Update the `mcp_config.json` file to include the API server:

```json
{
  "servers": {
    "appwrite-api": {
      "command": "uvx",
      "args": [
        "mcp-server-appwrite",
        "--users"
...[elided]...
```

---

**Summary**: Found 10 results across 2 categories.

---

## Researching: cortex ide mcp configuration
# GitHub Search Results

## 1. Issue/PR: #1: Port CANable firmware from STM32F042C6 to STM32H723VET6 with custom hardware, CI/CD, and STM32CubeIDE support
- **URL**: https://github.com/sengulhamza/canable-fw/pull/1
- **Readability**: 0.0/4.0
- **Description**: open by Copilot

### Content Snippet
```
## Port CANable Firmware from STM32F042C6 to STM32H723VET6 ✅ COMPLETE

Successfully completed comprehensive port of CANable firmware to STM32H723VET6 microcontroller with updated pin configurations pe
```

---
## 2. Issue/PR: #1: Cortex-MCP: AI-assisted development server for XSOAR/XSIAM
- **URL**: https://github.com/amshamah419/CortexSynapse/pull/1
- **Readability**: 0.0/4.0
- **Description**: closed by Copilot

### Content Snippet
```
A containerized MCP (Model Context Protocol) server that enables AI-powered IDEs (Windsurf, Cursor, Roo Code) to interact with live XSOAR/XSIAM instances, allowing developers to build, test, and verif
```

---
## 3. Issue/PR: #287: [feature] Ollama Integration - Local LLM Support
- **URL**: https://github.com/cortexlinux/cortex/pull/287
- **Readability**: 0.0/4.0
- **Description**: open by mikejmorgan-ai

### Content Snippet
```
## Summary

Adds local LLM support via Ollama for privacy-first, offline-capable package management.

## Features
- ✅ Auto-detect Ollama installation
- ✅ Smart model selection (prefers code-focused mo
```

---
## 4. Issue/PR: #286: [feature] Add MCP server for AI assistant integration
- **URL**: https://github.com/cortexlinux/cortex/pull/286
- **Readability**: 0.0/4.0
- **Description**: closed by mikejmorgan-ai

### Content Snippet
```
## Summary

Implements Model Context Protocol (MCP) server for Cortex Linux, allowing any MCP-compatible AI assistant to manage packages.

## What's Included

- **AGENTS.md** - AI coding agent guideli
```

---
## 5. Issue/PR: #8: feat: Integrate Node.js for Real-Time Debugging Enhancement
- **URL**: https://github.com/custompowerllc/mcp_server_gdb/pull/8
- **Readability**: 0.0/4.0
- **Description**: open by alanhuu1990

### Content Snippet
```
## 🚀 Node.js Real-Time Debugging Integration

This PR introduces a comprehensive Node.js integration that enhances the MCP GDB Server with real-time debugging capabilities through a modern web-based d
```

---
## 6. Code Snippet: OpenAiTx/OpenAiTx :: projects/punkpeye/awesome-mcp-servers/README.md
- **URL**: https://github.com/OpenAiTx/OpenAiTx/blob/5f8085e3cbe2ccb5448866beb75d0e8f97c70dd4/projects/punkpeye/awesome-mcp-servers/README.md
- **Readability**: 2.8/4.0
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
## 7. Code Snippet: hyunjun/bookmarks :: clojure.md
- **URL**: https://github.com/hyunjun/bookmarks/blob/f46894020e9e395c3616e827c8b63236be3d3480/clojure.md
- **Readability**: 3.3/4.0
- **Description**: clojure.md

### Content Snippet
```
Clojure
=======
* [clojure.kr](http://clojure.kr)
* [Articles: clojure | Functional Works](https://functional.works-hub.com/clojure-articles)
* [Clojure - News](https://clojure.org/news/news)
* [www.tryclj.com](http://www.tryclj.com/)
* [clojurecademy.com](https://clojurecademy.com)
* [clojureverse.org](https://clojureverse.org/)
* [Clojure Complete (클로저 완전정복)](https://github.com/clojure-kr/clojure-complete)
* [Clojure Complete (클로저 완전정복)](http://clojure.or.kr/books/clojure-complete/)
...[elided]...
* [methodical: Functional and flexible multimethods for Clojure. Nondestructive multimethod construction, CLOS-style aux methods and method combinations, partial-default dispatch, easy next-method invocation, helpful debugging tools, and more](https://github.com/camsaul/methodical)
* [minimax: Minimalist 3D game engine in Clojure](https://github.com/roman01la/minimax)
* [mirabelle: A stream processing engine for monitoring](https://github.com/mcorbin/mirabelle)
  * [(mcorbin.fr): Mirabelle, a new stream processing engine for monitoring](https://mcorbin.fr/posts/2021-03-01-mirabelle-stream-processing/)
* [mixfix-clj](https://github.com/awto/mixfix-clj) 중위 표기 이용 가능 e.g. 수식
* [modex: Modex is a Clojure MCP Library to augment your AI models with Tools, Resources & Prompts using Clojure (Model Context Protocol). Implements MCP Server & Client.](https://github.com/theronic/modex)
  * [Scicloj AI Meetup 4 # LLM tools feedback loop # MCPs, Modex, and Datomic MCP - YouTube](https://www.youtube.com/watch?v=DN0l78bFsDY)
* [Monger - an idiomatic Clojure MongoDB driver for a more civilized age: with sane defaults, batteries included, well documented, very fast http://clojuremongodb.info](https://github.com/michaelklishin/monger)
* [mongrove: A Clojure library designed to interact with MongoDB using the latest java-sync drivers : https://mongodb.github.io/mongo-java-driver/4.1/driver/](https://github.com/helpshift/mongrove)
* [Muse](https://github.com/kachayev/muse)
  * [Solving the "N+1 Selects Problem" with Muse](https://github.com/kachayev/muse/blob/master/docs/sql.md)
* [nasus: Zero-configuration command-line async HTTP files server in Clojure. Like Python's SimpleHTTPServer but scalable](https://github.com/kachayev/nasus)
* [Neanderthal - Fast native-speed matrix and linear algebra in Clojure](http://neanderthal.uncomplicate.org/)
  * [Neanderthal 0.9.0 released - Clojure's high-performance computing story is getting into shape](http://dragan.rocks/articles/17/Neanderthal-090-released-Clojure-high-performance-computing)
  * [What's nice about Clojure numerical computing with new Neanderthal 0.16.0](http://dragan.rocks/articles/17/Neanderthal-016-Whats-nice-about-Clojure-numerical-computing-with-Neanderthal)
...[elided]...
```

---
## 8. Code Snippet: SplashCodeDex/PlanMyLife :: GET_MCP_HERE.md
- **URL**: https://github.com/SplashCodeDex/PlanMyLife/blob/7bbee1de13b6c6deeb3d96de15909cfe5f4f0e7f/GET_MCP_HERE.md
- **Readability**: 3.3/4.0
- **Description**: GET_MCP_HERE.md

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
	* x86_64 assembly for SHA256, SHA512, and SHA3. (SHA3 assembly
          was included in the 2.6 release, but disabled due to poor
          performance on some AMD processors. Hopefully, that
          performance problem is fixed now).
	
	The ARM code was tested and benchmarked on Cortex-A9. Some of
	the functions use "neon" instructions. The configure script
	decides if neon instructions can be used, and the command line
	options --enable-arm-neon and --disable-arm-neon can be used
	to override its choice. Feedback appreciated.
	  
	The libraries are intended to be binary compatible with
	nettle-2.2 and later. The shared library names are
	libnettle.so.4.6 and libhogweed.so.2.4, with sonames still
	libnettle.so.4 and libhogweed.so.2.
...[elided]...
```

---
## 10. Code Snippet: kaxap/arl :: README-V.md
- **URL**: https://github.com/kaxap/arl/blob/1c16edd6dc877318c81608b655a3c16485b85c1d/README-V.md
- **Readability**: 2.3/4.0
- **Description**: README-V.md

### Content Snippet
```
## This is a most popular repository list for V sorted by number of stars
|STARS|FORKS|ISSUES|LAST COMMIT|NAME/PLACE|DESCRIPTION|
| --- | --- | --- | --- | --- | --- |
| 30139 | 1840 | 647 | 8 hours ago | [v](https://github.com/vlang/v)/1 | Simple, fast, safe, compiled language for developing maintainable software. Compiles itself in <1s with zero library dependencies. Supports automatic C => V translation. https://vlang.io |
| 1771 | 123 | 72 | 3 days ago | [ui](https://github.com/vlang/ui)/2 | Cross-platform UI library written in V |
| 1344 | 92 | 13 | 18 days ago | [vinix](https://github.com/vlang/vinix)/3 | Vinix is an effort to write a modern, fast, and useful operating system in the V programming language |
| 1119 | 60 | 26 | 5 days ago | [ved](https://github.com/vlang/ved)/4 | 1 MB text editor written in V with hardware accelerated text rendering. Compiles in <1s. |
| 985 | 57 | 15 | a month ago | [gitly](https://github.com/vlang/gitly)/5 | Light and fast GitHub/GitLab alternative written in V |
| 541 | 9 | 7 | 27 days ago | [cotowali](https://github.com/cotowali/cotowali)/6 | A statically typed scripting language that transpile into POSIX sh |
| 263 | 25 | 6 | 24 days ago | [vex](https://github.com/nedpals/vex)/7 | Easy-to-use, modular web framework built for V |
...[elided]...
| 3 | 0 | 0 | 7 months ago | [Valk](https://github.com/ValkSoftware/Valk)/366 | Valk Minecraft server |
| 2 | 0 | 0 | 9 months ago | [chip8-v](https://github.com/sdtv9507/chip8-v)/367 | Chip-8 interpreter made in V programming language |
| 2 | 0 | 0 | Unknown | [openapi2cli](https://github.com/eliottness/openapi2cli)/368 | Create a portable binary from an OpenAPI Specification |
| 2 | 1 | 0 | Unknown | [vlang-big-integer](https://github.com/hanabi1224/vlang-big-integer)/369 | Big interger implemented in pure vlang |
| 2 | 0 | 0 | Unknown | [nanoid](https://github.com/invipal/nanoid)/370 | V implementation of NanoID |
| 2 | 1 | 0 | 2 years ago | [TinySoC](https://github.com/erihsu/TinySoC)/371 | Arm cortex-m3 based SoC implementation used for simple car plane recognization |
| 2 | 1 | 0 | 2 years ago | [v-ui-mvp-example](https://github.com/alexesprit/v-ui-mvp-example)/372 | A simple example of using Model-View-Presenter pattern in V |
| 2 | 0 | 0 | Unknown | [mod_v](https://github.com/seven1240/mod_v)/373 | FreeSWITCH mod in V |
| 3 | 1 | 0 | Unknown | [vbf](https://github.com/paulohrpinheiro/vbf)/374 | Brainfuck in V |
| 2 | 0 | 0 | 1 year, 2 months ago | [FoodHub-CORE](https://github.com/DoenerFoodhub/FoodHub-CORE)/375 | None |
| 2 | 1 | 0 | Unknown | [MCServerStatus](https://github.com/LouisSchmieder/MCServerStatus)/376 | A service to check the server status from minecraft servers |
| 2 | 0 | 1 | 8 months ago | [Vuild](https://github.com/LouisSchmieder/Vuild)/377 | None |
| 2 | 0 | 0 | Unknown | [vray](https://github.com/dvaldespino94/vray)/378 | None |
| 4 | 0 | 0 | Unknown | [vbenchmark](https://github.com/vincenzopalazzo/vbenchmark)/379 | A V lang binding for google benchmark library |
| 2 | 0 | 0 | 18 days ago | [vbson](https://github.com/impopular-guy/vbson)/380 | Independent BSON implementation in V programming language |
...[elided]...
```

---

**Summary**: Found 10 results across 2 categories.

---

## Researching: mcpServers json schema
# GitHub Search Results

## 1. Issue/PR: #15060: fix(core): handle unsupported JSON Schema versions in MCP tool validation
- **URL**: https://github.com/google-gemini/gemini-cli/pull/15060
- **Readability**: 0.0/4.0
- **Description**: open by afarber

### Content Snippet
```
## Summary

MCP servers built with Rust rmcp v0.9.1+ send JSON Schema draft-2020-12, which AJV (the JSON validator) doesn't support by default. This causes tool invocations to fail with "no schema w
```

---
## 2. Issue/PR: #481: feat: Add enabledTools/disabledTools configuration to mcp.json for per-tool filtering
- **URL**: https://github.com/Factory-AI/factory/issues/481
- **Readability**: 0.0/4.0
- **Description**: open by ben-vargas

### Content Snippet
```
## Problem Statement

When using MCP servers that expose many tools, there's currently no way to persistently filter which tools are loaded into context via configuration files. The only options are:
```

---
## 3. Issue/PR: #2803: bug: mcpServers in agent doesn't support SSE server transport
- **URL**: https://github.com/aws/amazon-q-developer-cli/issues/2803
- **Readability**: 0.0/4.0
- **Description**: open by longjun2013

### Content Snippet
```
### Checks

- [x] I have searched [github.com/aws/amazon-q-developer-cli/issues](https://github.com/aws/amazon-q-developer-cli/issues?q=) and there are no duplicates of my issue
- [x] I have run `q do
```

---
## 4. Issue/PR: #73: Supabase MCP
- **URL**: https://github.com/nestauk/discovery_policy_atlas/pull/73
- **Readability**: 0.0/4.0
- **Description**: open by shabrf

### Content Snippet
```
Adds an MCP to allow coding agents read-only access to the supabase tables for development.

# Setup

1. Run `npm install` in `mcp/`
3. Add to Cursor MCP config:

```json
{
  "mcpServers": {
```

---
## 5. Issue/PR: #3346: bug: mcpServers schema requires "command" even for HTTP-based MCP servers
- **URL**: https://github.com/aws/amazon-q-developer-cli/issues/3346
- **Readability**: 0.0/4.0
- **Description**: open by AmshegaR

### Content Snippet
```
### Checks

- [x] I have searched [github.com/aws/amazon-q-developer-cli/issues](https://github.com/aws/amazon-q-developer-cli/issues?q=) and there are no duplicates of my issue
- [x] I have run `q do
```

---
## 6. Code Snippet: cryxnet/DeepMCPAgent :: README.md
- **URL**: https://github.com/cryxnet/DeepMCPAgent/blob/85d19fde2136a2583ba5919d2b1cc14dde96bf66/README.md
- **Readability**: 1.8/4.0
- **Description**: README.md

### Content Snippet
```
<!-- Banner / Title -->
<div align="center">
  <img src="docs/images/icon.png" width="120" alt="DeepMCPAgent Logo"/>

  <h1>🤖 DeepMCPAgent</h1>
  <p><strong>Model-agnostic LangChain/LangGraph agents powered entirely by <a href="https://modelcontextprotocol.io/">MCP</a> tools over HTTP/SSE.</strong></p>

  <!-- Badges -->
  <p>
    <a href="https://cryxnet.github.io/DeepMCPAgent">
...[elided]...

- 🔌 **Zero manual tool wiring** — tools are discovered dynamically from MCP servers (HTTP/SSE)
- 🌐 **External APIs welcome** — connect to remote MCP servers (with headers/auth)
- 🧠 **Model-agnostic** — pass any LangChain chat model instance (OpenAI, Anthropic, Ollama, Groq, local, …)
- ⚡ **DeepAgents (optional)** — if installed, you get a deep agent loop; otherwise robust LangGraph ReAct fallback
- 🛠️ **Typed tool args** — JSON-Schema → Pydantic → LangChain `BaseTool` (typed, validated calls)
- 🧪 **Quality bar** — mypy (strict), ruff, pytest, GitHub Actions, docs

> **MCP first.** Agents shouldn’t hardcode tools — they should **discover** and **call** them. DeepMCPAgent builds that bridge.

---

## 🚀 Installation

Install from [PyPI](https://pypi.org/project/deepmcpagent/):
...[elided]...
```

---
## 7. Code Snippet: TesslateAI/TFrameX :: llms.txt
- **URL**: https://github.com/TesslateAI/TFrameX/blob/dcc815e6f4cb0c50469c30f38e1078d621f12072/llms.txt
- **Readability**: 1.0/4.0
- **Description**: llms.txt

### Content Snippet
```
# TFrameX Framework Complete Reference (LLMs.txt)

## FRAMEWORK OVERVIEW
TFrameX v1.1.0 - Task & Flow Orchestration Framework for eXtensible LLM Systems. Production-ready Python framework for sophisticated multi-agent LLM applications with enhanced MCP integration, comprehensive enterprise features, and powerful CLI tooling.

## CORE ARCHITECTURE
```
TFrameXApp -> TFrameXRuntimeContext -> Engine -> {Agents, Tools, Flows, MCP}
```

...[elided]...
## MCP INTEGRATION COMPLETE

### Server Configuration (servers_config.json)
```json
{
  "mcpServers": {
    "stdio_server": {
      "type": "stdio",
      "command": "python",
      "args": ["server.py"],
      "env": {"KEY": "value"},
      "init_step_timeout": 30.0,
      "tool_call_timeout": 60.0
    },
    "http_server": {
...[elided]...
```

---
## 8. Code Snippet: api7/apisix-mcp :: readme.md
- **URL**: https://github.com/api7/apisix-mcp/blob/f650b9e600e629bac3cf2a57cb3e2e03fdd84d25/readme.md
- **Readability**: 1.0/4.0
- **Description**: readme.md

### Content Snippet
```
[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/api7-apisix-mcp-badge.png)](https://mseep.ai/app/api7-apisix-mcp)

# APISIX Model Context Protocol (MCP) Server
[![smithery badge](https://smithery.ai/badge/@api7/apisix-mcp)](https://smithery.ai/server/@api7/apisix-mcp)

APISIX Model Context Protocol (MCP) server is used to bridge large language models (LLMs) with the APISIX Admin API. It aims to enable natural language-based interaction for viewing and managing resources in APISIX through MCP-compatible AI clients.

https://github.com/user-attachments/assets/081e878c-225e-4ff8-a9c5-5813f4784cfe

## Support Operations
...[elided]...
- `create_or_update_stream_route`: Manage stream routes

### Plugin Operations

- `get_all_plugin_names`: Get all available plugin names
- `get_plugin_info`/`get_plugins_by_type`/`get_plugin_schema`: Retrieve plugins configuration
- `create_plugin_config`/`update_plugin_config`: Manage plugin configurations
- `create_global_rule`/`update_global_rule`: Manage plugin global rules
- `get_plugin_metadata`/`create_or_update_plugin_metadata`/`delete_plugin_metadata`: Manage plugin metadata

### Security Configuration

- `get_secret_by_id`/`create_secret`/`update_secret`: Manage secrets
- `create_or_update_consumer`/`delete_consumer`: Manage consumers
- `get_credential`/`create_or_update_credential`/`delete_credential`/: Manage consumer credentials
...[elided]...
```

---
## 9. Code Snippet: kyopark2014/mcp :: Airbnb.md
- **URL**: https://github.com/kyopark2014/mcp/blob/e62a8478f5e28b0bf89c3308ed4d5c2704d965d0/Airbnb.md
- **Readability**: 0.0/4.0
- **Description**: Airbnb.md

### Content Snippet
```
## Airbnb MCP Server

[Airbnb MCP Server](https://github.com/openbnb-org/mcp-server-airbnb)에 따라 Airbnb를 mcp로 연결할 수 있습니다. [Smithery - Airbnb](https://smithery.ai/server/@openbnb-org/mcp-server-airbnb)에서 config를 가져옵니다. 

config 정보는 아래와 같습니다.

![image](https://github.com/user-attachments/assets/853e1551-e07e-4401-9e8b-052929070c2c)

JSON 정보는 아래와 같습니다. 


config 정보는 아래와 같습니다.

![image](https://github.com/user-attachments/assets/853e1551-e07e-4401-9e8b-052929070c2c)

JSON 정보는 아래와 같습니다. 

```java
{
  "mcpServers": {
    "airbnb": {
      "command": "npx",
      "args": [
        "-y",
        "@openbnb/mcp-server-airbnb",
...[elided]...
```

---
## 10. Code Snippet: shunliz/Machine-Learning :: bm/MCP.md
- **URL**: https://github.com/shunliz/Machine-Learning/blob/4ede37bf85e96ee335fc77ceb9d763d1f4cacb2c/bm/MCP.md
- **Readability**: 0.0/4.0
- **Description**: MCP.md

### Content Snippet
```
# MCP

**Model Context Protocol (MCP)** 是一个开放协议，旨在实现 LLM 应用与外部数据源和工具之间的无缝集成。

无论您是构建 AI 驱动的 IDE、增强聊天界面，还是创建自定义 AI 工作流，MCP 都提供了一种标准化的方式来连接 LLM 与外部世界。

简单来说，MCP 是一种客户端-服务器架构的协议，允许 LLM 应用程序（如 Claude、各种 IDE 等）通过标准化的接口访问外部数据和功能。这解决了 LLM 在实际应用中常见的一些痛点：

- LLM 无法直接访问实时数据（如天气、股票行情等）
- LLM 无法执行外部操作（如发送邮件、控制设备等）
...[elided]...

每个工具都有明确的定义，包括：

- 名称
- 描述
- 输入参数模式（使用 JSON Schema）
- 输出格式

工具设计为由模型控制，但通常需要人类批准才能执行，这保证了安全性。

**提示（Prompts）**

提示是预定义的模板，可以帮助用户完成特定任务。它们可以包含动态部分，嵌入资源上下文，并支持多步工作流。

## **MCP 服务器开发案例：天气服务器**
...[elided]...
```

---

**Summary**: Found 10 results across 2 categories.

---

## Researching: custom mcp server stdio linux
# GitHub Search Results

## 1. Repository: jonigl/mcp-client-for-ollama
- **URL**: https://github.com/jonigl/mcp-client-for-ollama
- **Readability**: 0.0/4.0
- **Description**: A text-based user interface (TUI) client for interacting with MCP servers using Ollama. Features include agent mode, multi-server, dynamic model switching, streaming responses, tool management, human-in-the-loop, thinking mode, model parameters configuration, custom system prompt and saved preferences. Built for developers working with local LLMs.

### Content Snippet
```
A text-based user interface (TUI) client for interacting with MCP servers using Ollama. Features include agent mode, multi-server, dynamic model switching, streaming responses, tool management, human-in-the-loop, thinking mode, model parameters configuration, custom system prompt and saved preferences. Built for developers working with local LLMs.
```

---
## 2. Issue/PR: #15060: fix(core): handle unsupported JSON Schema versions in MCP tool validation
- **URL**: https://github.com/google-gemini/gemini-cli/pull/15060
- **Readability**: 0.0/4.0
- **Description**: open by afarber

### Content Snippet
```
## Summary

MCP servers built with Rust rmcp v0.9.1+ send JSON Schema draft-2020-12, which AJV (the JSON validator) doesn't support by default. This causes tool invocations to fail with "no schema w
```

---
## 3. Issue/PR: #5081: Can't make native image support local STDIO MCP server
- **URL**: https://github.com/spring-projects/spring-ai/issues/5081
- **Readability**: 0.0/4.0
- **Description**: open by asm0dey

### Content Snippet
```
Please do a quick search on GitHub issues first, there might be already a duplicate issue for the one you are about to create.
If the bug is trivial, just go ahead and create the issue. Otherwise, ple
```

---
## 4. Issue/PR: #6066: feat: add Model Context Protocol (MCP) server
- **URL**: https://github.com/Unitech/pm2/pull/6066
- **Readability**: 0.0/4.0
- **Description**: open by elasticdotventures

### Content Snippet
```
## Add MCP Server Support to PM2

This PR adds Model Context Protocol (MCP) server support to PM2, enabling process management through MCP-compatible clients like Claude Code and Codex.

### 🎯 Overvie
```

---
## 5. Issue/PR: #164: Add Linux and ChatMCP config
- **URL**: https://github.com/ahujasid/blender-mcp/pull/164
- **Readability**: 0.0/4.0
- **Description**: open by benoit-cty

### Content Snippet
```
### **User description**

Thanks a lot for this tool !

- Make it explicit that it work under Linux.
- Add documentation on [ChatMCP](https://github.com/daodao97/chatmcp) configuration.

I'm no
```

---
## 6. Issue/PR: #152: fix: add helpful error messages for missing MCP server commands
- **URL**: https://github.com/Nano-Collective/nanocoder/pull/152
- **Readability**: 0.0/4.0
- **Description**: open by JimStenstrom

### Content Snippet
```
## Description

When an MCP server requires a command that isn't installed (like `uvx`, `npx`, etc.), users now get clear error messages with installation instructions instead of confusing ENOENT spaw
```

---
## 7. Code Snippet: OpenAiTx/OpenAiTx :: projects/punkpeye/awesome-mcp-servers/README.md
- **URL**: https://github.com/OpenAiTx/OpenAiTx/blob/5f8085e3cbe2ccb5448866beb75d0e8f97c70dd4/projects/punkpeye/awesome-mcp-servers/README.md
- **Readability**: 2.8/4.0
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
...[elided]...
* [Frameworks](#frameworks)
* [Tips & Tricks](#tips-and-tricks)

## What is MCP?

[MCP](https://modelcontextprotocol.io/) is an open protocol that enables AI models to securely interact with local and remote resources through standardized server implementations. This list focuses on production-ready and experimental MCP servers that extend AI capabilities through file access, database connections, API integrations, and other contextual services.

## Clients

Checkout [awesome-mcp-clients](https://github.com/punkpeye/awesome-mcp-clients/) and [glama.ai/mcp/clients](https://glama.ai/mcp/clients).

> [!TIP]
> [Glama Chat](https://glama.ai/chat) is a multi-modal AI client with MCP support & [AI gateway](https://glama.ai/gateway).

## Tutorials
...[elided]...
```

---
## 8. Code Snippet: wanghaisheng/mcp-server-dataset :: mcp-server-README-example.md
- **URL**: https://github.com/wanghaisheng/mcp-server-dataset/blob/d0f449198876343acc903e85abd0a49c254dcb61/mcp-server-README-example.md
- **Readability**: 1.3/4.0
- **Description**: mcp-server-README-example.md

### Content Snippet
```
# Awesome MCP Servers [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

[![ไทย](https://img.shields.io/badge/Thai-Click-blue)](README-th.md)
[![English](https://img.shields.io/badge/English-Click-yellow)](README.md)
[![繁體中文](https://img.shields.io/badge/繁體中文-點擊查看-orange)](README-zh_TW.md)
[![简体中文](https://img.shields.io/badge/简体中文-点击查看-orange)](README-zh.md)
[![日本語](https://img.shields.io/badge/日本語-クリック-青)](README-ja.md)
[![한국어](https://img.shields.io/badge/한국어-클릭-yellow)](README-ko.md)
[![Discord](https://img.shields.io/discord/1312302100125843476?logo=discord&label=discord)](https://glama.ai/mcp/discord)
[![Subreddit subscribers](https://img.shields.io/reddit/subreddit-subscribers/mcp?style=flat&logo=reddit&label=subreddit)](https://www.reddit.com/r/mcp/)
...[elided]...
### 🔗 <a name="aggregators"></a>Aggregators

Servers for accessing many apps and tools through a single MCP server.

- [julien040/anyquery](https://github.com/julien040/anyquery) 🏎️ 🏠 ☁️ - Query more than 40 apps with one binary using SQL. It can also connect to your PostgreSQL, MySQL, or SQLite compatible database. Local-first and private by design.
- [PipedreamHQ/pipedream](https://github.com/PipedreamHQ/pipedream/tree/master/modelcontextprotocol) ☁️ 🏠 - Connect with 2,500 APIs with 8,000+ prebuilt tools, and manage servers for your users, in your own app.
- [OpenMCP](https://github.com/wegotdocs/open-mcp) 📇 🏠 🍎 🪟 🐧 - Turn a web API into an MCP server in 10 seconds and add it to the open source registry: https://open-mcp.org
- [VeriTeknik/pluggedin-mcp-proxy](https://github.com/VeriTeknik/pluggedin-mcp-proxy)  📇 🏠 - A comprehensive proxy server that combines multiple MCP servers into a single interface with extensive visibility features. It provides discovery and management of tools, prompts, resources, and templates across servers, plus a playground for debugging when building MCP servers.
- [MetaMCP](https://github.com/metatool-ai/metatool-app) 📇 ☁️ 🏠 🍎 🪟 🐧 - MetaMCP is the one unified middleware MCP server that manages your MCP connections with GUI.

### 🎨 <a name="art-and-culture"></a>Art & Culture

Access and explore art collections, cultural heritage, and museum databases. Enables AI models to search and analyze artistic and cultural content.

- [abhiemj/manim-mcp-server](https://github.com/abhiemj/manim-mcp-server) 🐍 🏠 🪟 🐧 - A local MCP server that generates animations using Manim.
...[elided]...
```

---
## 9. Code Snippet: nibzard/daytona-mcp-interpreter :: mcp.txt
- **URL**: https://github.com/nibzard/daytona-mcp-interpreter/blob/966900be4c13b3f03f07639f65a14418f3f19576/mcp.txt
- **Readability**: 2.5/4.0
- **Description**: mcp.txt

### Content Snippet
```
# Example Clients
Source: https://modelcontextprotocol.io/clients

A list of applications that support MCP integrations

This page provides an overview of applications that support the Model Context Protocol (MCP). Each client may support different MCP features, allowing for varying levels of integration with MCP servers.

## Feature support matrix

| Client                               | [Resources] | [Prompts] | [Tools] | [Sampling] | Roots | Notes                                                              |
# Example Clients
Source: https://modelcontextprotocol.io/clients

A list of applications that support MCP integrations

This page provides an overview of applications that support the Model Context Protocol (MCP). Each client may support different MCP features, allowing for varying levels of integration with MCP servers.

## Feature support matrix

| Client                               | [Resources] | [Prompts] | [Tools] | [Sampling] | Roots | Notes                                                              |
| ------------------------------------ | ----------- | --------- | ------- | ---------- | ----- | ------------------------------------------------------------------ |
| [Claude Desktop App][Claude]         | ✅           | ✅         | ✅       | ❌          | ❌     | Full support for all MCP features                                  |
| [5ire][5ire]                         | ❌           | ❌         | ✅       | ❌          | ❌     | Supports tools.                                                    |
| [BeeAI Framework][BeeAI Framework]   | ❌           | ❌         | ✅       | ❌          | ❌     | Supports tools in agentic workflows.                               |
| [Cline][Cline]                       | ✅           | ❌         | ✅       | ❌          | ❌     | Supports tools and resources.                                      |
...[elided]...
```

---
## 10. Code Snippet: johnlindquist/cursor-history :: mcp.md
- **URL**: https://github.com/johnlindquist/cursor-history/blob/7f46707f48cab39e91dfcb7c6ad06901319ad78c/mcp.md
- **Readability**: 2.5/4.0
- **Description**: mcp.md

### Content Snippet
```
<project>
  <source>/Users/johnlindquist/dev/cursor-db-mcp</source>
  <timestamp>20250424-092302</timestamp>
  <command>ffg -y</command>
</project>
<summary>
  Analyzing: /Users/johnlindquist/dev/cursor-db-mcp
  Max file size: 10240KB
  Skipping build artifacts and generated files
Files analyzed: 7
<project>
  <source>/Users/johnlindquist/dev/cursor-db-mcp</source>
  <timestamp>20250424-092302</timestamp>
  <command>ffg -y</command>
</project>
<summary>
  Analyzing: /Users/johnlindquist/dev/cursor-db-mcp
  Max file size: 10240KB
  Skipping build artifacts and generated files
Files analyzed: 7
</summary>
...[elided]...
```

---
## 11. Code Snippet: PostHog/housekeeper :: MCP.md
- **URL**: https://github.com/PostHog/housekeeper/blob/ab556fba6ace689473de67e318504ca600b73e1a/MCP.md
- **Readability**: 1.0/4.0
- **Description**: MCP.md

### Content Snippet
```
# ClickHouse MCP Server Documentation

**Housekeeper runs as an MCP server by default** - no flags needed! This document covers the complete MCP implementation that exposes tools for:
1. Read‑only queries against configurable ClickHouse databases
2. Querying Prometheus metrics for monitoring and correlation

## Installation

### Option 1: Install via go install (Recommended)

...[elided]...
- `--prom-vm-prefix`: Victoria Metrics path prefix (default: "")

### Option 2: Configuration file

- Uses `configs/config.yml` (Viper) — copy and edit `configs/config.yml.sample`.
- You can point to a custom path with `-config /path/to/config.yml` or env `HOUSEKEEPER_CONFIG=/path/to/config.yml`.
- Required keys for ClickHouse: `clickhouse.host`, `clickhouse.port`, `clickhouse.user`, `clickhouse.password`, `clickhouse.database`, `clickhouse.cluster`.
  - The DB user should be read‑only; server enforces queries to `system.*` tables only.
- Required keys for Prometheus: `prometheus.host`, `prometheus.port`.

### Victoria Metrics from Kubernetes

If you need to expose Victoria Metrics from Kubernetes locally:

```bash
...[elided]...
```

---

**Summary**: Found 11 results across 3 categories.

---

## Researching: mcp_config.json environment variables
2025-12-19T19:48:18.137462Z  WARN Rate limit exceeded!
