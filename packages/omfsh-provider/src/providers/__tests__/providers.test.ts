import { describe, it, expect, mock } from "bun:test";
import { ModelProvider } from "../../types.js";
import { createProvider, loadProviderFromEnv } from "../index.js";
import { MODELS } from "../../models.js";

// Mock ai SDK functions
mock.module("ai", () => ({
  generateText: async () => ({
    text: "mocked response",
    finishReason: "stop",
    usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    response: { id: "mock-id", modelId: "mock-model", timestamp: new Date(0) },
    warnings: [],
  }),
  streamText: () => ({
    textStream: (async function* () {
      yield "chunk1";
      yield "chunk2";
    })(),
  }),
  embed: async () => ({
    embedding: [0.1, 0.2, 0.3],
  }),
}));

mock.module("@ai-sdk/openai", () => ({
  createOpenAI: () => ({
    chat: (model: string) => ({ model }),
    embedding: (model: string) => ({ model }),
  }),
}));

mock.module("@ai-sdk/anthropic", () => ({
  createAnthropic: () => ({
    languageModel: (model: string) => ({ model }),
  }),
}));

mock.module("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: () => ({
    languageModel: (model: string) => ({ model }),
    embedding: (model: string) => ({ model }),
  }),
}));

mock.module("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: () => ({
    languageModel: (model: string) => ({ model }),
    embeddingModel: (model: string) => ({ model }),
  }),
}));

