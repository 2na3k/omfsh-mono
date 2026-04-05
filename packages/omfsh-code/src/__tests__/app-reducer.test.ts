import { describe, test, expect } from "bun:test";
import { appReducer } from "../ui/hooks/useAppReducer.js";
import type { AppState, AppAction } from "../ui/hooks/useAppReducer.js";
import type { SlashEffect } from "../types.js";
import { createSession } from "../session.js";
import { AgentEventType } from "@2na3k/omfsh-darwin";
import type { LoopYield, AgentState, StepResult } from "@2na3k/omfsh-darwin";

const mockAgentState: AgentState = {
  context: {},
  steps: [],
  totalInputTokens: 0,
  totalOutputTokens: 0,
  isRunning: true,
  isStreaming: false,
};

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    session: createSession(),
    status: { kind: "idle" },
    inputText: "",
    pendingPrompt: null,
    showModelPicker: false,
    slashMenuIndex: -1,
    streamingMessageId: null,
    streamingReasoningId: null,
    ...overrides,
  };
}

function agentEvent(event: LoopYield): AppAction {
  return { type: "AGENT_EVENT", event };
}

describe("appReducer: SUBMIT_PROMPT", () => {
  test("adds user message and sets running status", () => {
    const state = makeState();
    const ac = new AbortController();
    const action: AppAction = { type: "SUBMIT_PROMPT", text: "hello", abortController: ac };

    const next = appReducer(state, action);

    expect(next.session.messages).toHaveLength(1);
    expect(next.session.messages[0].role).toBe("user");
    expect(next.session.messages[0].text).toBe("hello");
    expect(next.status.kind).toBe("running");
    expect(next.pendingPrompt).toBe("hello");
    expect(next.inputText).toBe("");
  });

  test("clears input text", () => {
    const state = makeState({ inputText: "draft" });
    const ac = new AbortController();
    const action: AppAction = { type: "SUBMIT_PROMPT", text: "go", abortController: ac };

    const next = appReducer(state, action);

    expect(next.inputText).toBe("");
  });
});

describe("appReducer: INPUT_CHANGE", () => {
  test("updates input text", () => {
    const state = makeState();
    const action: AppAction = { type: "INPUT_CHANGE", text: "typing..." };

    const next = appReducer(state, action);

    expect(next.inputText).toBe("typing...");
  });
});

describe("appReducer: AGENT_EVENT - message", () => {
  test("MessageStart adds assistant message and tracks streamingMessageId", () => {
    const state = makeState();
    const next = appReducer(state, agentEvent({ event: AgentEventType.MessageStart, state: mockAgentState }));

    expect(next.session.messages).toHaveLength(1);
    expect(next.session.messages[0]).toMatchObject({ role: "assistant", text: "", isStreaming: true });
    expect(next.streamingMessageId).toBe(next.session.messages[0].id);
  });

  test("MessageDelta appends text to streaming message", () => {
    let state = makeState();
    state = appReducer(state, agentEvent({ event: AgentEventType.MessageStart, state: mockAgentState }));
    state = appReducer(state, agentEvent({ event: AgentEventType.MessageDelta, delta: "Hello", state: mockAgentState }));

    expect(state.session.messages[0].text).toBe("Hello");
  });

  test("MessageDelta accumulates", () => {
    let state = makeState();
    state = appReducer(state, agentEvent({ event: AgentEventType.MessageStart, state: mockAgentState }));
    state = appReducer(state, agentEvent({ event: AgentEventType.MessageDelta, delta: "Hel", state: mockAgentState }));
    state = appReducer(state, agentEvent({ event: AgentEventType.MessageDelta, delta: "lo", state: mockAgentState }));

    expect(state.session.messages[0].text).toBe("Hello");
  });

  test("MessageEnd stops streaming and clears streamingMessageId", () => {
    let state = makeState();
    state = appReducer(state, agentEvent({ event: AgentEventType.MessageStart, state: mockAgentState }));
    state = appReducer(state, agentEvent({ event: AgentEventType.MessageEnd, state: mockAgentState }));

    expect(state.session.messages[0].isStreaming).toBe(false);
    expect(state.streamingMessageId).toBeNull();
  });
});

