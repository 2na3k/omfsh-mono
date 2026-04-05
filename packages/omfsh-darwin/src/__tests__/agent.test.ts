import { describe, it, expect, mock, beforeEach } from "bun:test";
import type { GenerateResult, ToolResultRecord } from "@2na3k/omfsh-provider";

const makeResult = (overrides: Partial<GenerateResult> = {}): GenerateResult => ({
  text: "done",
  reasoning: undefined,
  toolCalls: [],
  toolResults: [],
  finishReason: "stop",
  inputTokens: 10,
  outputTokens: 20,
  responseMessages: [],
  ...overrides,
});

const mockGenerate = mock(async (): Promise<GenerateResult> => makeResult());

async function* defaultStreamGenerate() {
  yield { type: "text-start" as const };
  yield { type: "text-delta" as const, delta: "done" };
  yield { type: "text-end" as const };
  yield { type: "finish" as const, result: makeResult() };
}
const mockStreamGenerate = mock(defaultStreamGenerate);

const mockExecuteToolsParallel = mock(
  async (_tools: unknown, toolCalls: Array<{ toolCallId: string; toolName: string; input: unknown }>): Promise<ToolResultRecord[]> =>
    toolCalls.map((tc) => ({ toolCallId: tc.toolCallId, toolName: tc.toolName, output: `result-${tc.toolName}` })),
);

const mockBuildToolMessage = mock((results: ToolResultRecord[]) => ({
  role: "tool" as const,
  content: results.map((r) => ({ type: "tool-result" as const, toolCallId: r.toolCallId, toolName: r.toolName, output: r.output })),
}));

mock.module("@2na3k/omfsh-provider", () => ({
  generate: mockGenerate,
  streamGenerate: mockStreamGenerate,
  executeToolsParallel: mockExecuteToolsParallel,
  buildToolMessage: mockBuildToolMessage,
}));

const { buildContext, appendStep } = await import("../proxy.js");
const { runAgentLoop } = await import("../agent-loop.js");
const { Agent } = await import("../agent.js");
import { AgentEventType } from "../types.js";

describe("proxy", () => {
  describe("buildContext", () => {
    it("creates context with user message", () => {
      const ctx = buildContext("hello");
      expect(ctx.messages).toEqual([{ role: "user", content: "hello" }]);
    });

    it("appends prompt to existing messages and preserves fields", () => {
      const ctx = buildContext("next", { messages: [{ role: "user", content: "prev" }], systemPrompt: "sys" });
      expect(ctx.messages).toHaveLength(2);
      expect(ctx.systemPrompt).toBe("sys");
    });

    it("does not mutate base", () => {
      const base = { messages: [{ role: "user" as const, content: "x" }] };
      buildContext("y", base);
      expect(base.messages).toHaveLength(1);
    });
  });

  describe("appendStep", () => {
    it("appends response messages and preserves context fields", () => {
      const tools = { echo: { description: "x", parameters: {}, execute: () => "" } };
      const ctx = { messages: [], systemPrompt: "sys", tools };
      const updated = appendStep(ctx, [{ role: "assistant" as const, content: [] }]);
      expect(updated.messages).toHaveLength(1);
      expect(updated.systemPrompt).toBe("sys");
      expect(updated.tools).toBe(tools);
    });

    it("does not mutate original", () => {
      const ctx = { messages: [{ role: "user" as const, content: "hi" }] };
      appendStep(ctx, [{ role: "assistant" as const, content: [] }]);
      expect(ctx.messages).toHaveLength(1);
    });
  });
});

describe("runAgentLoop — non-stream", () => {
  beforeEach(() => mockGenerate.mockClear());

  it("emits AgentStart → TurnEnd → AgentEnd", async () => {
    const events: AgentEventType[] = [];
    for await (const y of runAgentLoop("hi", { modelId: "claude-haiku-4-5-20251001" })) {
      events.push(y.event);
    }
    expect(events).toEqual([AgentEventType.AgentStart, AgentEventType.TurnStart, AgentEventType.TurnEnd, AgentEventType.AgentEnd]);
  });

  it("state.isRunning is true during loop, false at AgentEnd", async () => {
    const states: Array<{ event: AgentEventType; isRunning: boolean }> = [];
    for await (const y of runAgentLoop("hi", { modelId: "claude-haiku-4-5-20251001" })) {
      states.push({ event: y.event, isRunning: y.state.isRunning });
    }
    const end = states.find((s) => s.event === AgentEventType.AgentEnd)!;
    const start = states.find((s) => s.event === AgentEventType.AgentStart)!;
    expect(start.isRunning).toBe(true);
    expect(end.isRunning).toBe(false);
  });

  it("accumulates tokens in state across turns", async () => {
    mockGenerate
      .mockResolvedValueOnce(makeResult({ finishReason: "tool-calls", inputTokens: 5, outputTokens: 10 }))
      .mockResolvedValueOnce(makeResult({ finishReason: "stop", inputTokens: 3, outputTokens: 7 }));

    const turnEnds: Array<{ totalInputTokens: number; totalOutputTokens: number }> = [];
    for await (const y of runAgentLoop("go", { modelId: "claude-haiku-4-5-20251001" })) {
      if (y.event === AgentEventType.TurnEnd) turnEnds.push(y.state);
    }
    expect(turnEnds[0].totalInputTokens).toBe(5);
    expect(turnEnds[1].totalInputTokens).toBe(8);
    expect(turnEnds[1].totalOutputTokens).toBe(17);
  });

  it("loops on tool-calls and stops on stop", async () => {
    mockGenerate
      .mockResolvedValueOnce(makeResult({ finishReason: "tool-calls" }))
      .mockResolvedValueOnce(makeResult({ finishReason: "stop" }));

    let turnCount = 0;
    for await (const y of runAgentLoop("go", { modelId: "claude-haiku-4-5-20251001" })) {
      if (y.event === AgentEventType.TurnEnd) turnCount++;
    }
    expect(turnCount).toBe(2);
  });

  it("respects maxSteps", async () => {
    mockGenerate.mockResolvedValue(makeResult({ finishReason: "tool-calls" }));
    let turnCount = 0;
    for await (const y of runAgentLoop("go", { modelId: "claude-haiku-4-5-20251001", maxSteps: 2 })) {
      if (y.event === AgentEventType.TurnEnd) turnCount++;
    }
    expect(turnCount).toBe(2);
  });
});

