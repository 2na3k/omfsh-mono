import { dirname } from "node:path";
import { mkdir } from "node:fs/promises";
import type { ToolDef } from "@2na3k/omfsh-provider";

interface WriteInput {
  path: string;
  content: string;
  createDirs?: boolean;
}

export const write: ToolDef<WriteInput, string> = {
  description: "Write content to a file. Creates parent directories by default.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "File path to write to" },
      content: { type: "string", description: "Content to write" },
      createDirs: { type: "boolean", description: "Create parent directories if they don't exist (default: true)" },
    },
    required: ["path", "content"],
  },
  async execute(input: WriteInput): Promise<string> {
    const createDirs = input.createDirs ?? true;

    if (createDirs) {
      const dir = dirname(input.path);
      await mkdir(dir, { recursive: true });
    }

    await Bun.write(input.path, input.content);
    return `Written ${Buffer.byteLength(input.content, "utf8")} bytes to ${input.path}`;
  },
};
