import type { ModelId } from "@2na3k/omfsh-provider";
import type { AgentContext } from "@2na3k/omfsh-darwin";

export type UiMessageRole = "user" | "assistant" | "reasoning" | "tool" | "system";

export interface UiMessage {
  id: string;
  role: UiMessageRole;
  text?: string;
  toolName?: string;
  toolInput?: unknown;
  toolOutput?: unknown;
  isStreaming: boolean;
}

export interface Session {
  modelId: ModelId;
  context: AgentContext;
  totalInputTokens: number;
  totalOutputTokens: number;
  messages: UiMessage[];
}

export type AppStatus =
  | { kind: "idle" }
  | { kind: "running"; abortController: AbortController }
  | { kind: "error"; message: string };

export type SlashCommand =
  | { kind: "model_list" }
  | { kind: "model_set"; modelId: string }
  | { kind: "clear" }
  | { kind: "exit" }
  | { kind: "unknown"; raw: string };

export type SlashEffect =
  | { kind: "add_message"; message: UiMessage }
  | { kind: "set_model"; modelId: ModelId }
  | { kind: "clear" }
  | { kind: "open_model_picker" };

export type AgentRunnerEvent =
  | { type: "message_start";   messageId: string }
  | { type: "message_delta";   messageId: string; delta: string }
  | { type: "message_end";     messageId: string }
  | { type: "reasoning_start"; messageId: string }
  | { type: "reasoning_delta"; messageId: string; delta: string }
  | { type: "reasoning_end";   messageId: string }
  | { type: "tool_start";      toolCallId: string; toolName: string; messageId: string }
  | { type: "tool_end";        toolCallId: string; input: unknown; output: unknown }
  | { type: "turn_end";        inputTokens: number; outputTokens: number; context: AgentContext }
  | { type: "agent_end" }
  | { type: "error";           message: string };
