import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, streamText } from "ai";
import { MODELS } from "../models.js";

type GenerateResult = Awaited<ReturnType<typeof generateText>>;

function mapResult(result: GenerateResult): ProviderResponse<string> {
  return {
    data: result.text,
    finishReason: result.finishReason,
    usage: {
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalTokens: result.usage.totalTokens,
    },
    meta: {
      id: result.response.id,
      modelId: result.response.modelId,
      timestamp: result.response.timestamp,
    },
    warnings: result.warnings?.map((w) =>
      w.type === "other" ? w.message : `${w.type}: ${w.feature}`,
    ),
  };
}
import { ModelProvider } from "../types.js";
import type {
  Provider,
  OpenCodeZenConfig,
  ModelOptions,
  ProviderResponse,
} from "../types.js";

type ResolvedModel = {
  backend: "openai-compatible" | "anthropic";
  baseURL: string;
};

function resolveModel(model: string, configBaseURL?: string): ResolvedModel {
  const def = MODELS[model as keyof typeof MODELS];
  if (!def || def.provider !== ModelProvider.OpenCodeZen) {
    const known = Object.entries(MODELS)
      .filter(([, d]) => d.provider === ModelProvider.OpenCodeZen)
      .map(([id]) => id)
      .join(", ");
    throw new Error(
      `Unknown OpenCode Zen model "${model}". Known models: ${known}`,
    );
  }
  return {
    backend: def.zenBackend,
    baseURL: configBaseURL ?? def.baseURL,
  };
}

export function createOpenCodeZenProvider(config: OpenCodeZenConfig): Provider {
  function getModel(options: ModelOptions) {
    const { backend, baseURL } = resolveModel(options.model, config.baseURL);
    if (backend === "anthropic") {
      return createAnthropic({ baseURL, apiKey: config.apiKey }).languageModel(options.model);
    }
    return createOpenAICompatible({ baseURL, name: "opencode-zen", apiKey: config.apiKey }).languageModel(options.model);
  }

  return {
    async generateText(
      prompt: string,
      options: ModelOptions,
    ): Promise<ProviderResponse<string>> {
      const result = await generateText({
        model: getModel(options),
        prompt,
        temperature: options.temperature,
        maxOutputTokens: options.maxOutputTokens,
        topP: options.topP,
      });
      return mapResult(result);
    },

    async streamText(
      prompt: string,
      options: ModelOptions,
    ): Promise<AsyncIterable<string>> {
      const result = streamText({
        model: getModel(options),
        prompt,
        temperature: options.temperature,
        maxOutputTokens: options.maxOutputTokens,
        topP: options.topP,
      });
      return result.textStream;
    },

    async embed(
      _text: string,
      _options: ModelOptions,
    ): Promise<ProviderResponse<number[]>> {
      throw new Error("OpenCode Zen does not support text embedding");
    },
  };
}
