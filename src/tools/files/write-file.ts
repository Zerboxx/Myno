import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import type { ToolDefinition } from "../types.js";
import type { Workspace } from "../../workspace/workspace.js";

const inputSchema = z.object({
  path: z
    .string()
    .min(1)
    .describe(
      "Relative path of the file to create or overwrite inside the workspace",
    ),

  content: z
    .string()
    .describe(
      "Complete text content that should be written to the file",
    ),
});

export function createWriteFileTool(
  workspace: Workspace,
): ToolDefinition {
  return {
    name: "write_file",

    description:
      "Creates a new text file or completely overwrites an existing text file inside the workspace.",

    inputSchema,

    async execute(input: unknown) {
      const parsedInput =
        inputSchema.parse(input);

      const filePath =
        workspace.resolve(
          parsedInput.path,
        );

      const directory =
        path.dirname(filePath);

      await mkdir(
        directory,
        {
          recursive: true,
        },
      );

      await writeFile(
        filePath,
        parsedInput.content,
        "utf8",
      );

      return {
        success: true,

        data: {
          path:
            parsedInput.path,

          bytesWritten:
            Buffer.byteLength(
              parsedInput.content,
              "utf8",
            ),
        },
      };
    },
  };
}