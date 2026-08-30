import "dotenv/config";

import { createInterface } from "node:readline/promises";

import {
  stdin as input,
  stdout as output,
} from "node:process";

import { existsSync } from "node:fs";

import { homedir } from "node:os";

import { join } from "node:path";

import { createRunCommandTool } from "./tools/system/run-command.js";
import { createReadFileTool } from "./tools/files/read-file.js";
import { createWriteFileTool } from "./tools/files/write-file.js";
import { createListFilesTool } from "./tools/files/list-files.js";

import { createWorkspace } from "./workspace/index.js";

import { Agent } from "./agent.js";

import { MemoryStore } from "./memory/memory-store.js";
import type { MemoryEntry } from "./memory/types.js";

import { OllamaProvider } from "./providers/ollama.js";

import { ModelRouter } from "./router/model-router.js";

import { ToolRegistry } from "./tools/registry.js";

import { systemInfoTool } from "./tools/system-info.js";

import {
  RobloxMCPClient,
} from "./tools/roblox/mcp-client.js";

import {
  createRobloxMCPTools,
} from "./tools/roblox/mcp-tools.js";

import modelConfig from "../config/models.json" with {
  type: "json",
};

/* ============================================================================
 * STARTUP HEALTH CHECKS
 *
 * Non-blocking by design: a failed check prints actionable guidance and
 * lets the agent continue with whatever is available (local tools only)
 * instead of aborting startup.
 * ========================================================================== */

/**
 * Verify Ollama is reachable and every model referenced in
 * config/models.json is actually installed. Prints the exact
 * `ollama pull` command for any missing model.
 */
async function checkOllamaHealth(
  ollama: OllamaProvider,
  models: typeof modelConfig.models,
): Promise<void> {
  const baseUrl =
    process.env.OLLAMA_BASE_URL ??
    "http://127.0.0.1:11434";

  console.log(
    `\n🧪 Ollama health check (${baseUrl})...`,
  );

  let installed: string[];

  try {
    installed = await ollama.listModels();
  } catch (error) {
    console.warn(
      "⚠️ Ollama unreachable at " +
        `${baseUrl}.`,
    );

    console.warn(
      `   ${error instanceof Error ? error.message : String(error)}`,
    );

    console.warn(
      "   Start Ollama and pull the configured model(s), then restart the agent.",
    );

    return;
  }

  if (installed.length === 0) {
    console.warn(
      "⚠️ Ollama is reachable but has no models installed.",
    );

    console.warn(
      `   Install the configured model(s): ${models.map((entry) => entry.model).join(", ")}`,
    );

    return;
  }

  const missing = models.filter((entry) => {
    const expected = entry.model.replace(/:latest$/, "");

    return !installed.some(
      (name) =>
        name === entry.model ||
        name.startsWith(`${expected}:`),
    );
  });

  if (missing.length > 0) {
    console.warn(
      "⚠️ Configured model(s) not found in Ollama:",
    );

    for (const entry of missing) {
      console.warn(
        `   - ${entry.model} (provider: ${entry.provider})`,
      );
    }

    console.warn(
      `   Installed: ${installed.join(", ") || "(none)"}`,
    );

    console.warn(
      `   Fix with: ollama pull ${missing[0]!.model}`,
    );

    return;
  }

  console.log(
    `✅ All configured model(s) available: ${models.map((entry) => entry.model).join(", ")}`,
  );
}

/**
 * Verify the Roblox Studio MCP plugin launcher exists at the path the
 * runtime spawns it from ("%LOCALAPPDATA%\Roblox\mcp.bat"), unless a
 * custom ROBUX_MCP_COMMAND is configured.
 */
function checkRobloxMCPSetup(): void {
  if (process.env.ROBUX_MCP_COMMAND) {
    console.log(
      "✅ Roblox Studio MCP uses a custom command (ROBUX_MCP_COMMAND).",
    );

    return;
  }

  const localAppData =
    process.env.LOCALAPPDATA ??
    join(homedir(), "AppData", "Local");

  const expectedPath = join(
    localAppData,
    "Roblox",
    "mcp.bat",
  );

  if (existsSync(expectedPath)) {
    console.log(
      `✅ Roblox Studio MCP plugin found: ${expectedPath}`,
    );

    return;
  }

  console.warn(
    `⚠️ Roblox Studio MCP plugin NOT found (expected ${expectedPath}).`,
  );

  console.warn(
    "   Install the Roblox Studio MCP plugin and start Studio,",
  );

  console.warn(
    "   or set ROBUX_MCP_COMMAND / ROBUX_MCP_ARGS to a custom launcher.",
  );
}