describe("runAgentLoop — stream mode", () => {
  beforeEach(() => mockStreamGenerate.mockClear());

  it("emits message lifecycle events when stream: true", async () => {
    const events: AgentEventType[] = [];
    for await (const y of runAgentLoop("hi", { modelId: "claude-haiku-4-5-20251001", stream: true })) {
      events.push(y.event);
    }
    expect(events).toContain(AgentEventType.MessageStart);
    expect(events).toContain(AgentEventType.MessageDelta);
    expect(events).toContain(AgentEventType.MessageEnd);
  });

  it("emits MessageDelta with correct delta text", async () => {
    const deltas: string[] = [];
    for await (const y of runAgentLoop("hi", { modelId: "claude-haiku-4-5-20251001", stream: true })) {
      if (y.event === AgentEventType.MessageDelta) deltas.push(y.delta);
    }
    expect(deltas).toEqual(["done"]);
  });

  it("state.isStreaming is true during text delta", async () => {
    const streamingStates: boolean[] = [];
    for await (const y of runAgentLoop("hi", { modelId: "claude-haiku-4-5-20251001", stream: true })) {
      if (y.event === AgentEventType.MessageDelta) streamingStates.push(y.state.isStreaming);
    }
    expect(streamingStates.every((s) => s)).toBe(true);
  });

  it("emits TurnEnd with step result from finish chunk", async () => {
    for await (const y of runAgentLoop("hi", { modelId: "claude-haiku-4-5-20251001", stream: true })) {
      if (y.event === AgentEventType.TurnEnd) {
        expect(y.step.text).toBe("done");
      }
    }
  });

  it("emits tool lifecycle events", async () => {
    mockStreamGenerate.mockImplementationOnce(async function* () {
      yield { type: "tool-call-start" as const, toolCallId: "tc1", toolName: "echo" };
      yield { type: "tool-call-delta" as const, toolCallId: "tc1", delta: '{"' };
      yield { type: "tool-call-end" as const, toolCallId: "tc1", toolName: "echo", input: { msg: "hi" }, output: "hi" };
      yield { type: "finish" as const, result: makeResult({ finishReason: "stop" }) };
    });

    const events: AgentEventType[] = [];
    for await (const y of runAgentLoop("hi", { modelId: "claude-haiku-4-5-20251001", stream: true })) {
      events.push(y.event);
    }
    expect(events).toContain(AgentEventType.ToolCallStart);
    expect(events).toContain(AgentEventType.ToolCallDelta);
    expect(events).toContain(AgentEventType.ToolCallEnd);
  });
});

