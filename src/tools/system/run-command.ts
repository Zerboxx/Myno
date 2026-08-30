import { spawn } from "node:child_process";
import { z } from "zod";

import type { ToolDefinition } from "../types.js";
import type { Workspace } from "../../workspace/workspace.js";

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
      const parsedInput =
        inputSchema.parse(input);

      const command =
        parsedInput.command.trim();

      if (
        !ALLOWED_COMMANDS.has(command)
      ) {
        throw new Error(
          `Command is not allowed: ${command}`,
        );
      }

      return await new Promise(
        (resolve, reject) => {
          const child = spawn(
            command,
            {
              cwd:
                workspace.getRoot(),

              shell: true,

              windowsHide: true,
            },
          );

          let stdout = "";
          let stderr = "";

          const timeout = setTimeout(
            () => {
              child.kill();

              reject(
                new Error(
                  `Command timed out after ${TIMEOUT_MS}ms`,
                ),
              );
            },
            TIMEOUT_MS,
          );

          child.stdout.on(
            "data",
            (data: Buffer) => {
              stdout += data.toString();

              if (
                stdout.length >
                MAX_OUTPUT_LENGTH
              ) {
                stdout =
                  stdout.slice(
                    0,
                    MAX_OUTPUT_LENGTH,
                  );
              }
            },
          );

          child.stderr.on(
            "data",
            (data: Buffer) => {
              stderr += data.toString();

              if (
                stderr.length >
                MAX_OUTPUT_LENGTH
              ) {
                stderr =
                  stderr.slice(
                    0,
                    MAX_OUTPUT_LENGTH,
                  );
              }
            },
          );

          child.on(
            "error",
            (error) => {
              clearTimeout(timeout);

              reject(error);
            },
          );

          child.on(
            "close",
            (exitCode) => {
              clearTimeout(timeout);

              resolve({
                success:
                  exitCode === 0,

                data: {
                  command,

                  exitCode,

                  stdout,

                  stderr,
                },
              });
            },
          );
        },
      );
    },
  };
}