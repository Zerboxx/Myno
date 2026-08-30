import { z } from "zod";

import type { ToolDefinition } from "./types.js";

export const systemInfoTool: ToolDefinition = {
  name: "get_system_info",

  description:
    "Returns basic information about the operating system and Node.js environment.",

  inputSchema: z.object({}),

  async execute() {
    return {
      success: true,

      data: {
        platform: process.platform,
        architecture: process.arch,
        nodeVersion: process.version,
      },
    };
  },
};