import type { ToolDef } from "@2na3k/omfsh-provider";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { reportPath } from "../db.js";
import type { ChartSpec } from "../../shared/chart-types.js";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface ChartWriteInput {
  section: string;
  caption?: string;
  spec: ChartSpec;
}

export function buildChartWriteTool(notebookId: string): ToolDef<ChartWriteInput, string> {
  return {
    description:
      "Write a chart (bar, line, pie, scatter) into the research report, " +
      "inserted at the end of an existing section written by note_write. " +
      "Pass the exact section name the chart belongs to — the chart will appear " +
      "inside that section, not as a new heading. " +
      "Use for numeric data worth visualizing — trends, comparisons, distributions. " +
      "For bar/line/pie: data is array of {label, value}. For scatter: array of {x, y, label?}.",
    parameters: {
      type: "object",
      required: ["section", "spec"],
      properties: {
        section: {
          type: "string",
          description: "Exact heading of the existing note_write section this chart belongs to. The chart will be inserted at the end of that section.",
        },
        caption: {
          type: "string",
          description: "Optional caption displayed below the chart",
        },
        spec: {
          type: "object",
          required: ["type", "data"],
          properties: {
            type: {
              type: "string",
              enum: ["bar", "line", "pie", "scatter"],
              description: "Chart type",
            },
            title: { type: "string" },
            xLabel: { type: "string" },
            yLabel: { type: "string" },
            data: {
              type: "array",
              description: "For bar/line/pie: [{label, value}]. For scatter: [{x, y, label?}].",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  value: { type: "number" },
                  x: { type: "number" },
                  y: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    execute(input: ChartWriteInput): string {
      const path = reportPath(notebookId);
      const existing = existsSync(path) ? readFileSync(path, "utf-8") : "";
      const json = JSON.stringify(input.spec);
      const captionLine = input.caption ? `\n*${input.caption}*\n` : "";
      const chartBlock = `\n\`\`\`fisherman-chart\n${json}\n\`\`\`\n${captionLine}`;

      // Find the target section heading and insert the chart at the end of it,
      // before the next ## heading. Falls back to appending if section not found.
      const sectionRegex = new RegExp(`(^##\\s+${escapeRegex(input.section)}\\s*$)`, "m");
      const match = sectionRegex.exec(existing);
      let updated: string;
      if (match) {
        // Find the start of the next ## heading after the matched section
        const afterSection = existing.indexOf("\n## ", match.index + match[0].length);
        if (afterSection !== -1) {
          updated = existing.slice(0, afterSection) + chartBlock + existing.slice(afterSection);
        } else {
          updated = existing + chartBlock;
        }
      } else {
        updated = existing + chartBlock;
      }

      writeFileSync(path, updated, "utf-8");
      return `Wrote ${input.spec.type} chart into section "${input.section}".`;
    },
  };
}
