import { describe, test, expect, mock, beforeEach } from "bun:test";
import { runTurn } from "../agent-runner.js";
import type { Session } from "../types.js";
import { createSession } from "../session.js";
import { runAgentLoop, AgentEventType } from "@2na3k/omfsh-darwin";
import type { LoopYield, AgentState } from "@2na3k/omfsh-darwin";

mock.module("@2na3k/omfsh-darwin", () => ({
  runAgentLoop: mock(),
  AgentEventType: {
    AgentStart:     "agent.start",
    AgentEnd:       "agent.end",
    TurnStart:      "turn.start",
    TurnEnd:        "turn.end",
    MessageStart:   "message.start",
    MessageDelta:   "message.delta",
    MessageEnd:     "message.end",
    ReasoningStart: "reasoning.start",
    ReasoningDelta: "reasoning.delta",
    ReasoningEnd:   "reasoning.end",
    ToolCallStart:  "tool_call.start",
    ToolCallDelta:  "tool_call.delta",
    ToolCallEnd:    "tool_call.end",
  },
}));

const mockState: AgentState = {
  context: {},
  steps: [],
  totalInputTokens: 0,
  totalOutputTokens: 0,
  isRunning: true,
  isStreaming: false,
};

function makeMockGenerator(events: LoopYield[]): AsyncGenerator<LoopYield> {
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

  test("passes LoopYield events through unchanged", async () => {
    const events: LoopYield[] = [];
    const loopEvents: LoopYield[] = [
      { event: AgentEventType.MessageStart, state: mockState },
      { event: AgentEventType.MessageDelta, delta: "Hello", state: mockState },
      { event: AgentEventType.MessageEnd, state: mockState },
      { event: AgentEventType.AgentEnd, state: mockState },
    ];
    (runAgentLoop as ReturnType<typeof mock>).mockReturnValue(makeMockGenerator(loopEvents));

    const session = createTestSession();
    const ac = new AbortController();
    await runTurn(session, "hello", (e) => events.push(e), ac.signal);

    expect(events).toEqual(loopEvents);
  });

  test("stops after abort", async () => {
    const events: LoopYield[] = [];
    const ac = new AbortController();

    (runAgentLoop as ReturnType<typeof mock>).mockReturnValue(
      (async function* gen() {
        yield { event: AgentEventType.MessageStart, state: mockState } as LoopYield;
        ac.abort();
        yield { event: AgentEventType.MessageDelta, delta: "should not appear", state: mockState } as LoopYield;
        yield { event: AgentEventType.AgentEnd, state: mockState } as LoopYield;
      })(),
    );

    const session = createTestSession();
    await runTurn(session, "abort me", (e) => events.push(e), ac.signal);

    expect(events).toHaveLength(1);
    expect(events[0].event).toBe(AgentEventType.MessageStart);
  });

  test("passes session modelId and context to runAgentLoop", async () => {
    (runAgentLoop as ReturnType<typeof mock>).mockReturnValue(
      makeMockGenerator([{ event: AgentEventType.AgentEnd, state: mockState }]),
    );

    const session = createTestSession({ modelId: "claude-haiku-4-5-20251001" });
    const ac = new AbortController();
    await runTurn(session, "test", () => {}, ac.signal);

    expect(runAgentLoop).toHaveBeenCalledWith(
      "test",
      expect.objectContaining({ modelId: "claude-haiku-4-5-20251001" }),
      expect.any(Object),
    );
  });
});
