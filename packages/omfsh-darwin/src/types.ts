import type { ModelId, ToolMap, GenerateResult, Message, ToolResultRecord } from "@2na3k/omfsh-provider";

export type StepResult = GenerateResult;

export enum AgentEventType {
  AgentStart     = "agent.start",
  AgentEnd       = "agent.end",
  TurnStart      = "turn.start",
  TurnEnd        = "turn.end",
  MessageStart   = "message.start",
  MessageDelta   = "message.delta",
  MessageEnd     = "message.end",
  ReasoningStart = "reasoning.start",
  ReasoningDelta = "reasoning.delta",
  ReasoningEnd   = "reasoning.end",
  ToolCallStart  = "tool_call.start",
  ToolCallDelta  = "tool_call.delta",
  ToolCallEnd    = "tool_call.end",
  ToolBatchStart = "tool_batch.start",
  ToolBatchEnd   = "tool_batch.end",
}

export interface AgentContext {
  systemPrompt?: string;
  messages?: Message[];
  tools?: ToolMap;
}

export interface AgentConfig {
  modelId: ModelId;
  maxSteps?: number;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  parallelToolCalls?: boolean; // default: false — uses AI SDK internal execution
}

export interface AgentState {
  context: AgentContext;
  steps: StepResult[];
  totalInputTokens: number;
  totalOutputTokens: number;
  isRunning: boolean;
  isStreaming: boolean;
}

export type LoopYield =
  | { event: AgentEventType.AgentStart;     state: AgentState }
  | { event: AgentEventType.TurnStart;      state: AgentState }
  | { event: AgentEventType.MessageStart;   state: AgentState }
  | { event: AgentEventType.MessageDelta;   delta: string; state: AgentState }
  | { event: AgentEventType.MessageEnd;     state: AgentState }
  | { event: AgentEventType.ReasoningStart; state: AgentState }
  | { event: AgentEventType.ReasoningDelta; delta: string; state: AgentState }
  | { event: AgentEventType.ReasoningEnd;   state: AgentState }
  | { event: AgentEventType.ToolCallStart;  toolCallId: string; toolName: string; state: AgentState }
  | { event: AgentEventType.ToolCallDelta;  toolCallId: string; delta: string; state: AgentState }
  | { event: AgentEventType.ToolCallEnd;    toolCallId: string; toolName: string; input: unknown; output: unknown; state: AgentState }
  | { event: AgentEventType.ToolBatchStart; toolCallIds: string[]; state: AgentState }
  | { event: AgentEventType.ToolBatchEnd;   results: ToolResultRecord[]; state: AgentState }
  | { event: AgentEventType.TurnEnd;        step: StepResult; state: AgentState }
  | { event: AgentEventType.AgentEnd;       state: AgentState };

export interface AgentResult {
  text: string;
  state: AgentState;
}
