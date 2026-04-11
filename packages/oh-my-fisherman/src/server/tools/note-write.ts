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
        section: { type: "string", description: "Section heading (e.g. 'Background', 'Key Findings', 'Analysis'). Use 'References' for the final references section." },
        content: { type: "string", description: "Markdown content for this section. Use [n](#ref-n) inline citation links (e.g. [1](#ref-1)) after claims. For the 'References' section pass an empty string — the sources array generates the anchor list." },
        sources: {
          type: "array",
          description: "Sources used in this section. For 'References' section: pass ALL sources fetched during the session — the tool auto-generates the numbered anchor list.",
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

      // For the References section, auto-generate a numbered anchor list from sources.
      // This lets inline [[n]](#ref-n) citations link directly to the reference entries.
      const isReferences = /^references$/i.test(input.section.trim());
      if (isReferences && input.sources && input.sources.length > 0) {
        const list = input.sources
          .map((s, i) => `<a id="ref-${i + 1}"></a>${i + 1}. [${s.title}](${s.url})`)
          .join("\n");
        body = list;
      }
      // For all other sections: write content as-is — inline [[n]](#ref-n) citations
      // embedded in the text by the model serve as the citation mechanism.

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
