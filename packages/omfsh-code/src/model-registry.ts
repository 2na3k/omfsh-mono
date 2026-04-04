import { MODELS } from "@2na3k/omfsh-provider";
import type { ModelId } from "@2na3k/omfsh-provider";

export function listModels(): ModelId[] {
  return Object.keys(MODELS) as ModelId[];
}

export function isValidModelId(id: string): id is ModelId {
  return id in MODELS;
}

export function formatModelLabel(id: ModelId): string {
  const def = MODELS[id];
  return `${id}  (${def.provider}, ctx: ${def.contextWindow.toLocaleString()})`;
}
