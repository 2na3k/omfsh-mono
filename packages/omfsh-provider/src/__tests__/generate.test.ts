import { describe, it, expect, mock, beforeEach } from "bun:test";
import type { GenerateResult } from "../types.js";

type MockCall = Record<string, unknown>;

const baseMockResult = (): Omit<GenerateResult, "responseMessages"> & {
  reasoningText: string | undefined;
  toolCalls: Array<{ toolCallId: string; toolName: string; input: unknown }>;
  toolResults: Array<{ toolCallId: string; toolName: string; output: unknown }>;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  response: { id: string; modelId: string; timestamp: Date; messages: unknown[] };
  warnings: unknown[];
} => ({
  text: "hello world",
  reasoning: undefined,
  reasoningText: undefined,
  toolCalls: [],
  toolResults: [],
  finishReason: "stop",
  inputTokens: 5,
  outputTokens: 10,
  usage: { inputTokens: 5, outputTokens: 10, totalTokens: 15 },
  response: { id: "resp-1", modelId: "claude-haiku-4-5-20251001", timestamp: new Date(0), messages: [] },
  warnings: [],
});

const mockGenerateText = mock(async () => baseMockResult());

mock.module("ai", () => ({
  generateText: mockGenerateText,
  streamText: () => ({ fullStream: (async function* () {})(), response: Promise.resolve({ messages: [] }) }),
  tool: (t: unknown) => t,
  jsonSchema: (s: unknown) => s,
  stepCountIs: () => ({}),
}));

mock.module("@ai-sdk/anthropic", () => ({
  createAnthropic: () => ({ languageModel: (model: string) => ({ model }) }),
}));
mock.module("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: () => ({ languageModel: (model: string) => ({ model }) }),
}));
mock.module("@ai-sdk/openai", () => ({
  createOpenAI: () => ({ chat: (model: string) => ({ model }) }),
}));
mock.module("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: () => ({ languageModel: (model: string) => ({ model }) }),
}));

const { generate } = await import("../generate.js");

