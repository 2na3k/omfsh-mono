import type { ToolDef, ModelId } from "@2na3k/omfsh-provider";
import { extractEntities } from "../services/entity-extractor.js";
import type { Entity, Relation } from "../../shared/types.js";

interface EntityExtractInput {
  text: string;
}

interface EntityExtractOutput {
  entities: Entity[];
  relations: Relation[];
}

// side-effect callback for WS notification
type OnExtracted = (entities: Entity[], relations: Relation[]) => void;

export function buildEntityExtractTool(
  notebookId: string,
  modelId: ModelId,
  onExtracted?: OnExtracted,
): ToolDef<EntityExtractInput, EntityExtractOutput> {
  return {
    description: "Extract named entities (people, orgs, concepts, events, locations, works) and their relationships from text. Use this when processing source material or research findings.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "The text passage to extract entities from" },
      },
      required: ["text"],
    },
    async execute(input: EntityExtractInput): Promise<EntityExtractOutput> {
      const result = await extractEntities(input.text, notebookId, modelId);
      if (onExtracted && (result.entities.length > 0 || result.relations.length > 0)) {
        onExtracted(result.entities, result.relations);
      }
      return result;
    },
  };
}
