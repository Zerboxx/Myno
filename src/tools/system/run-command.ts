import { spawn } from "node:child_process";
import { z } from "zod";

import type { ToolDefinition } from "../types.js";
import type { Workspace } from "../../workspace/workspace.js";
import { SecurityEventLog, type SecurityEvent } from "../../security/security-events.js";

/** Module-level log for terminal security events. */
const terminalSecurityLog = new SecurityEventLog();

/**
 * Validates a command against the allowlist and records security events.
 * Returns null if the command is allowed, or an error message if blocked.
 */
export function validateCommandPolicy(
  command: string,
  log: SecurityEventLog,
  now: () => string,
): string | null {
  const trimmed = command.trim();
  if (trimmed === "") {
    log.recordBlockedCommand(command, "empty command");
    return "Empty command is not allowed";
  }

  if (trimmed.length > 10000) {
    log.recordBlockedCommand(command, "command exceeds maximum length");
    return "Command exceeds maximum length";
  }

  if (!ALLOWED_COMMANDS.has(trimmed)) {
    log.recordBlockedCommand(command, "command not in allowlist");
    return `Command is not allowed: ${trimmed}`;
  }

  // Check for injection attempts
  if (/[;&|`$]/.test(trimmed)) {
    log.recordBlockedCommand(command, "potential command injection");
    return "Command contains potentially dangerous characters";
  }

  // Check for path traversal
  if (/\.\./.test(trimmed)) {
    log.recordBlockedCommand(command, "path traversal attempt");
    return "Command contains path traversal sequences";
  }

  return null;
}

/**
 * Returns all recorded terminal security events.
 * Used for diagnostics and debugging.
 */
export function getTerminalSecurityEvents(): SecurityEvent[] {
  return terminalSecurityLog.list();
}

const inputSchema = z.object({
  command: z
    .string()
    .min(1)
    .describe(
      "A safe predefined development command to execute",
    ),
});

const ALLOWED_COMMANDS = new Set([
  "npm.cmd run typecheck",
  "npm.cmd run build",
  "npm.cmd test",
]);

const MAX_OUTPUT_LENGTH = 50_000;
const TIMEOUT_MS = 60_000;

export function createRunCommandTool(
  workspace: Workspace,
): ToolDefinition {
  return {
    name: "run_command",

    description:
      "Executes a safe predefined development command inside the current workspace. Available commands: npm.cmd run typecheck, npm.cmd run build, npm.cmd test.",

    inputSchema,

    async execute(input: unknown) {
      const parsedInput = inputSchema.parse(input);

      const command = parsedInput.command.trim();

      if (!ALLOWED_COMMANDS.has(command)) {
        throw new Error(`Command is not allowed: ${command}`);
      }

      // Check if run_command is enabled via environment variable
      if (process.env.ALLOW_RUN_COMMAND !== "1") {
        return {
          success: false,
          errorType: "PERMISSION",
          tool: "run_command",
          error:
            "run_command tool is disabled. Set ALLOW_RUN_COMMAND=1 to enable.",
        };
      }

      return await new Promise((resolve, reject) => {
        const child = spawn(command, {
          cwd: workspace.getRoot(),
          shell: true,
          windowsHide: true,
        });

        let stdout = "";
        let stderr = "";

        const timeout = setTimeout(() => {
          child.kill();
          reject(new Error(`Command timed out after ${TIMEOUT_MS}ms`));
        }, TIMEOUT_MS);

        child.stdout.on("data", (data: Buffer) => {
          stdout += data.toString();

          if (stdout.length > MAX_OUTPUT_LENGTH) {
            stdout = stdout.slice(0, MAX_OUTPUT_LENGTH);
          }
        });

        child.stderr.on("data", (data: Buffer) => {
          stderr += data.toString();

          if (stderr.length > MAX_OUTPUT_LENGTH) {
            stderr = stderr.slice(0, MAX_OUTPUT_LENGTH);
          }
        });

        child.on("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        child.on("close", (exitCode) => {
          clearTimeout(timeout);
          resolve({
            success: exitCode === 0,
            data: {
              command,
              exitCode,
              stdout,
              stderr,
            },
          });
        });
      });
    },
  };
}