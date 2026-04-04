export enum ModelProvider {
  OpenAI = "openai",
  Anthropic = "anthropic",
  Google = "google",
  OpenAICompatible = "openai-compatible",
  OpenCodeZen = "opencode-zen",
}

export interface ProviderConfig {
  provider: ModelProvider;
  apiKey?: string;
  baseURL?: string;
}

export interface OpenAICompatibleConfig extends ProviderConfig {
  provider: ModelProvider.OpenAICompatible;
  baseURL: string;
  name?: string;
}

export interface OpenCodeZenConfig extends ProviderConfig {
  provider: ModelProvider.OpenCodeZen;
  baseURL?: string;
}

export interface AnthropicConfig extends ProviderConfig {
  provider: ModelProvider.Anthropic;
}

export interface GoogleConfig extends ProviderConfig {
  provider: ModelProvider.Google;
}

export interface ModelOptions {
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
}

export interface TokenUsage {
  inputTokens: number | undefined;
  outputTokens: number | undefined;
  totalTokens: number | undefined;
}

export type FinishReason = "stop" | "length" | "content-filter" | "tool-calls" | "error" | "other";

export interface ResponseMeta {
  id: string;
  modelId: string;
  timestamp: Date;
}

export interface ProviderResponse<T> {
  data: T;
  usage?: TokenUsage;
  finishReason?: FinishReason;
  meta?: ResponseMeta;
  warnings?: string[];
}

export interface Provider {
  generateText(
    prompt: string,
    options: ModelOptions,
  ): Promise<ProviderResponse<string>>;
  streamText(
    prompt: string,
    options: ModelOptions,
  ): Promise<AsyncIterable<string>>;
  embed(
    text: string,
    options: ModelOptions,
  ): Promise<ProviderResponse<number[]>>;
}

export type AnyProviderConfig =
  | ProviderConfig
  | OpenAICompatibleConfig
  | OpenCodeZenConfig
  | AnthropicConfig
  | GoogleConfig;

// ---------- Message types ----------

export interface TextPart {
  type: "text";
  text: string;
}

export interface ReasoningPart {
  type: "reasoning";
  text: string;
}

export interface ToolCallPart {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  input: unknown;
}

export interface ToolResultPart {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  output: unknown;
}

export interface SystemMessage {
  role: "system";
  content: string;
}

export interface UserMessage {
  role: "user";
  content: string;
}

export interface AssistantMessage {
  role: "assistant";
  content: Array<TextPart | ReasoningPart | ToolCallPart>;
}

export interface ToolMessage {
  role: "tool";
  content: Array<ToolResultPart>;
}

export type Message = SystemMessage | UserMessage | AssistantMessage | ToolMessage;

// ---------- Tool types ----------

export interface ToolDef<TInput = unknown, TOutput = unknown> {
  description: string;
  parameters: Record<string, unknown>; // JSON Schema object
  execute: (input: TInput) => Promise<TOutput> | TOutput;
}

export type ToolMap = Record<string, ToolDef>;

// ---------- Generate types ----------

export interface GenerateOptions {
  system?: string;
  tools?: ToolMap;
  temperature?: number;
  maxTokens?: number;
}

export interface ToolCallRecord {
  toolCallId: string;
  toolName: string;
  input: unknown;
}

export interface ToolResultRecord {
  toolCallId: string;
  toolName: string;
  output: unknown;
}

export interface GenerateResult {
  text: string;
  reasoning?: string;
  toolCalls: ToolCallRecord[];
  toolResults: ToolResultRecord[];
  finishReason: FinishReason;
  inputTokens: number;
  outputTokens: number;
  responseMessages: Message[];
}

// ---------- Stream chunk types ----------

export type StreamChunk =
  | { type: "text-start" }
  | { type: "text-delta"; delta: string }
  | { type: "text-end" }
  | { type: "reasoning-start" }
  | { type: "reasoning-delta"; delta: string }
  | { type: "reasoning-end" }
  | { type: "tool-call-start"; toolCallId: string; toolName: string }
  | { type: "tool-call-delta"; toolCallId: string; delta: string }
  | { type: "tool-call-end"; toolCallId: string; toolName: string; input: unknown; output: unknown }
  | { type: "finish"; result: GenerateResult }
