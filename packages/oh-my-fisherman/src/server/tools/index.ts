import type { ToolMap, ModelId } from "@2na3k/omfsh-provider";
import { web_search } from "./web-search.js";
import { web_read } from "./web-read.js";
import { buildSourceSearchTool } from "./source-search.js";
import { buildNoteWriteTool } from "./note-write.js";
import { buildEntityExtractTool } from "./entity-extract.js";
import type { Entity, Relation } from "../../shared/types.js";

interface ToolsConfig {
  notebookId: string;
  modelId: ModelId;
  onEntityExtracted?: (entities: Entity[], relations: Relation[]) => void;
}

export function buildToolMap(config: ToolsConfig): ToolMap {
  return {
    web_search,
    web_read,
    source_search: buildSourceSearchTool(config.notebookId),
    note_write: buildNoteWriteTool(config.notebookId),
    entity_extract: buildEntityExtractTool(config.notebookId, config.modelId, config.onEntityExtracted),
  };
}
