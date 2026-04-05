import { ModelProvider } from "./types.js";

type ZenBackend = "openai-compatible" | "anthropic";

export interface ModelDefinition {
  provider: ModelProvider;
  baseURL?: string;
  zenBackend?: ZenBackend;
  contextWindow: number;
  maxTokens: number;
}

const LOCAL_ENDPOINT = "http://localhost:8080";

// FUCK: https://opencode.ai/docs/zen#endpoints
const ZEN_OPENAI_URL = "https://opencode.ai/zen/v1";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
const OLLAMA_CLOUD_URL = "https://ollama.com/api/chat"
const OPENROUTER_URL = "https://openrouter.ai/api/v1"

export const MODELS = {
  // Anthropic
  "claude-opus-4-6": { provider: ModelProvider.Anthropic, contextWindow: 200000, maxTokens: 32000 },
  "claude-sonnet-4-6": { provider: ModelProvider.Anthropic, contextWindow: 200000, maxTokens: 64000 },
  "claude-haiku-4-5-20251001": { provider: ModelProvider.Anthropic, contextWindow: 200000, maxTokens: 8192 },

  // Google
  "gemini-3-flash-preview": { provider: ModelProvider.Google, contextWindow: 1048576, maxTokens: 8192 },
  "gemini-3.1-flash-lite-preview": { provider: ModelProvider.Google, contextWindow: 1048576, maxTokens: 8192 },

  // OpenCode Zen — openai-compatible backend
  "minimax-m2.5-free": { provider: ModelProvider.OpenCodeZen, baseURL: ZEN_OPENAI_URL, zenBackend: "openai-compatible", contextWindow: 204800, maxTokens: 128000 },
  "nemotron-3-super-free": { provider: ModelProvider.OpenCodeZen, baseURL: ZEN_OPENAI_URL, zenBackend: "openai-compatible", contextWindow: 204800, maxTokens: 128000 },

  // Local llamacpp
  "llamacpp": { provider: ModelProvider.OpenAICompatible, baseURL: LOCAL_ENDPOINT, contextWindow: 128000, maxTokens: 50000 },

  // Groq
  "openai/gpt-oss-120b": { provider: ModelProvider.OpenAICompatible, baseURL: GROQ_URL, contextWindow: 128000, maxTokens: 50000 },

  // Ollama Cloud
  "ministral-3": { provider: ModelProvider.OpenAICompatible, baseURL: OLLAMA_CLOUD_URL, contextWindow: 128000, maxTokens: 50000 },

  // OpenRouter
  "qwen/qwen3.6-plus:free": { provider: ModelProvider.OpenAICompatible, baseURL: OPENROUTER_URL, contextWindow: 128000, maxTokens: 50000 }
} as const satisfies Record<string, ModelDefinition>;

export type ModelId = keyof typeof MODELS;
