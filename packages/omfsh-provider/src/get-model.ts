import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import { MODELS, type ModelDefinition, type ModelId } from "./models.js";
import { ModelProvider } from "./types.js";

export function getModel(provider: ModelProvider, modelId: ModelId): LanguageModelV3 {
  const def = MODELS[modelId] as ModelDefinition;
  const { baseURL } = def;

  switch (provider) {
    case ModelProvider.OpenAI:
      return createOpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL }).chat(modelId);

    case ModelProvider.Anthropic:
      return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY, baseURL }).languageModel(modelId);

    case ModelProvider.Google:
      return createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY, baseURL }).languageModel(modelId);

    case ModelProvider.OpenCodeZen:
      if (def.zenBackend === "anthropic") {
        return createAnthropic({ apiKey: process.env.OPENCODE_ZEN_API_KEY, baseURL }).languageModel(modelId);
      }
      return createOpenAICompatible({ name: "opencode-zen", apiKey: process.env.OPENCODE_ZEN_API_KEY, baseURL: baseURL ?? "" }).languageModel(modelId);

    case ModelProvider.OpenAICompatible:
      return createOpenAICompatible({ name: modelId, apiKey: process.env.OPENAI_COMPATIBLE_API_KEY, baseURL: baseURL ?? "" }).languageModel(modelId);

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
