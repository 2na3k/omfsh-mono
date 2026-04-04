import {
  ModelProvider,
  type AnyProviderConfig,
  type OpenAICompatibleConfig,
  type OpenCodeZenConfig,
  type Provider,
} from "../types.js";
import { createOpenAIProvider } from "./openai.js";
import { createAnthropicProvider } from "./anthropic.js";
import { createGoogleProvider } from "./google.js";
import { createOpenAICompatibleProvider } from "./openai-compatible.js";
import { createOpenCodeZenProvider } from "./opencode-zen.js";

export function createProvider(config: AnyProviderConfig): Provider {
  switch (config.provider) {
    case ModelProvider.OpenAI:
      return createOpenAIProvider(config);
    case ModelProvider.Anthropic:
      return createAnthropicProvider(config);
    case ModelProvider.Google:
      return createGoogleProvider(config);
    case ModelProvider.OpenAICompatible:
      return createOpenAICompatibleProvider(config as OpenAICompatibleConfig);
    case ModelProvider.OpenCodeZen:
      return createOpenCodeZenProvider(config as OpenCodeZenConfig);
  }
}

export function loadProviderFromEnv(provider: ModelProvider): AnyProviderConfig {
  switch (provider) {
    case ModelProvider.OpenAI:
      return {
        provider: ModelProvider.OpenAI,
        apiKey: process.env.OPENAI_API_KEY,
      };
    case ModelProvider.Anthropic:
      return {
        provider: ModelProvider.Anthropic,
        apiKey: process.env.ANTHROPIC_API_KEY,
      };
    case ModelProvider.Google:
      return {
        provider: ModelProvider.Google,
        apiKey: process.env.GOOGLE_API_KEY,
      };
    case ModelProvider.OpenAICompatible:
      return {
        provider: ModelProvider.OpenAICompatible,
        apiKey: process.env.OPENAI_COMPATIBLE_API_KEY,
        baseURL: process.env.OPENAI_COMPATIBLE_BASE_URL ?? "",
      } as OpenAICompatibleConfig;
    case ModelProvider.OpenCodeZen:
      return {
        provider: ModelProvider.OpenCodeZen,
        apiKey: process.env.OPENCODE_ZEN_API_KEY,
        baseURL: process.env.OPENCODE_ZEN_BASE_URL,
      } as OpenCodeZenConfig;
  }
}
