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
