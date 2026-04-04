import { describe, it, expect, mock, beforeEach } from "bun:test";

const mockGenerateText = mock(async () => ({
  text: "hello world",
  reasoningText: undefined,
  toolCalls: [],
  toolResults: [],
  finishReason: "stop",
  usage: { inputTokens: 5, outputTokens: 10, totalTokens: 15 },
  response: {
    id: "resp-1",
    modelId: "claude-haiku-4-5-20251001",
    timestamp: new Date(0),
    messages: [],
  },
  warnings: [],
}));

mock.module("ai", () => ({
  generateText: mockGenerateText,
  streamText: () => ({ fullStream: (async function* () {})(), response: Promise.resolve({ messages: [] }) }),
  tool: (t: unknown) => t,
  jsonSchema: (s: unknown) => s,
}));

mock.module("@ai-sdk/anthropic", () => ({
  createAnthropic: () => ({
    languageModel: (model: string) => ({ model }),
  }),
}));

mock.module("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: () => ({
    languageModel: (model: string) => ({ model }),
  }),
}));

mock.module("@ai-sdk/openai", () => ({
  createOpenAI: () => ({
    chat: (model: string) => ({ model }),
  }),
}));

mock.module("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: () => ({
    languageModel: (model: string) => ({ model }),
  }),
}));

const { generate } = await import("../generate.js");

describe("generate", () => {
  beforeEach(() => {
    mockGenerateText.mockClear();
  });

  it("returns text and token usage from a simple prompt", async () => {
    const result = await generate(
      "claude-haiku-4-5-20251001",
      [{ role: "user", content: "hi" }],
    );

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
    await generate(
      "claude-haiku-4-5-20251001",
      [{ role: "user", content: "hi" }],
      { system: "you are a bot" },
    );

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    const call = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
    expect(call.system).toBe("you are a bot");
  });

  it("passes temperature and maxTokens", async () => {
    await generate(
      "claude-haiku-4-5-20251001",
      [{ role: "user", content: "hi" }],
      { temperature: 0.5, maxTokens: 100 },
    );

    const call = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
    expect(call.temperature).toBe(0.5);
    expect(call.maxOutputTokens).toBe(100);
  });

  it("converts tool calls from response", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "",
      reasoningText: undefined,
      finishReason: "tool-calls",
      toolCalls: [
        { toolCallId: "tc1", toolName: "echo", input: { msg: "hi" } },
      ],
      toolResults: [
        { toolCallId: "tc1", toolName: "echo", output: "hi" },
      ],
      usage: { inputTokens: 3, outputTokens: 7, totalTokens: 10 },
      response: { id: "r", modelId: "m", timestamp: new Date(0), messages: [] },
      warnings: [],
    });

    const result = await generate(
      "claude-haiku-4-5-20251001",
      [{ role: "user", content: "call echo" }],
    );

    expect(result.finishReason).toBe("tool-calls");
    expect(result.toolCalls).toEqual([
      { toolCallId: "tc1", toolName: "echo", input: { msg: "hi" } },
    ]);
    expect(result.toolResults).toEqual([
      { toolCallId: "tc1", toolName: "echo", output: "hi" },
    ]);
  });

  it("extracts reasoning text", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "answer",
      reasoningText: "let me think...",
      finishReason: "stop",
      toolCalls: [],
      toolResults: [],
      usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
      response: { id: "r", modelId: "m", timestamp: new Date(0), messages: [] },
      warnings: [],
    });

    const result = await generate(
      "claude-haiku-4-5-20251001",
      [{ role: "user", content: "think" }],
    );

    expect(result.reasoning).toBe("let me think...");
    expect(result.text).toBe("answer");
  });

  it("converts assistant response messages", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "hi",
      reasoningText: undefined,
      finishReason: "stop",
      toolCalls: [],
      toolResults: [],
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      response: {
        id: "r",
        modelId: "m",
        timestamp: new Date(0),
        messages: [
          {
            role: "assistant",
            content: [
              { type: "text", text: "hi" },
              { type: "reasoning", text: "thought" },
            ],
          },
        ],
      },
      warnings: [],
    });

    const result = await generate(
      "claude-haiku-4-5-20251001",
      [{ role: "user", content: "hello" }],
    );

    expect(result.responseMessages).toEqual([
      {
        role: "assistant",
        content: [
          { type: "text", text: "hi" },
          { type: "reasoning", text: "thought" },
        ],
      },
    ]);
  });

  it("converts tool response messages", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "",
      reasoningText: undefined,
      finishReason: "tool-calls",
      toolCalls: [],
      toolResults: [],
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      response: {
        id: "r",
        modelId: "m",
        timestamp: new Date(0),
        messages: [
          {
            role: "tool",
            content: [
              {
                type: "tool-result",
                toolCallId: "tc1",
                toolName: "echo",
                output: { type: "json", value: { result: 42 } },
              },
            ],
          },
        ],
      },
      warnings: [],
    });

    const result = await generate(
      "claude-haiku-4-5-20251001",
      [{ role: "user", content: "go" }],
    );

    expect(result.responseMessages).toEqual([
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "tc1",
            toolName: "echo",
            output: { result: 42 },
          },
        ],
      },
    ]);
  });

  it("executes tools passed in options", async () => {
    await generate(
      "claude-haiku-4-5-20251001",
      [{ role: "user", content: "use tool" }],
      {
        tools: {
          echo: {
            description: "echoes input",
            parameters: { type: "object", properties: { msg: { type: "string" } } },
            execute: (input: unknown) => input,
          },
        },
      },
    );

    const call = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
    expect(call.tools).toBeDefined();
    expect(typeof (call.tools as Record<string, unknown>).echo).toBe("object");
  });

  it("passes maxSteps: 1 to prevent auto-looping", async () => {
    await generate("claude-haiku-4-5-20251001", [{ role: "user", content: "x" }]);
    const call = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
    expect(call.maxSteps).toBe(1);
  });
});
