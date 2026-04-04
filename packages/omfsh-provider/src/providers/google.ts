import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, streamText, embed } from "ai";
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

export function createGoogleProvider(config: ProviderConfig): Provider {
  const client = createGoogleGenerativeAI({
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
      text: string,
      options: ModelOptions,
    ): Promise<ProviderResponse<number[]>> {
      const result = await embed({
        model: client.embedding(options.model),
        value: text,
      });
      return {
        data: result.embedding,
      };
    },
  };
}