function printMemoryEntries(
  entries: MemoryEntry[],
): void {
  console.log(
    "\n🧠 PROJECT MEMORY",
  );

  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );

  if (entries.length === 0) {
    console.log(
      "(no entries match)",
    );
  } else {
    for (const entry of entries) {
      const when =
        entry.updatedAt.slice(0, 10);

      console.log(
        `• [${entry.type}] ${entry.content} (hits: ${entry.hitCount}, ${when})`,
      );
    }
  }

  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
  );
}

async function main() {
  console.log("🤖 Roblox AI Studio");
  console.log("Agent Core starting...\n");

  // ─────────────────────────────────────────────
  // AI Provider
  // ─────────────────────────────────────────────

  const ollama = new OllamaProvider();

  await checkOllamaHealth(
    ollama,
    modelConfig.models,
  );

  // ─────────────────────────────────────────────
  // Model Router
  // ─────────────────────────────────────────────

  const router = new ModelRouter(
    modelConfig.models,
  );

  router.registerProvider(ollama);

  console.log(
    "🧠 Model Router initialized.",
  );

  // ─────────────────────────────────────────────
  // Workspace
  // ─────────────────────────────────────────────

  const workspace = createWorkspace();

  console.log(
    `📁 Workspace: ${workspace.getRoot()}`,
  );

  // ─────────────────────────────────────────────
  // Persistent Memory
  // ─────────────────────────────────────────────

  const memory = new MemoryStore();

  console.log(
    `🧠 Memory: ${memory.file} (${await memory.count()} entries)` +
      (memory.isEnabled ? "" : " — DISABLED"),
  );

  console.log(
    "   Commands: memory:list, memory:search <q>, memory:clear, memory:on, memory:off",
  );

  // ─────────────────────────────────────────────
  // Tool Registry
  // ─────────────────────────────────────────────

  const tools = new ToolRegistry();

  // ─────────────────────────────────────────────
  // System tools
  // ─────────────────────────────────────────────

  tools.register(systemInfoTool);

  // ─────────────────────────────────────────────
  // File tools
  // ─────────────────────────────────────────────

  tools.register(
    createListFilesTool(workspace),
  );

  tools.register(
    createReadFileTool(workspace),
  );

  tools.register(
    createWriteFileTool(workspace),
  );

  // ─────────────────────────────────────────────
  // Command tool
  // ─────────────────────────────────────────────

  tools.register(
    createRunCommandTool(workspace),
  );

  console.log(
    "\n🔧 Core Tool Registry initialized.",
  );

  // ─────────────────────────────────────────────
  // Roblox Studio MCP
  // ─────────────────────────────────────────────

  const robloxMCP =
    new RobloxMCPClient();

  checkRobloxMCPSetup();

  try {
    console.log(
      "\n🔌 Connecting to Roblox Studio MCP...",
    );

    await robloxMCP.connect();

    console.log(
      "✅ Connected to Roblox Studio MCP.",
    );

    console.log(
      "\n🎮 Discovering Roblox Studio tools...",
    );

    const robloxTools =
      await createRobloxMCPTools(
        robloxMCP,
      );

    for (const tool of robloxTools) {
      tools.register(tool);
    }

    console.log(
      `✅ Registered ${robloxTools.length} Roblox MCP tools.`,
    );

    if (robloxTools.length > 0) {
      console.log(
        "\nRoblox Studio tools:",
      );

      for (const tool of robloxTools) {
        console.log(
          `  ✓ ${tool.name}`,
        );
      }
    }
  } catch (error) {
    console.error(
      "\n⚠️ Roblox Studio MCP connection failed.",
    );

    console.error(error);

    console.log(
      "\nThe agent will continue with local tools only.",
    );

    console.log(
      "Install the Roblox Studio MCP plugin into Studio, open Studio,",
    );

    console.log(
      "and restart the agent to enable Roblox building/verification.",
    );
  }

  // ─────────────────────────────────────────────
  // Show all registered tools
  // ─────────────────────────────────────────────

  console.log(
    "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );

  console.log(
    "🧰 AVAILABLE AGENT TOOLS",
  );

  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );

  for (const registeredTool of tools.listRegistered()) {
    console.log(
      `✓ ${registeredTool.tool.name} [${registeredTool.group}]`,
    );
  }

  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );

  // ─────────────────────────────────────────────
  // Agent
  // ─────────────────────────────────────────────

  const agent = new Agent(
    router,
    tools,
    memory,
  );

  console.log(
    "\n🚀 Agent ready!",
  );

  console.log(
    "Type your request below.",
  );

  console.log(
    "Type 'exit' or 'quit' to close the agent.\n",
  );

  // ─────────────────────────────────────────────
  // Interactive Terminal
  // ─────────────────────────────────────────────

  const rl = createInterface({
    input,
    output,
    terminal: !!process.stdout.isTTY,
  });

  try {
    while (true) {
      let userMessage;

      try {
        userMessage =
          (
            await rl.question(
              "You > ",
            )
          ).trim();
      } catch (error) {
        /**
         * A rejection with code ERR_USE_AFTER_CLOSE means stdin reached
         * EOF and readline closed itself. This happens in non-interactive
         * (piped) use when the input ends without an explicit "exit".
         * Treat it as a clean shutdown instead of a fatal error.
         */
        const code =
          (error as { code?: string })
            .code;

        if (code === "ERR_USE_AFTER_CLOSE") {
          break;
        }

        throw error;
      }

      if (!userMessage) {
        continue;
      }

      if (
        userMessage.toLowerCase() ===
          "exit" ||
        userMessage.toLowerCase() ===
          "quit"
      ) {
        console.log(
          "\n👋 Goodbye!",
        );

        break;
      }

      const command =
        userMessage.toLowerCase();

      if (
        command ===
        "memory:list"
      ) {
        printMemoryEntries(
          await memory.list(),
        );

        continue;
      }

      if (
        command.startsWith(
          "memory:search ",
        )
      ) {
        const query =
          userMessage
            .slice(
              "memory:search "
                .length,
            )
            .trim();

        printMemoryEntries(
          await memory.search(
            query,
          ),
        );

        continue;
      }

      if (
        command ===
        "memory:clear"
      ) {
        const removed =
          await memory.clear();

        console.log(
          `\n🧠 Memory cleared (removed ${removed} entries).`,
        );

        continue;
      }

      if (
        command ===
          "memory:on" ||
        command ===
          "memory:off"
      ) {
        memory.setEnabled(
          command ===
            "memory:on",
        );

        console.log(
          `\n🧠 Memory ${memory.isEnabled ? "enabled" : "disabled"}.`,
        );

        continue;
      }

      console.log(
        "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      );

      try {
        /*
         * IMPORTANT:
         *
         * We intentionally do NOT force
         * capability = "chat" here.
         *
         * The Agent is responsible for
         * deciding which capability / tool
         * groups are appropriate for the
         * user's request.
         *
         * Examples:
         *
         * "Read the main server script"
         *   → Roblox inspection
         *
         * "Create a house"
         *   → Roblox building
         *
         * "Test the game"
         *   → Roblox execution
         *
         * "Fix src/agent/agent.ts"
         *   → Filesystem
         */

        const printedResponse = {
          any: false,
        };

        const response =
          await agent.run(
            userMessage,
            {
              onToken: (delta) => {
                if (
                  !printedResponse.any
                ) {
                  printedResponse.any =
                    true;

                  console.log(
                    "\n🤖 AGENT RESPONSE\n",
                  );
                }

                process.stdout.write(
                  delta,
                );
              },
            },
          );

        if (!printedResponse.any) {
          console.log(
            "\n🤖 AGENT RESPONSE\n",
          );

          console.log(
            response.content,
          );
        }

        console.log(
          "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        );

        console.log(
          `Model: ${response.model}`,
        );

        console.log(
          `Provider: ${response.provider}`,
        );

        console.log(
          `Task ID: ${response.taskId}`,
        );

        console.log(
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
        );
      } catch (error) {
        console.error(
          "\n❌ Agent failed:",
        );

        console.error(error);

        console.log();
      }
    }
  } finally {
    rl.close();

    // ─────────────────────────────────────────
    // Close Roblox MCP connection
    // ─────────────────────────────────────────

    try {
      await robloxMCP.close();

      console.log(
        "\n🔌 Roblox Studio MCP disconnected.",
      );
    } catch (error) {
      console.error(
        "\n⚠️ Failed to close Roblox MCP:",
      );

      console.error(error);
    }
  }
}

main().catch((error) => {
  console.error(
    "\n❌ Fatal error:",
  );

  console.error(error);

  process.exit(1);
});