describe("appReducer: AGENT_EVENT - reasoning", () => {
  test("ReasoningStart adds reasoning message and tracks streamingReasoningId", () => {
    const state = makeState();
    const next = appReducer(state, agentEvent({ event: AgentEventType.ReasoningStart, state: mockAgentState }));

    expect(next.session.messages).toHaveLength(1);
    expect(next.session.messages[0]).toMatchObject({ role: "reasoning", text: "", isStreaming: true });
    expect(next.streamingReasoningId).toBe(next.session.messages[0].id);
  });

  test("ReasoningDelta appends text", () => {
    let state = makeState();
    state = appReducer(state, agentEvent({ event: AgentEventType.ReasoningStart, state: mockAgentState }));
    state = appReducer(state, agentEvent({ event: AgentEventType.ReasoningDelta, delta: "thinking", state: mockAgentState }));

    expect(state.session.messages[0].text).toBe("thinking");
  });

  test("ReasoningEnd stops streaming and clears streamingReasoningId", () => {
    let state = makeState();
    state = appReducer(state, agentEvent({ event: AgentEventType.ReasoningStart, state: mockAgentState }));
    state = appReducer(state, agentEvent({ event: AgentEventType.ReasoningEnd, state: mockAgentState }));

    expect(state.session.messages[0].isStreaming).toBe(false);
    expect(state.streamingReasoningId).toBeNull();
  });
});

describe("appReducer: AGENT_EVENT - tool", () => {
  test("ToolCallStart adds tool message using toolCallId as id", () => {
    const state = makeState();
    const next = appReducer(state, agentEvent({
      event: AgentEventType.ToolCallStart,
      toolCallId: "tc1",
      toolName: "read",
      state: mockAgentState,
    }));

    expect(next.session.messages).toHaveLength(1);
    expect(next.session.messages[0]).toMatchObject({
      id: "tc1",
      role: "tool",
      toolName: "read",
      isStreaming: true,
    });
  });

  test("ToolCallEnd updates tool message with input/output by toolCallId", () => {
    let state = makeState();
    state = appReducer(state, agentEvent({
      event: AgentEventType.ToolCallStart,
      toolCallId: "tc1",
      toolName: "read",
      state: mockAgentState,
    }));
    state = appReducer(state, agentEvent({
      event: AgentEventType.ToolCallEnd,
      toolCallId: "tc1",
      toolName: "read",
      input: { path: "foo.txt" },
      output: "content",
      state: mockAgentState,
    }));

    const toolMsg = state.session.messages.find((m) => m.id === "tc1");
    expect(toolMsg).toBeDefined();
    expect(toolMsg?.toolInput).toEqual({ path: "foo.txt" });
    expect(toolMsg?.toolOutput).toBe("content");
    expect(toolMsg?.isStreaming).toBe(false);
  });
});

describe("appReducer: AGENT_EVENT - TurnEnd", () => {
  test("updates token counts and context from step and state", () => {
    const state = makeState();
    const newCtx = { messages: [{ role: "assistant", content: "done" }] };
    const step: StepResult = { text: "", toolCalls: [], toolResults: [], finishReason: "end_turn", inputTokens: 50, outputTokens: 100, responseMessages: [] };
    const next = appReducer(state, agentEvent({
      event: AgentEventType.TurnEnd,
      step,
      state: { ...mockAgentState, context: newCtx },
    }));

    expect(next.session.totalInputTokens).toBe(50);
    expect(next.session.totalOutputTokens).toBe(100);
    expect(next.session.context).toEqual(newCtx);
  });
});

describe("appReducer: AGENT_EVENT - AgentEnd", () => {
  test("sets status to idle and clears pending prompt", () => {
    let state = makeState();
    const ac = new AbortController();
    state = appReducer(state, { type: "SUBMIT_PROMPT", text: "go", abortController: ac });

    const next = appReducer(state, agentEvent({ event: AgentEventType.AgentEnd, state: mockAgentState }));

    expect(next.status.kind).toBe("idle");
    expect(next.pendingPrompt).toBeNull();
  });
});

describe("appReducer: SET_STATUS - error", () => {
  test("sets error status with message", () => {
    const state = makeState();
    const next = appReducer(state, { type: "SET_STATUS", status: { kind: "error", message: "something broke" } });

    expect(next.status.kind).toBe("error");
    if (next.status.kind === "error") {
      expect(next.status.message).toBe("something broke");
    }
  });
});