describe("generate", () => {
  beforeEach(() => mockGenerateText.mockClear());

  it("returns text and token usage", async () => {
    const result = await generate("claude-haiku-4-5-20251001", [{ role: "user", content: "hi" }]);
    expect(result.text).toBe("hello world");
    expect(result.finishReason).toBe("stop");
    expect(result.inputTokens).toBe(5);
    expect(result.outputTokens).toBe(10);
    expect(result.reasoning).toBeUndefined();
    expect(result.toolCalls).toEqual([]);
    expect(result.toolResults).toEqual([]);
    expect(result.responseMessages).toEqual([]);
  });

  it("passes system prompt to generateText", async () => {
    await generate("claude-haiku-4-5-20251001", [{ role: "user", content: "hi" }], { system: "you are a bot" });
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    const call = (mockGenerateText.mock.calls as unknown as MockCall[][])[0][0];
    expect(call.system).toBe("you are a bot");
  });

  it("passes temperature and maxTokens", async () => {
    await generate("claude-haiku-4-5-20251001", [{ role: "user", content: "hi" }], { temperature: 0.5, maxTokens: 100 });
    const call = (mockGenerateText.mock.calls as unknown as MockCall[][])[0][0];
    expect(call.temperature).toBe(0.5);
    expect(call.maxOutputTokens).toBe(100);
  });

  it("converts tool calls from response", async () => {
    mockGenerateText.mockResolvedValueOnce({
      ...baseMockResult(),
      finishReason: "tool-calls",
      toolCalls: [{ toolCallId: "tc1", toolName: "echo", input: { msg: "hi" } }],
      toolResults: [{ toolCallId: "tc1", toolName: "echo", output: "hi" }],
      usage: { inputTokens: 3, outputTokens: 7, totalTokens: 10 },
    } as ReturnType<typeof baseMockResult>);

    const result = await generate("claude-haiku-4-5-20251001", [{ role: "user", content: "call echo" }]);
    expect(result.finishReason).toBe("tool-calls");
    expect(result.toolCalls).toEqual([{ toolCallId: "tc1", toolName: "echo", input: { msg: "hi" } }]);
    expect(result.toolResults).toEqual([{ toolCallId: "tc1", toolName: "echo", output: "hi" }]);
  });

  it("extracts reasoning text", async () => {
    mockGenerateText.mockResolvedValueOnce({
      ...baseMockResult(),
      text: "answer",
      reasoningText: "let me think...",
      usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
    } as ReturnType<typeof baseMockResult>);

    const result = await generate("claude-haiku-4-5-20251001", [{ role: "user", content: "think" }]);
    expect(result.reasoning).toBe("let me think...");
    expect(result.text).toBe("answer");
  });

  it("converts assistant response messages", async () => {
    mockGenerateText.mockResolvedValueOnce({
      ...baseMockResult(),
      response: {
        id: "r", modelId: "m", timestamp: new Date(0),
        messages: [{
          role: "assistant",
          content: [{ type: "text", text: "hi" }, { type: "reasoning", text: "thought" }],
        }],
      },
    } as ReturnType<typeof baseMockResult>);

    const result = await generate("claude-haiku-4-5-20251001", [{ role: "user", content: "hello" }]);
    expect(result.responseMessages).toEqual([{
      role: "assistant",
      content: [{ type: "text", text: "hi" }, { type: "reasoning", text: "thought" }],
    }]);
  });

  it("converts tool response messages — { type, value } SDK format", async () => {
    mockGenerateText.mockResolvedValueOnce({
      ...baseMockResult(),
      response: {
        id: "r", modelId: "m", timestamp: new Date(0),
        messages: [{
          role: "tool",
          content: [{
            type: "tool-result",
            toolCallId: "tc1",
            toolName: "echo",
            output: { type: "json", value: { result: 42 } },
          }],
        }],
      },
    } as ReturnType<typeof baseMockResult>);

    const result = await generate("claude-haiku-4-5-20251001", [{ role: "user", content: "go" }]);
    expect(result.responseMessages).toEqual([{
      role: "tool",
      content: [{ type: "tool-result", toolCallId: "tc1", toolName: "echo", output: { result: 42 } }],
    }]);
  });

  it("converts tool response messages — raw string output (SDK inline execution)", async () => {
    mockGenerateText.mockResolvedValueOnce({
      ...baseMockResult(),
      response: {
        id: "r", modelId: "m", timestamp: new Date(0),
        messages: [{
          role: "tool",
          content: [{
            type: "tool-result",
            toolCallId: "tc2",
            toolName: "web_search",
            output: "some raw search result",
          }],
        }],
      },
    } as ReturnType<typeof baseMockResult>);

    const result = await generate("claude-haiku-4-5-20251001", [{ role: "user", content: "go" }]);
    expect(result.responseMessages).toEqual([{
      role: "tool",
      content: [{ type: "tool-result", toolCallId: "tc2", toolName: "web_search", output: "some raw search result" }],
    }]);
  });

  it("converts tool response messages — raw object output (SDK inline execution)", async () => {
    mockGenerateText.mockResolvedValueOnce({
      ...baseMockResult(),
      response: {
        id: "r", modelId: "m", timestamp: new Date(0),
        messages: [{
          role: "tool",
          content: [{
            type: "tool-result",
            toolCallId: "tc3",
            toolName: "fetch",
            output: { url: "https://example.com", content: "hello" },
          }],
        }],
      },
    } as ReturnType<typeof baseMockResult>);

    const result = await generate("claude-haiku-4-5-20251001", [{ role: "user", content: "go" }]);
    expect(result.responseMessages).toEqual([{
      role: "tool",
      content: [{ type: "tool-result", toolCallId: "tc3", toolName: "fetch", output: { url: "https://example.com", content: "hello" } }],
    }]);
  });

  it("drops tool message entirely when content is empty after filtering", async () => {
    mockGenerateText.mockResolvedValueOnce({
      ...baseMockResult(),
      response: {
        id: "r", modelId: "m", timestamp: new Date(0),
        messages: [{
          role: "tool",
          content: [{ type: "other-type", toolCallId: "tc4", toolName: "x", output: null }],
        }],
      },
    } as ReturnType<typeof baseMockResult>);

    const result = await generate("claude-haiku-4-5-20251001", [{ role: "user", content: "go" }]);
    // non tool-result parts are filtered → message is dropped entirely
    expect(result.responseMessages).toEqual([]);
  });

  it("builds tool set when tools are passed", async () => {
    await generate("claude-haiku-4-5-20251001", [{ role: "user", content: "use tool" }], {
      tools: {
        echo: { description: "echoes input", parameters: { type: "object", properties: {} }, execute: (i: unknown) => i },
      },
    });
    const call = (mockGenerateText.mock.calls as unknown as MockCall[][])[0][0];
    expect(call.tools).toBeDefined();
    expect(typeof (call.tools as Record<string, unknown>).echo).toBe("object");
  });

  it("passes stopWhen to prevent auto-looping", async () => {
    await generate("claude-haiku-4-5-20251001", [{ role: "user", content: "x" }]);
    const call = (mockGenerateText.mock.calls as unknown as MockCall[][])[0][0];
    expect(call.stopWhen).toBeDefined();
  });
});
