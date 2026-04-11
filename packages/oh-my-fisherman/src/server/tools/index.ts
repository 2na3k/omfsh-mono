import type { ToolMap, ModelId, ToolDef } from "@2na3k/omfsh-provider";
import { web_search } from "./web-search.js";
import { web_read } from "./web-read.js";
import { google_search } from "./google-search.js";
import { buildSourceSearchTool } from "./source-search.js";
import { buildNoteWriteTool } from "./note-write.js";
import { buildChartWriteTool } from "./chart-write.js";
import { buildEntityExtractTool } from "./entity-extract.js";
import { buildResearchPlanTool } from "./research-plan.js";
import type { Entity, Relation, NoteWriteSource } from "../../shared/types.js";

interface ToolsConfig {
  notebookId: string;
  modelId: ModelId;
  onEntityExtracted?: (entities: Entity[], relations: Relation[]) => void;
}

// Wraps web_search, google_search, web_read so every fetched URL is recorded.
// note_write uses the registry to auto-populate citations.
function buildTrackedToolMap(
  config: ToolsConfig,
  urlRegistry: Map<string, NoteWriteSource>,
): ToolMap {
  const noteWrite = buildNoteWriteTool(config.notebookId);

  // Wrap web_search to capture URLs
  const trackedWebSearch: ToolDef = {
    description: web_search.description,
    parameters: web_search.parameters,
    async execute(input: unknown): Promise<unknown> {
      const results = await (web_search.execute as (i: unknown) => Promise<unknown>)(input) as Array<{ title: string; url: string; snippet: string }>;
      for (const r of results) {
        if (r.url && !urlRegistry.has(r.url)) {
          urlRegistry.set(r.url, { url: r.url, title: r.title || r.url });
        }
      }
      return results;
    },
  };

  // Wrap google_search to capture URLs
  const trackedGoogleSearch: ToolDef = {
    description: google_search.description,
    parameters: google_search.parameters,
    async execute(input: unknown): Promise<unknown> {
      const results = await (google_search.execute as (i: unknown) => Promise<unknown>)(input) as Array<{ title: string; url: string; snippet: string }>;
      for (const r of results) {
        if (r.url && !urlRegistry.has(r.url)) {
          urlRegistry.set(r.url, { url: r.url, title: r.title || r.url });
        }
      }
      return results;
    },
  };

  // Wrap web_read to capture URLs
  const trackedWebRead: ToolDef = {
    description: web_read.description,
    parameters: web_read.parameters,
    async execute(input: unknown): Promise<unknown> {
      const result = await (web_read.execute as (i: unknown) => Promise<unknown>)(input) as { title: string; url: string; content: string };
      if (result.url) {
        urlRegistry.set(result.url, { url: result.url, title: result.title || result.url });
      }
      return result;
    },
  };

  // Wrap note_write:
  // - For the "References" section: merge all tracked URLs so the auto-generated anchor list
  //   is complete even if the model missed some.
  // - For all other sections: pass only model-provided sources (inline citations in the
  //   body text serve as citation mechanism — no auto-appended footnote block).
  const trackedNoteWrite: ToolDef = {
    description: noteWrite.description,
    parameters: noteWrite.parameters,
    execute(input: unknown): unknown {
      const inp = input as { section: string; content: string; sources?: NoteWriteSource[] };
      const isReferences = /^references$/i.test(inp.section.trim());
      const modelSources = inp.sources ?? [];
      let finalSources: NoteWriteSource[];
      if (isReferences) {
        const modelUrls = new Set(modelSources.map((s) => s.url));
        const extraSources = [...urlRegistry.values()].filter((s) => !modelUrls.has(s.url));
        finalSources = [...modelSources, ...extraSources];
      } else {
        finalSources = modelSources;
      }
      return (noteWrite.execute as (i: unknown) => unknown)({ ...inp, sources: finalSources });
    },
  };

  return {
    research_plan: buildResearchPlanTool() as ToolDef,
    web_search: trackedWebSearch,
    google_search: trackedGoogleSearch,
    web_read: trackedWebRead,
    source_search: buildSourceSearchTool(config.notebookId) as ToolDef,
    note_write: trackedNoteWrite,
    chart_write: buildChartWriteTool(config.notebookId) as ToolDef,
    entity_extract: buildEntityExtractTool(config.notebookId, config.modelId, config.onEntityExtracted) as ToolDef,
  };
}

export function buildToolMap(config: ToolsConfig): ToolMap {
  const urlRegistry = new Map<string, NoteWriteSource>();
  return buildTrackedToolMap(config, urlRegistry);
}