describe("appReducer: SLASH_EFFECT", () => {
  test("add_message appends system message", () => {
    const state = makeState();
    const effect: SlashEffect = {
      kind: "add_message",
      message: { id: "sys1", role: "system", text: "info", isStreaming: false },
    };

    const next = appReducer(state, { type: "SLASH_EFFECT", effect });

    expect(next.session.messages).toHaveLength(1);
    expect(next.session.messages[0].role).toBe("system");
  });

  test("set_model changes model", () => {
    const state = makeState();
    const effect: SlashEffect = { kind: "set_model", modelId: "claude-haiku-4-5-20251001" };

    const next = appReducer(state, { type: "SLASH_EFFECT", effect });

    expect(next.session.modelId).toBe("claude-haiku-4-5-20251001");
  });

  test("clear resets session", () => {
    let state = makeState();
    state = appReducer(state, { type: "SLASH_EFFECT", effect: { kind: "add_message", message: { id: "x", role: "user", text: "hi", isStreaming: false } } });
    const step: StepResult = { text: "", toolCalls: [], toolResults: [], finishReason: "end_turn", inputTokens: 10, outputTokens: 20, responseMessages: [] };
    state = appReducer(state, agentEvent({
      event: AgentEventType.TurnEnd,
      step,
      state: { ...mockAgentState, context: { messages: [] } },
    }));

    const next = appReducer(state, { type: "SLASH_EFFECT", effect: { kind: "clear" } });

    expect(next.session.messages).toEqual([]);
    expect(next.session.totalInputTokens).toBe(0);
    expect(next.session.totalOutputTokens).toBe(0);
    expect(next.session.context.messages).toEqual([]);
  });
});

describe("appReducer: SET_STATUS", () => {
  test("replaces status", () => {
    const state = makeState();
    const ac = new AbortController();
    const action: AppAction = { type: "SET_STATUS", status: { kind: "running", abortController: ac } };

    const next = appReducer(state, action);

    expect(next.status.kind).toBe("running");
  });
});

describe("appReducer: SLASH_EFFECT - open_model_picker", () => {
  test("opens model picker", () => {
    const state = makeState();
    const effect: SlashEffect = { kind: "open_model_picker" };

    const next = appReducer(state, { type: "SLASH_EFFECT", effect });

    expect(next.showModelPicker).toBe(true);
  });
});

describe("appReducer: TOGGLE_MODEL_PICKER", () => {
  test("shows model picker", () => {
    const state = makeState();
    const next = appReducer(state, { type: "TOGGLE_MODEL_PICKER", show: true });

    expect(next.showModelPicker).toBe(true);
  });

  test("hides model picker", () => {
    const state = makeState({ showModelPicker: true });
    const next = appReducer(state, { type: "TOGGLE_MODEL_PICKER", show: false });

    expect(next.showModelPicker).toBe(false);
  });
});

describe("appReducer: SELECT_MODEL", () => {
  test("changes model and closes picker", () => {
    const state = makeState({ showModelPicker: true });
    const next = appReducer(state, { type: "SELECT_MODEL", modelId: "claude-haiku-4-5-20251001" });

    expect(next.session.modelId).toBe("claude-haiku-4-5-20251001");
    expect(next.showModelPicker).toBe(false);
  });
});

describe("appReducer: full flow", () => {
  test("submit -> message stream -> AgentEnd", () => {
    let state = makeState();
    const ac = new AbortController();
    const step: StepResult = { text: "", toolCalls: [], toolResults: [], finishReason: "end_turn", inputTokens: 10, outputTokens: 20, responseMessages: [] };

    state = appReducer(state, { type: "SUBMIT_PROMPT", text: "test", abortController: ac });
    expect(state.pendingPrompt).toBe("test");
    expect(state.status.kind).toBe("running");

    state = appReducer(state, agentEvent({ event: AgentEventType.MessageStart, state: mockAgentState }));
    state = appReducer(state, agentEvent({ event: AgentEventType.MessageDelta, delta: "Hi", state: mockAgentState }));
    state = appReducer(state, agentEvent({ event: AgentEventType.MessageEnd, state: mockAgentState }));
    state = appReducer(state, agentEvent({
      event: AgentEventType.TurnEnd,
      step,
      state: { ...mockAgentState, context: { messages: [] } },
    }));
    state = appReducer(state, agentEvent({ event: AgentEventType.AgentEnd, state: mockAgentState }));

    expect(state.status.kind).toBe("idle");
    expect(state.pendingPrompt).toBeNull();
    expect(state.session.messages).toHaveLength(2);
    expect(state.session.totalInputTokens).toBe(10);
    expect(state.session.totalOutputTokens).toBe(20);
  });
});
