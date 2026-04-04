import type { ToolDef } from "@2na3k/omfsh-provider";

const MAX_OUTPUT_BYTES = 8 * 1024;

interface BashInput {
  command: string;
  timeoutMs?: number;
}

function cap(s: string): string {
  const buf = Buffer.from(s, "utf8");
  if (buf.byteLength <= MAX_OUTPUT_BYTES) return s;
  return buf.slice(0, MAX_OUTPUT_BYTES).toString("utf8") + `\n...(output truncated at ${MAX_OUTPUT_BYTES} bytes)`;
}

export const bash: ToolDef<BashInput, string> = {
  description: "Run a shell command. stdout and stderr are combined and capped at 8KB.",
  parameters: {
    type: "object",
    properties: {
      command: { type: "string", description: "Shell command to run" },
      timeoutMs: { type: "number", description: "Timeout in milliseconds (default: 30000)" },
    },
    required: ["command"],
  },
  async execute(input: BashInput): Promise<string> {
    const timeout = input.timeoutMs ?? 30_000;

    const proc = Bun.spawn(["bash", "-c", input.command], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const timer = setTimeout(() => proc.kill(), timeout);

    try {
      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);
      await proc.exited;

      const combined = [stdout, stderr].filter(Boolean).join("\n").trim();
      return cap(combined) || `(exit code ${proc.exitCode})`;
    } finally {
      clearTimeout(timer);
    }
  },
};
