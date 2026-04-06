// ---- Shared types between client and server ----

// UI message shape (mirrors omfsh-code pattern)
export interface UiMessage {
  id: string;
  role: "user" | "assistant" | "reasoning" | "tool" | "log" | "error";
  text?: string;
  toolName?: string;
  toolInput?: unknown;
  toolOutput?: unknown;
  isStreaming: boolean;
}

// Notebook
export interface Notebook {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// Source metadata
export interface SourceMeta {
  id: string;
  notebookId: string;
  type: "pdf" | "url" | "text";
  title: string;
  url?: string;
  pageCount?: number;
  chunkCount: number;
  createdAt: string;
}

// Entity + Relation for knowledge graph
export interface Entity {
  id: string;
  notebookId: string;
  name: string;
  type: "person" | "org" | "concept" | "event" | "location" | "work";
  description?: string;
}

export interface Relation {
  id: string;
  notebookId: string;
  sourceId: string;
  targetId: string;
  label: string;
}

// ---- WebSocket protocol ----

export type ClientMessage =
  | { type: "research.start"; notebookId: string; prompt: string; modelId?: string }
  | { type: "research.cancel"; notebookId: string };

export type ServerMessage =
  | { type: "agent.event"; notebookId: string; event: SerializedAgentEvent }
  | { type: "source.ingested"; notebookId: string; source: SourceMeta }
  | { type: "entity.extracted"; notebookId: string; entities: Entity[]; relations: Relation[] }
  | { type: "report.updated"; notebookId: string; markdown: string }
  | { type: "error"; message: string };

// Serialized agent events (stripped of AgentState to keep payloads small)
export type SerializedAgentEvent =
  | { event: "agent.start" }
  | { event: "agent.end" }
  | { event: "turn.start" }
  | { event: "turn.end"; inputTokens: number; outputTokens: number }
  | { event: "message.start" }
  | { event: "message.delta"; delta: string }
  | { event: "message.end" }
  | { event: "reasoning.start" }
  | { event: "reasoning.delta"; delta: string }
  | { event: "reasoning.end" }
  | { event: "tool_call.start"; toolCallId: string; toolName: string }
  | { event: "tool_call.delta"; toolCallId: string; delta: string }
  | { event: "tool_call.end"; toolCallId: string; toolName: string; input: unknown; output: unknown }
  | { event: "tool_batch.start"; toolCallIds: string[] }
  | { event: "tool_batch.end" };
