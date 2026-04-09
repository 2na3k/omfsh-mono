import type { ToolDef } from "@2na3k/omfsh-provider";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { reportPath } from "../db.js";
import type { NoteWriteSource } from "../../shared/types.js";

interface NoteWriteInput {
  section: string;
  content: string;
  sources?: NoteWriteSource[];
}

export function buildNoteWriteTool(notebookId: string): ToolDef<NoteWriteInput, string> {
  return {
    description: "Write a section to the research report. Use descriptive section names. Content should be markdown.",
    parameters: {
      type: "object",
      properties: {
        section: { type: "string", description: "Section heading (e.g. 'Background', 'Key Findings', 'Analysis')" },
        content: { type: "string", description: "Markdown content for this section" },
        sources: {
          type: "array",
          description: "Sources used in this section — will appear as a footnote in the report",
          items: {
            type: "object",
            properties: {
              url: { type: "string", description: "Source URL" },
              title: { type: "string", description: "Human-readable title for the source" },
            },
            required: ["url", "title"],
          },
        },
      },
      required: ["section", "content"],
    },
    execute(input: NoteWriteInput): string {
      const path = reportPath(notebookId);
      const existing = existsSync(path) ? readFileSync(path, "utf-8") : "";

      let body = input.content;
      if (input.sources && input.sources.length > 0) {
        const links = input.sources.map((s) => `[${s.title}](${s.url})`).join(" · ");
        body = `${body}\n\n> **Sources:** ${links}`;
      }

      const newSection = `\n## ${input.section}\n\n${body}\n`;
      // Replace existing section if present, otherwise append
      const sectionRegex = new RegExp(
        `\\n## ${input.section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n[\\s\\S]*?(?=\\n## |$)`,
      );
      const updated = sectionRegex.test(existing)
        ? existing.replace(sectionRegex, newSection)
        : existing + newSection;
      writeFileSync(path, updated, "utf-8");
      return `Wrote section "${input.section}" to report.`;
    },
  };
}
