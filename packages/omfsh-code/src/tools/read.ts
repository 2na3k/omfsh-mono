import type { ToolDef } from "@2na3k/omfsh-provider";

interface ReadInput {
  path: string;
  offset?: number;
  limit?: number;
}

export const read: ToolDef<ReadInput, string> = {
  description: "Read a file. Optionally specify a start line (1-based offset) and max lines to read.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Absolute or relative file path to read" },
      offset: { type: "number", description: "Line number to start reading from (1-based, default: 1)" },
      limit: { type: "number", description: "Maximum number of lines to read" },
    },
    required: ["path"],
  },
  async execute(input: ReadInput): Promise<string> {
    const file = Bun.file(input.path);
    const text = await file.text();
    const lines = text.split("\n");

    const start = Math.max(0, (input.offset ?? 1) - 1);
    const end = input.limit != null ? start + input.limit : lines.length;

    return lines.slice(start, end).join("\n");
  },
};
