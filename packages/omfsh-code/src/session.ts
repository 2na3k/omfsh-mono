import type { ModelId } from "@2na3k/omfsh-provider";
import type { AgentContext } from "@2na3k/omfsh-darwin";
import { DEFAULT_MODEL_ID, SYSTEM_PROMPT } from "./constants.js";
import type { Session, UiMessage } from "./types.js";

export function createSession(opts?: { modelId?: ModelId }): Session {
  return {
    modelId: opts?.modelId ?? DEFAULT_MODEL_ID,
    context: { systemPrompt: SYSTEM_PROMPT, messages: [] },
    totalInputTokens: 0,
    totalOutputTokens: 0,
    messages: [],
  };
}

export function clearSession(s: Session): Session {
  return {
    ...s,
    context: { systemPrompt: s.context.systemPrompt, messages: [] },
    totalInputTokens: 0,
    totalOutputTokens: 0,
    messages: [],
  };
}

export function setModel(s: Session, id: ModelId): Session {
  return { ...s, modelId: id };
}

export function appendUiMessage(s: Session, msg: UiMessage): Session {
  return { ...s, messages: [...s.messages, msg] };
}

export function patchUiMessage(s: Session, id: string, patch: Partial<UiMessage>): Session {
  return {
    ...s,
    messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
  };
}

export function updateTokenCounts(s: Session, input: number, output: number): Session {
  return {
    ...s,
    totalInputTokens: s.totalInputTokens + input,
    totalOutputTokens: s.totalOutputTokens + output,
  };
}

export function syncContext(s: Session, ctx: AgentContext): Session {
  return { ...s, context: ctx };
}