describe("runAgentLoop — parallelToolCalls", () => {
  beforeEach(() => {
    mockGenerate.mockClear();
    mockStreamGenerate.mockClear();
    mockExecuteToolsParallel.mockClear();
    mockBuildToolMessage.mockClear();
  });

  const tools = {
    search: { description: "search", parameters: {}, execute: async () => "result" },
    fetch:  { description: "fetch",  parameters: {}, execute: async () => "fetched" },
  };

  const toolCallsResult = makeResult({
    finishReason: "tool-calls",
    toolCalls: [
      { toolCallId: "tc1", toolName: "search", input: { q: "foo" } },
      { toolCallId: "tc2", toolName: "fetch",  input: { url: "bar" } },
    ],
    responseMessages: [{ role: "assistant", content: [] }],
  });

  it("non-stream: emits ToolBatchStart → ToolCallEnd × N → ToolBatchEnd before TurnEnd", async () => {
    mockGenerate
      .mockResolvedValueOnce(toolCallsResult)
      .mockResolvedValueOnce(makeResult({ finishReason: "stop" }));

    const events: string[] = [];
    for await (const y of runAgentLoop("go", { modelId: "claude-haiku-4-5-20251001", parallelToolCalls: true }, { messages: [], tools })) {
      events.push(y.event);
    }

    const batchStart = events.indexOf(AgentEventType.ToolBatchStart);
    const batchEnd   = events.indexOf(AgentEventType.ToolBatchEnd);
    const turnEnd    = events.findIndex((e, i) => e === AgentEventType.TurnEnd && i > batchEnd);
    expect(batchStart).toBeGreaterThan(-1);
    expect(batchEnd).toBeGreaterThan(batchStart);
    expect(turnEnd).toBeGreaterThan(batchEnd);
    expect(events.filter((e) => e === AgentEventType.ToolCallEnd)).toHaveLength(2);
  });

  it("non-stream: ToolBatchStart carries all toolCallIds", async () => {
    mockGenerate
      .mockResolvedValueOnce(toolCallsResult)
      .mockResolvedValueOnce(makeResult({ finishReason: "stop" }));

    for await (const y of runAgentLoop("go", { modelId: "claude-haiku-4-5-20251001", parallelToolCalls: true }, { messages: [], tools })) {
      if (y.event === AgentEventType.ToolBatchStart) {
        expect(y.toolCallIds).toEqual(["tc1", "tc2"]);
      }
    }
  });

  it("non-stream: step.responseMessages includes tool message at TurnEnd", async () => {
    mockGenerate
      .mockResolvedValueOnce(toolCallsResult)
      .mockResolvedValueOnce(makeResult({ finishReason: "stop" }));

    const turnEndSteps: GenerateResult[] = [];
    for await (const y of runAgentLoop("go", { modelId: "claude-haiku-4-5-20251001", parallelToolCalls: true }, { messages: [], tools })) {
      if (y.event === AgentEventType.TurnEnd) turnEndSteps.push(y.step);
    }
    // first turn had tool calls — responseMessages must include the tool message
    const firstTurn = turnEndSteps[0];
    expect(firstTurn.responseMessages.some((m) => m.role === "tool")).toBe(true);
  });

  it("non-stream: does not call executeToolsParallel when no tool calls", async () => {
    mockGenerate.mockResolvedValueOnce(makeResult({ finishReason: "stop" }));

    for await (const _ of runAgentLoop("go", { modelId: "claude-haiku-4-5-20251001", parallelToolCalls: true }, { messages: [], tools })) {
      // consume
    }
    expect(mockExecuteToolsParallel).not.toHaveBeenCalled();
  });

  it("stream: emits ToolBatchStart → ToolCallEnd × N → ToolBatchEnd before TurnEnd", async () => {
    mockStreamGenerate
      .mockImplementationOnce(async function* () {
        yield { type: "finish" as const, result: toolCallsResult };
      })
      .mockImplementationOnce(defaultStreamGenerate);

    const events: string[] = [];
    for await (const y of runAgentLoop("go", { modelId: "claude-haiku-4-5-20251001", stream: true, parallelToolCalls: true }, { messages: [], tools })) {
      events.push(y.event);
    }

    expect(events).toContain(AgentEventType.ToolBatchStart);
    expect(events).toContain(AgentEventType.ToolBatchEnd);
    expect(events.filter((e) => e === AgentEventType.ToolCallEnd)).toHaveLength(2);

    const batchStart = events.indexOf(AgentEventType.ToolBatchStart);
    const batchEnd   = events.indexOf(AgentEventType.ToolBatchEnd);
    expect(batchEnd).toBeGreaterThan(batchStart);
  });
});

describe("Agent", () => {
  beforeEach(() => { mockGenerate.mockClear(); mockStreamGenerate.mockClear(); });

  it("run() returns last text and final state", async () => {
    mockGenerate
      .mockResolvedValueOnce(makeResult({ finishReason: "tool-calls", text: "s1", inputTokens: 5, outputTokens: 10 }))
      .mockResolvedValueOnce(makeResult({ finishReason: "stop", text: "final", inputTokens: 3, outputTokens: 7 }));

    const result = await new Agent({ modelId: "claude-haiku-4-5-20251001" }).run("hello");
    expect(result.text).toBe("final");
    expect(result.state.steps).toHaveLength(2);
    expect(result.state.totalInputTokens).toBe(8);
    expect(result.state.isRunning).toBe(false);
  });

  it("run() state.context carries systemPrompt and tools", async () => {
    const tools = { echo: { description: "x", parameters: {}, execute: () => "" } };
    const result = await new Agent(
      { modelId: "claude-haiku-4-5-20251001" },
      { messages: [], systemPrompt: "sys", tools },
    ).run("hi");
    expect(result.state.context.systemPrompt).toBe("sys");
    expect(result.state.context.tools).toBe(tools);
  });

  it("stream() yields all LoopYield events", async () => {
    const events: AgentEventType[] = [];
    for await (const y of new Agent({ modelId: "claude-haiku-4-5-20251001" }).stream("go")) {
      events.push(y.event);
    }
    expect(events[0]).toBe(AgentEventType.AgentStart);
    expect(events.at(-1)).toBe(AgentEventType.AgentEnd);
  });
});
