import { describe, test, expect, beforeEach } from "bun:test";
import { appReducer } from "../ui/hooks/useAppReducer.js";
import type { AppState, AppAction } from "../ui/hooks/useAppReducer.js";
import type { AgentRunnerEvent, SlashEffect } from "../types.js";
import { createSession } from "../session.js";

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    session: createSession(),
    status: { kind: "idle" },
    inputText: "",
    pendingPrompt: null,
    ...overrides,
  };
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
  test("message_start adds assistant message", () => {
    const state = makeState();
    const event: AgentRunnerEvent = { type: "message_start", messageId: "m1" };
    const action: AppAction = { type: "AGENT_EVENT", event };

    const next = appReducer(state, action);

    expect(next.session.messages).toHaveLength(1);
    expect(next.session.messages[0]).toMatchObject({
      id: "m1",
      role: "assistant",
      text: "",
      isStreaming: true,
    });
  });

  test("message_delta appends text", () => {
    let state = makeState();
    const start: AgentRunnerEvent = { type: "message_start", messageId: "m1" };
    state = appReducer(state, { type: "AGENT_EVENT", event: start });

    const delta: AgentRunnerEvent = { type: "message_delta", messageId: "m1", delta: "Hello" };
    state = appReducer(state, { type: "AGENT_EVENT", event: delta });

    expect(state.session.messages[0].text).toBe("Hello");
  });

  test("message_delta accumulates", () => {
    let state = makeState();
    state = appReducer(state, { type: "AGENT_EVENT", event: { type: "message_start", messageId: "m1" } });
    state = appReducer(state, { type: "AGENT_EVENT", event: { type: "message_delta", messageId: "m1", delta: "Hel" } });
    state = appReducer(state, { type: "AGENT_EVENT", event: { type: "message_delta", messageId: "m1", delta: "lo" } });

    expect(state.session.messages[0].text).toBe("Hello");
  });

  test("message_end stops streaming", () => {
    let state = makeState();
    state = appReducer(state, { type: "AGENT_EVENT", event: { type: "message_start", messageId: "m1" } });
    const end: AgentRunnerEvent = { type: "message_end", messageId: "m1" };

    const next = appReducer(state, { type: "AGENT_EVENT", event: end });

    expect(next.session.messages[0].isStreaming).toBe(false);
  });
});

describe("appReducer: AGENT_EVENT - reasoning", () => {
  test("reasoning_start adds reasoning message", () => {
    const state = makeState();
    const event: AgentRunnerEvent = { type: "reasoning_start", messageId: "r1" };

    const next = appReducer(state, { type: "AGENT_EVENT", event });

    expect(next.session.messages).toHaveLength(1);
    expect(next.session.messages[0]).toMatchObject({
      id: "r1",
      role: "reasoning",
      text: "",
      isStreaming: true,
    });
  });

  test("reasoning_delta appends text", () => {
    let state = makeState();
    state = appReducer(state, { type: "AGENT_EVENT", event: { type: "reasoning_start", messageId: "r1" } });
    state = appReducer(state, { type: "AGENT_EVENT", event: { type: "reasoning_delta", messageId: "r1", delta: "thinking" } });

    expect(state.session.messages[0].text).toBe("thinking");
  });

  test("reasoning_end stops streaming", () => {
    let state = makeState();
    state = appReducer(state, { type: "AGENT_EVENT", event: { type: "reasoning_start", messageId: "r1" } });
    const next = appReducer(state, { type: "AGENT_EVENT", event: { type: "reasoning_end", messageId: "r1" } });

    expect(next.session.messages[0].isStreaming).toBe(false);
  });
});

