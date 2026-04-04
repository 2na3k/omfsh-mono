import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, streamText } from "ai";
import type {
  Provider,
  ProviderConfig,
  ModelOptions,
  ProviderResponse,
} from "../types.js";

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

export function createAnthropicProvider(config: ProviderConfig): Provider {
  const client = createAnthropic({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  return {
    async generateText(
      prompt: string,
      options: ModelOptions,
    ): Promise<ProviderResponse<string>> {
      const result = await generateText({
        model: client.languageModel(options.model),
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
        model: client.languageModel(options.model),
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
      throw new Error("Anthropic does not support text embedding");
    },
  };
}