describe("createProvider", () => {
  describe("OpenAI provider", () => {
    const provider = createProvider({
      provider: ModelProvider.OpenAI,
      apiKey: "test-key",
    });

    it("generates text", async () => {
      const result = await provider.generateText("hello", { model: "gpt-4o" });
      expect(result.data).toBe("mocked response");
      expect(result.finishReason).toBe("stop");
      expect(result.usage?.inputTokens).toBe(10);
      expect(result.usage?.outputTokens).toBe(20);
      expect(result.usage?.totalTokens).toBe(30);
      expect(result.meta?.id).toBe("mock-id");
      expect(result.meta?.modelId).toBe("mock-model");
    });

    it("streams text", async () => {
      const stream = await provider.streamText("hello", { model: "gpt-4o" });
      const chunks: string[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      expect(chunks).toEqual(["chunk1", "chunk2"]);
    });

    it("embeds text", async () => {
      const result = await provider.embed("hello", {
        model: "text-embedding-3-small",
      });
      expect(result.data).toEqual([0.1, 0.2, 0.3]);
    });
  });

  describe("Anthropic provider", () => {
    const provider = createProvider({
      provider: ModelProvider.Anthropic,
      apiKey: "test-key",
    });

    it("generates text", async () => {
      const result = await provider.generateText("hello", {
        model: "claude-sonnet-4-6",
      });
      expect(result.data).toBe("mocked response");
    });

    it("streams text", async () => {
      const stream = await provider.streamText("hello", {
        model: "claude-sonnet-4-6",
      });
      const chunks: string[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      expect(chunks).toEqual(["chunk1", "chunk2"]);
    });

    it("throws on embed", async () => {
      expect(
        provider.embed("hello", { model: "any" }),
      ).rejects.toThrow("Anthropic does not support text embedding");
    });
  });

  describe("Google provider", () => {
    const provider = createProvider({
      provider: ModelProvider.Google,
      apiKey: "test-key",
    });

    it("generates text", async () => {
      const result = await provider.generateText("hello", {
        model: "gemini-2.0-flash",
      });
      expect(result.data).toBe("mocked response");
    });

    it("embeds text", async () => {
      const result = await provider.embed("hello", {
        model: "gemini-embedding-001",
      });
      expect(result.data).toEqual([0.1, 0.2, 0.3]);
    });
  });

  describe("OpenAI-compatible provider", () => {
    const provider = createProvider({
      provider: ModelProvider.OpenAICompatible,
      baseURL: "http://localhost:11434/v1",
      apiKey: "ollama",
    });

    it("generates text", async () => {
      const result = await provider.generateText("hello", {
        model: "llama3.2",
      });
      expect(result.data).toBe("mocked response");
    });

    it("embeds text", async () => {
      const result = await provider.embed("hello", {
        model: "nomic-embed-text",
      });
      expect(result.data).toEqual([0.1, 0.2, 0.3]);
    });
  });

  describe("OpenCode Zen provider", () => {
    const provider = createProvider({
      provider: ModelProvider.OpenCodeZen,
      apiKey: "zen-key",
    });

    it("routes openai-compatible models (minimax-m2.5-free)", async () => {
      const result = await provider.generateText("hello", {
        model: "minimax-m2.5-free",
      });
      expect(result.data).toBe("mocked response");
    });

    it("routes openai-compatible models (nemotron-3-super-free)", async () => {
      const result = await provider.generateText("hello", {
        model: "nemotron-3-super-free",
      });
      expect(result.data).toBe("mocked response");
    });

    it("streams text", async () => {
      const stream = await provider.streamText("hello", {
        model: "minimax-m2.5-free",
      });
      const chunks: string[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      expect(chunks).toEqual(["chunk1", "chunk2"]);
    });

    it("throws on unknown model", async () => {
      expect(
        provider.generateText("hello", { model: "unknown-model" }),
      ).rejects.toThrow('Unknown OpenCode Zen model "unknown-model"');
    });

    it("throws on embed", async () => {
      expect(
        provider.embed("hello", { model: "minimax-m2.5-free" }),
      ).rejects.toThrow("OpenCode Zen does not support text embedding");
    });
  });

  describe("MODELS registry", () => {
    it("has openai-compatible zen models with baseURL", () => {
      expect(MODELS["minimax-m2.5-free"].zenBackend).toBe("openai-compatible");
      expect(MODELS["minimax-m2.5-free"].baseURL).toBeDefined();
      expect(MODELS["nemotron-3-super-free"].zenBackend).toBe("openai-compatible");
      expect(MODELS["nemotron-3-super-free"].baseURL).toBeDefined();
    });
  });
});

describe("loadProviderFromEnv", () => {
  it("loads OpenAI config from env", () => {
    process.env.OPENAI_API_KEY = "env-openai-key";
    const config = loadProviderFromEnv(ModelProvider.OpenAI);
    expect(config.provider).toBe(ModelProvider.OpenAI);
    expect(config.apiKey).toBe("env-openai-key");
  });

  it("loads Anthropic config from env", () => {
    process.env.ANTHROPIC_API_KEY = "env-anthropic-key";
    const config = loadProviderFromEnv(ModelProvider.Anthropic);
    expect(config.provider).toBe(ModelProvider.Anthropic);
    expect(config.apiKey).toBe("env-anthropic-key");
  });

  it("loads Google config from env", () => {
    process.env.GOOGLE_API_KEY = "env-google-key";
    const config = loadProviderFromEnv(ModelProvider.Google);
    expect(config.provider).toBe(ModelProvider.Google);
    expect(config.apiKey).toBe("env-google-key");
  });

  it("loads OpenAI-compatible config from env", () => {
    process.env.OPENAI_COMPATIBLE_API_KEY = "env-compat-key";
    process.env.OPENAI_COMPATIBLE_BASE_URL = "http://localhost:1234/v1";
    const config = loadProviderFromEnv(ModelProvider.OpenAICompatible);
    expect(config.provider).toBe(ModelProvider.OpenAICompatible);
    expect(config.apiKey).toBe("env-compat-key");
    expect(config.baseURL).toBe("http://localhost:1234/v1");
  });

  it("loads OpenCode Zen config from env with custom base URL", () => {
    process.env.OPENCODE_ZEN_API_KEY = "env-zen-key";
    process.env.OPENCODE_ZEN_BASE_URL = "http://zen.local/v1";
    const config = loadProviderFromEnv(ModelProvider.OpenCodeZen);
    expect(config.provider).toBe(ModelProvider.OpenCodeZen);
    expect(config.apiKey).toBe("env-zen-key");
    expect(config.baseURL).toBe("http://zen.local/v1");
  });

  it("loads OpenCode Zen config from env without base URL (uses default)", () => {
    delete process.env.OPENCODE_ZEN_BASE_URL;
    const config = loadProviderFromEnv(ModelProvider.OpenCodeZen);
    expect(config.provider).toBe(ModelProvider.OpenCodeZen);
    expect(config.baseURL).toBeUndefined();
  });
});
