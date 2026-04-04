import type { ToolDef } from "@2na3k/omfsh-provider";

interface GrepInput {
  pattern: string;
  path?: string;
  caseInsensitive?: boolean;
  maxResults?: number;
}

export const grep: ToolDef<GrepInput, string> = {
  description: "Search file contents using ripgrep. Returns matching lines with file paths and line numbers.",
  parameters: {
    type: "object",
    properties: {
      pattern: { type: "string", description: "Regular expression pattern to search for" },
      path: { type: "string", description: "File or directory to search in (defaults to current directory)" },
      caseInsensitive: { type: "boolean", description: "Case-insensitive search (default: false)" },
      maxResults: { type: "number", description: "Maximum number of results to return (default: 50)" },
    },
    required: ["pattern"],
  },
  async execute(input: GrepInput): Promise<string> {
    const args = ["rg", "--line-number", "--with-filename"];

    if (input.caseInsensitive) args.push("--ignore-case");
    if (input.maxResults != null) args.push("--max-count", String(input.maxResults));

    args.push(input.pattern);
    if (input.path) args.push(input.path);

    const proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" });
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    await proc.exited;

    if (proc.exitCode !== 0 && proc.exitCode !== 1) {
      // exit code 1 means no matches (not an error)
      return stderr.trim() || "grep failed with no output";
    }

    return stdout.trim() || "(no matches)";
  },
};
