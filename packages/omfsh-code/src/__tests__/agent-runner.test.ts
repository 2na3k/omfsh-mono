import { describe, test, expect, mock, beforeEach } from "bun:test";
import { runTurn } from "../agent-runner.js";
import type { Session, AgentRunnerEvent } from "../types.js";
import { createSession } from "../session.js";
import { runAgentLoop, AgentEventType } from "@2na3k/omfsh-darwin";

mock.module("@2na3k/omfsh-darwin", () => ({
  runAgentLoop: mock(),
  AgentEventType: {
    AgentStart: "agent_start",
    TurnStart: "turn_start",
    MessageStart: "message_start",
    MessageDelta: "message_delta",
    MessageEnd: "message_end",
    ReasoningStart: "reasoning_start",
    ReasoningDelta: "reasoning_delta",
    ReasoningEnd: "reasoning_end",
    ToolCallStart: "tool_call_start",
    ToolCallDelta: "tool_call_delta",
    ToolCallEnd: "tool_call_end",
    TurnEnd: "turn_end",
    AgentEnd: "agent_end",
  },
}));

function makeMockGenerator(events: unknown[]): AsyncGenerator {
  return (async function* gen() {
    for (const event of events) {
      yield event;
    }
  })();
}

function createTestSession(overrides: Partial<Session> = {}): Session {
  return { ...createSession(), ...overrides };
}

describe("runTurn", () => {
  beforeEach(() => {
    (runAgentLoop as ReturnType<typeof mock>).mockReset();
  });

  test("maps MessageStart event", async () => {
    const events: AgentRunnerEvent[] = [];
    (runAgentLoop as ReturnType<typeof mock>).mockReturnValue(
      makeMockGenerator([
        { event: AgentEventType.MessageStart },
        { event: AgentEventType.MessageEnd },
        { event: AgentEventType.AgentEnd },
      ]),
    );

    const session = createTestSession();
    const ac = new AbortController();
    await runTurn(session, "hello", (e) => events.push(e), ac.signal);

    expect(events).toContainEqual({ type: "message_start", messageId: expect.any(String) });
  });

  test("maps MessageDelta events with same messageId", async () => {
    const events: AgentRunnerEvent[] = [];
    (runAgentLoop as ReturnType<typeof mock>).mockReturnValue(
      makeMockGenerator([
        { event: AgentEventType.MessageStart },
        { event: AgentEventType.MessageDelta, delta: "Hel" },
        { event: AgentEventType.MessageDelta, delta: "lo" },
        { event: AgentEventType.MessageEnd },
        { event: AgentEventType.AgentEnd },
      ]),
    );

    const session = createTestSession();
    const ac = new AbortController();
    await runTurn(session, "hi", (e) => events.push(e), ac.signal);

    const deltas = events.filter((e) => e.type === "message_delta");
    expect(deltas).toHaveLength(2);
    expect(deltas[0].type === "message_delta" && deltas[0].delta).toBe("Hel");
    expect(deltas[1].type === "message_delta" && deltas[1].delta).toBe("lo");
  });

  test("maps ReasoningStart/End events", async () => {
    const events: AgentRunnerEvent[] = [];
    (runAgentLoop as ReturnType<typeof mock>).mockReturnValue(
      makeMockGenerator([
        { event: AgentEventType.ReasoningStart },
        { event: AgentEventType.ReasoningDelta, delta: "thinking..." },
        { event: AgentEventType.ReasoningEnd },
        { event: AgentEventType.AgentEnd },
      ]),
    );

    const session = createTestSession();
    const ac = new AbortController();
    await runTurn(session, "think", (e) => events.push(e), ac.signal);

    expect(events).toContainEqual({ type: "reasoning_start", messageId: expect.any(String) });
    expect(events).toContainEqual({ type: "reasoning_end", messageId: expect.any(String) });
    expect(events).toContainEqual({ type: "reasoning_delta", messageId: expect.any(String), delta: "thinking..." });
  });

  test("maps ToolCallStart/End events", async () => {
    const events: AgentRunnerEvent[] = [];
    (runAgentLoop as ReturnType<typeof mock>).mockReturnValue(
      makeMockGenerator([
        { event: AgentEventType.ToolCallStart, toolCallId: "tc1", toolName: "read" },
        { event: AgentEventType.ToolCallEnd, toolCallId: "tc1", input: { path: "x.txt" }, output: "data" },
        { event: AgentEventType.AgentEnd },
      ]),
    );

    const session = createTestSession();
    const ac = new AbortController();
    await runTurn(session, "read file", (e) => events.push(e), ac.signal);

    expect(events).toContainEqual({
      type: "tool_start",
      toolCallId: "tc1",
      toolName: "read",
      messageId: expect.any(String),
    });
    expect(events).toContainEqual({
      type: "tool_end",
      toolCallId: "tc1",
      input: { path: "x.txt" },
      output: "data",
    });
  });

  test("maps TurnEnd event with tokens and context", async () => {
    const events: AgentRunnerEvent[] = [];
    const ctx = { messages: [{ role: "assistant", content: "done" }] };
    (runAgentLoop as ReturnType<typeof mock>).mockReturnValue(
      makeMockGenerator([
        { event: AgentEventType.TurnEnd, step: { inputTokens: 100, outputTokens: 200 }, state: { context: ctx } },
        { event: AgentEventType.AgentEnd },
      ]),
    );

    const session = createTestSession();
    const ac = new AbortController();
    await runTurn(session, "go", (e) => events.push(e), ac.signal);

    expect(events).toContainEqual({
      type: "turn_end",
      inputTokens: 100,
      outputTokens: 200,
      context: ctx,
    });
  });

  test("maps AgentEnd event", async () => {
    const events: AgentRunnerEvent[] = [];
    (runAgentLoop as ReturnType<typeof mock>).mockReturnValue(
      makeMockGenerator([
        { event: AgentEventType.AgentEnd },
      ]),
    );

    const session = createTestSession();
    const ac = new AbortController();
    await runTurn(session, "done", (e) => events.push(e), ac.signal);

    expect(events).toContainEqual({ type: "agent_end" });
  });

  test("respects abort signal", async () => {
    const events: AgentRunnerEvent[] = [];
    const ac = new AbortController();

    (runAgentLoop as ReturnType<typeof mock>).mockReturnValue(
      (async function* gen() {
        yield { event: AgentEventType.MessageStart };
        ac.abort();
        yield { event: AgentEventType.MessageDelta, delta: "should not appear" };
        yield { event: AgentEventType.AgentEnd };
      })(),
    );

    const session = createTestSession();
    await runTurn(session, "abort me", (e) => events.push(e), ac.signal);

    const hasDelta = events.some(
      (e) => e.type === "message_delta" && (e as { delta: string }).delta === "should not appear",
    );
    expect(hasDelta).toBe(false);
  });

  test("passes session modelId and context to runAgentLoop", async () => {
    const events: AgentRunnerEvent[] = [];
    (runAgentLoop as ReturnType<typeof mock>).mockReturnValue(
      makeMockGenerator([{ event: AgentEventType.AgentEnd }]),
    );

    const session = createTestSession({ modelId: "claude-haiku-4-5-20251001" });
    const ac = new AbortController();
    await runTurn(session, "test", (e) => events.push(e), ac.signal);

    expect(runAgentLoop).toHaveBeenCalledWith(
      "test",
      expect.objectContaining({ modelId: "claude-haiku-4-5-20251001" }),
      expect.any(Object),
    );
  });
});
