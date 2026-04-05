import type { ToolDef } from "@2na3k/omfsh-provider";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { reportPath } from "../db.js";

interface NoteWriteInput {
  section: string;
  content: string;
}

export function buildNoteWriteTool(notebookId: string): ToolDef<NoteWriteInput, string> {
  return {
    description: "Write a section to the research report. Use descriptive section names. Content should be markdown.",
    parameters: {
      type: "object",
      properties: {
        section: { type: "string", description: "Section heading (e.g. 'Background', 'Key Findings', 'Analysis')" },
        content: { type: "string", description: "Markdown content for this section" },
      },
      required: ["section", "content"],
    },
    execute(input: NoteWriteInput): string {
      const path = reportPath(notebookId);
      const existing = existsSync(path) ? readFileSync(path, "utf-8") : "";
      const newSection = `\n## ${input.section}\n\n${input.content}\n`;
      writeFileSync(path, existing + newSection, "utf-8");
      return `Wrote section "${input.section}" to report.`;
    },
  };
}
