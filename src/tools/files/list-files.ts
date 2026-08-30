import { readdir } from "node:fs/promises";
import { z } from "zod";

import type { ToolDefinition } from "../types.js";
import type { Workspace } from "../../workspace/workspace.js";

const inputSchema = z.object({
  path: z
    .string()
    .default(".")
    .describe(
      "Relative path inside the workspace",
    ),
});

type ListFilesInput =
  z.infer<typeof inputSchema>;

export function createListFilesTool(
  workspace: Workspace,
): ToolDefinition {
  return {
    name: "list_files",

    description:
      "Lists files and directories inside the current workspace. Use this to inspect the project structure.",

    inputSchema,

    async execute(input: unknown) {
      const parsedInput =
        inputSchema.parse(input) as ListFilesInput;

      const targetPath =
        workspace.resolve(
          parsedInput.path,
        );

      const entries =
        await readdir(
          targetPath,
          {
            withFileTypes: true,
          },
        );

      return {
        success: true,

        data: entries.map(
          (entry) => ({
            name: entry.name,

            type:
              entry.isDirectory()
                ? "directory"
                : "file",
          }),
        ),
      };
    },
  };
}