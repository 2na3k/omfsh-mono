import { generate } from "@2na3k/omfsh-provider";
import type { ModelId, Message } from "@2na3k/omfsh-provider";
import { ENTITY_EXTRACTION_PROMPT } from "../prompts/entity-extraction.js";
import { upsertEntity, insertRelation } from "../db.js";
import type { Entity, Relation } from "../../shared/types.js";

interface ExtractionResult {
  entities: Entity[];
  relations: Relation[];
}

interface RawExtraction {
  entities: Array<{ name: string; type: string; description?: string }>;
  relations: Array<{ source: string; target: string; label: string }>;
}

export async function extractEntities(
  text: string,
  notebookId: string,
  modelId: ModelId,
): Promise<ExtractionResult> {
  const messages: Message[] = [
    { role: "user", content: ENTITY_EXTRACTION_PROMPT + text },
  ];

  const result = await generate(modelId, messages, {
    system: "You are an entity extraction system. Output only valid JSON, no markdown fences.",
    temperature: 0.1,
    maxTokens: 4000,
  });

  let parsed: RawExtraction;
  try {
    // handle possible markdown code fences
    const cleaned = result.text.replace(/^```(?:json)?\n?/gm, "").replace(/\n?```$/gm, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return { entities: [], relations: [] };
  }

  if (!parsed.entities || !Array.isArray(parsed.entities)) {
    return { entities: [], relations: [] };
  }

  const validTypes = new Set(["person", "org", "concept", "event", "location", "work"]);
  const entities: Entity[] = [];
  const entityNameToId = new Map<string, string>();

  for (const raw of parsed.entities) {
    const type = validTypes.has(raw.type) ? raw.type as Entity["type"] : "concept";
    const id = crypto.randomUUID();
    const entity: Entity = {
      id,
      notebookId,
      name: raw.name,
      type,
      description: raw.description,
    };
    const saved = upsertEntity(entity);
    entities.push(saved);
    entityNameToId.set(raw.name, saved.id);
  }

  const relations: Relation[] = [];
  if (parsed.relations && Array.isArray(parsed.relations)) {
    for (const raw of parsed.relations) {
      const sourceId = entityNameToId.get(raw.source);
      const targetId = entityNameToId.get(raw.target);
      if (!sourceId || !targetId) continue;
      const relation: Relation = {
        id: crypto.randomUUID(),
        notebookId,
        sourceId,
        targetId,
        label: raw.label,
      };
      insertRelation(relation);
      relations.push(relation);
    }
  }

  return { entities, relations };
}
