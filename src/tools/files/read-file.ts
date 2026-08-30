import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import type { ToolDefinition } from "../types.js";
import type { Workspace } from "../../workspace/workspace.js";

const MAX_FILE_SIZE = 1024 * 1024; // 1 MB

const inputSchema = z.object({
  path: z
    .string()
    .min(1)
    .describe(
      "Relative path of the file to read inside the workspace",
    ),
});

export function createReadFileTool(
  workspace: Workspace,
): ToolDefinition {
  return {
    name: "read_file",

    description:
      "Reads the text contents of a file inside the current workspace. Use list_files first when you need to discover files.",

    inputSchema,

    async execute(input: unknown) {
      const parsedInput =
        inputSchema.parse(input);

      const filePath =
        workspace.resolve(
          parsedInput.path,
        );

      const fileStat =
        await stat(filePath);

      if (!fileStat.isFile()) {
        throw new Error(
          `Path is not a file: ${parsedInput.path}`,
        );
      }

      if (
        fileStat.size >
        MAX_FILE_SIZE
      ) {
        throw new Error(
          `File is too large to read (${fileStat.size} bytes). Maximum allowed size is ${MAX_FILE_SIZE} bytes.`,
        );
      }

      const extension =
        path.extname(filePath)
          .toLowerCase();

      const blockedExtensions = [
        ".exe",
        ".dll",
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".webp",
        ".mp3",
        ".mp4",
        ".zip",
        ".rar",
        ".7z",
      ];

      if (
        blockedExtensions.includes(
          extension,
        )
      ) {
        throw new Error(
          `Binary file reading is not supported: ${parsedInput.path}`,
        );
      }

      const content =
        await readFile(
          filePath,
          "utf8",
        );

      return {
        success: true,

        data: {
          path:
            parsedInput.path,

          size:
            fileStat.size,

          content,
        },
      };
    },
  };
}