describe("appReducer: AGENT_EVENT - tool", () => {
  test("tool_start adds tool message", () => {
    const state = makeState();
    const event: AgentRunnerEvent = { type: "tool_start", toolCallId: "tc1", toolName: "read", messageId: "t1" };

    const next = appReducer(state, { type: "AGENT_EVENT", event });

    expect(next.session.messages).toHaveLength(1);
    expect(next.session.messages[0]).toMatchObject({
      id: "t1",
      role: "tool",
      toolName: "read",
      isStreaming: true,
    });
  });

  test("tool_end updates tool message with input/output", () => {
    let state = makeState();
    state = appReducer(state, { type: "AGENT_EVENT", event: { type: "tool_start", toolCallId: "tc1", toolName: "read", messageId: "t1" } });

    const toolEnd: AgentRunnerEvent = { type: "tool_end", toolCallId: "tc1", input: { path: "foo.txt" }, output: "content" };
    const next = appReducer(state, { type: "AGENT_EVENT", event: toolEnd });

    const toolMsg = next.session.messages.find((m) => m.id === "t1");
    expect(toolMsg).toBeDefined();
    expect(toolMsg?.toolInput).toEqual({ path: "foo.txt" });
    expect(toolMsg?.toolOutput).toBe("content");
    expect(toolMsg?.isStreaming).toBe(false);
  });
});

describe("appReducer: AGENT_EVENT - turn_end", () => {
  test("updates token counts and context", () => {
    const state = makeState();
    const newCtx = { messages: [{ role: "assistant", content: "done" }] };
    const event: AgentRunnerEvent = { type: "turn_end", inputTokens: 50, outputTokens: 100, context: newCtx };

    const next = appReducer(state, { type: "AGENT_EVENT", event });

    expect(next.session.totalInputTokens).toBe(50);
    expect(next.session.totalOutputTokens).toBe(100);
    expect(next.session.context).toEqual(newCtx);
  });
});

describe("appReducer: AGENT_EVENT - agent_end", () => {
  test("sets status to idle and clears pending prompt", () => {
    let state = makeState();
    const ac = new AbortController();
    state = appReducer(state, { type: "SUBMIT_PROMPT", text: "go", abortController: ac });

    const next = appReducer(state, { type: "AGENT_EVENT", event: { type: "agent_end" } });

    expect(next.status.kind).toBe("idle");
    expect(next.pendingPrompt).toBeNull();
  });
});

describe("appReducer: AGENT_EVENT - error", () => {
  test("sets error status with message", () => {
    const state = makeState();
    const event: AgentRunnerEvent = { type: "error", message: "something broke" };

    const next = appReducer(state, { type: "AGENT_EVENT", event });

    expect(next.status.kind).toBe("error");
    if (next.status.kind === "error") {
      expect(next.status.message).toBe("something broke");
    }
    expect(next.pendingPrompt).toBeNull();
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
    state = appReducer(state, { type: "AGENT_EVENT", event: { type: "turn_end", inputTokens: 10, outputTokens: 20, context: { messages: [] } } });

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

describe("appReducer: full flow", () => {
  test("submit -> message stream -> agent_end", () => {
    let state = makeState();
    const ac = new AbortController();

    state = appReducer(state, { type: "SUBMIT_PROMPT", text: "test", abortController: ac });
    expect(state.pendingPrompt).toBe("test");
    expect(state.status.kind).toBe("running");

    state = appReducer(state, { type: "AGENT_EVENT", event: { type: "message_start", messageId: "m1" } });
    state = appReducer(state, { type: "AGENT_EVENT", event: { type: "message_delta", messageId: "m1", delta: "Hi" } });
    state = appReducer(state, { type: "AGENT_EVENT", event: { type: "message_end", messageId: "m1" } });
    state = appReducer(state, { type: "AGENT_EVENT", event: { type: "turn_end", inputTokens: 10, outputTokens: 20, context: { messages: [] } } });
    state = appReducer(state, { type: "AGENT_EVENT", event: { type: "agent_end" } });

    expect(state.status.kind).toBe("idle");
    expect(state.pendingPrompt).toBeNull();
    expect(state.session.messages).toHaveLength(2);
    expect(state.session.totalInputTokens).toBe(10);
    expect(state.session.totalOutputTokens).toBe(20);
  });
});
