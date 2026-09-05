# Roblox AI Studio

A local AI development agent for **Roblox Studio**. Describe what you want in
plain language (Arabic and English) and the agent plans, builds, scripts,
and verifies it live in Roblox Studio through the Studio MCP bridge — running
entirely on your machine against a local Ollama model.

## Features

- **Full Roblox scope** — world/environment, UI, Luau scripting, NPC/AI,
  combat, systems (economy, inventory, quests, saving), networking, debugging,
  playtesting. One deterministic skill catalog routes any request.
- **Live Studio integration** — inspects and edits the real place through the
  Roblox Studio MCP plugin (auto-discovery of the active Studio session and
  automatic stale-session recovery).
- **Persistent project memory** — every task is summarized and stored to
  `data/memory.json`; recall surfaces previously built artifacts and standing
  user rules (e.g. "do exactly what I ask") into the agent's context, so
  future sessions reuse existing content instead of duplicating it.
- **Outcome-first engineering** — plans recognize build vs. refinement vs.
  full redesign, keep exact user scope, and verify results in the live place.
- **Safety by default** — server-authoritative gameplay, server-side remote
  validation, Arabic read-only requests block destructive tooling, and
  duplicate-artifact prevention is enforced by the skills and memory.

## Requirements

- Windows + **Roblox Studio** with the Roblox Studio MCP plugin installed
  (see `%LOCALAPPDATA%\Roblox\mcp.bat`), or a custom launcher via
  `ROBUX_MCP_COMMAND` / `ROBUX_MCP_ARGS`.
- **[Ollama](https://ollama.com)** running locally with the model(s) listed in
  `config/models.json` (pull with `ollama pull <model>` if the health check
  reports any missing).

## Setup

```bash
npm install
cp .env.example .env   # adjust OLLAMA_BASE_URL / ROBUX_MCP_* if needed
```

## Usage

```bash
npm run dev            # start the interactive terminal agent
```

Then type your request, e.g. `اعمل NPC يطارد اللاعب` or `create a red line
that kills the player on touch`.

CLI extras:

- `memory:list` — show stored memory entries
- `memory:search <q>` — search memory
- `memory:clear` — wipe memory
- `memory:on` / `memory:off` — toggle memory
- `exit` / `quit` — stop the agent

Memory file: `data/memory.json` (override with `MEMORY_FILE`; cap with
`MEMORY_MAX_ENTRIES`, default 500).

## Development

```bash
npm run dev          # dev server (tsx)
npm run build        # compile to dist/
npm start            # run compiled build
npm run typecheck    # tsc --noEmit
npm test             # node test runner over src/**/*.test.ts
```

## Project layout

- `src/agent/` — Agent state machine, multilingual request planning, skill catalog
- `src/agent/skills/` — static declarative skill catalog + deterministic selector
- `src/memory/` — pure recall/ranking + persistent file-backed memory store
- `src/tools/` — local tools and Roblox Studio MCP client/tools
- `src/router/` — model router across configured Ollama models
- `config/models.json` — model configuration

## License

MIT