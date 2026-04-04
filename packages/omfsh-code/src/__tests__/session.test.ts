import { describe, test, expect } from "bun:test";
import {
  createSession,
  clearSession,
  setModel,
  appendUiMessage,
  patchUiMessage,
  updateTokenCounts,
  syncContext,
} from "../session.js";
import { DEFAULT_MODEL_ID, SYSTEM_PROMPT } from "../constants.js";
import type { UiMessage } from "../types.js";
import type { AgentContext } from "@2na3k/omfsh-darwin";

function makeMsg(overrides: Partial<UiMessage> = {}): UiMessage {
  return { id: "test-id", role: "user", text: "hello", isStreaming: false, ...overrides };
}

describe("createSession", () => {
  test("uses default model", () => {
    const s = createSession();
    expect(s.modelId).toBe(DEFAULT_MODEL_ID);
  });

  test("uses provided model", () => {
    const s = createSession({ modelId: "claude-haiku-4-5-20251001" });
    expect(s.modelId).toBe("claude-haiku-4-5-20251001");
  });

  test("has empty messages and zero tokens", () => {
    const s = createSession();
    expect(s.messages).toEqual([]);
    expect(s.totalInputTokens).toBe(0);
    expect(s.totalOutputTokens).toBe(0);
  });

  test("sets system prompt in context", () => {
    const s = createSession();
    expect(s.context.systemPrompt).toBe(SYSTEM_PROMPT);
    expect(s.context.messages).toEqual([]);
  });
});

describe("clearSession", () => {
  test("resets messages, tokens, and context messages", () => {
    let s = createSession();
    s = appendUiMessage(s, makeMsg());
    s = updateTokenCounts(s, 100, 200);
    s = { ...s, context: { ...s.context, messages: [{ role: "user", content: "hi" }] } };

    const cleared = clearSession(s);
    expect(cleared.messages).toEqual([]);
    expect(cleared.totalInputTokens).toBe(0);
    expect(cleared.totalOutputTokens).toBe(0);
    expect(cleared.context.messages).toEqual([]);
  });

  test("preserves modelId and system prompt", () => {
    const s = createSession({ modelId: "claude-haiku-4-5-20251001" });
    const cleared = clearSession(s);
    expect(cleared.modelId).toBe("claude-haiku-4-5-20251001");
    expect(cleared.context.systemPrompt).toBe(s.context.systemPrompt);
  });
});

describe("setModel", () => {
  test("changes modelId", () => {
    const s = createSession();
    const updated = setModel(s, "claude-haiku-4-5-20251001");
    expect(updated.modelId).toBe("claude-haiku-4-5-20251001");
  });

  test("does not mutate original", () => {
    const s = createSession();
    setModel(s, "claude-haiku-4-5-20251001");
    expect(s.modelId).toBe(DEFAULT_MODEL_ID);
  });
});

describe("appendUiMessage", () => {
  test("appends message", () => {
    const s = createSession();
    const msg = makeMsg({ id: "a", text: "hello" });
    const updated = appendUiMessage(s, msg);
    expect(updated.messages).toHaveLength(1);
    expect(updated.messages[0]).toEqual(msg);
  });

  test("appends multiple messages in order", () => {
    let s = createSession();
    s = appendUiMessage(s, makeMsg({ id: "a" }));
    s = appendUiMessage(s, makeMsg({ id: "b" }));
    expect(s.messages.map((m) => m.id)).toEqual(["a", "b"]);
  });
});

describe("patchUiMessage", () => {
  test("patches matching message", () => {
    let s = createSession();
    s = appendUiMessage(s, makeMsg({ id: "x", text: "old" }));
    s = patchUiMessage(s, "x", { text: "new", isStreaming: false });
    expect(s.messages[0].text).toBe("new");
  });

  test("leaves other messages unchanged", () => {
    let s = createSession();
    s = appendUiMessage(s, makeMsg({ id: "x" }));
    s = appendUiMessage(s, makeMsg({ id: "y", text: "other" }));
    s = patchUiMessage(s, "x", { text: "changed" });
    expect(s.messages[1].text).toBe("other");
  });

  test("does nothing for unknown id", () => {
    let s = createSession();
    s = appendUiMessage(s, makeMsg({ id: "x" }));
    const before = s.messages[0];
    s = patchUiMessage(s, "nonexistent", { text: "changed" });
    expect(s.messages[0]).toEqual(before);
  });
});

describe("updateTokenCounts", () => {
  test("accumulates tokens", () => {
    let s = createSession();
    s = updateTokenCounts(s, 100, 200);
    s = updateTokenCounts(s, 50, 75);
    expect(s.totalInputTokens).toBe(150);
    expect(s.totalOutputTokens).toBe(275);
  });
});

describe("syncContext", () => {
  test("replaces context", () => {
    const s = createSession();
    const newCtx: AgentContext = { messages: [{ role: "user", content: "hi" }] };
    const updated = syncContext(s, newCtx);
    expect(updated.context).toEqual(newCtx);
  });
});
