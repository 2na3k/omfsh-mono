import { describe, test, expect } from "bun:test";
import { parseSlashCommand, handleSlashCommand } from "../slash-commands.js";
import { createSession } from "../session.js";

describe("parseSlashCommand", () => {
  test("/model → model_list", () => {
    expect(parseSlashCommand("/model")).toEqual({ kind: "model_list" });
  });

  test("/model <id> → model_set", () => {
    expect(parseSlashCommand("/model claude-sonnet-4-6")).toEqual({
      kind: "model_set",
      modelId: "claude-sonnet-4-6",
    });
  });

  test("/clear → clear", () => {
    expect(parseSlashCommand("/clear")).toEqual({ kind: "clear" });
  });

  test("/exit → exit", () => {
    expect(parseSlashCommand("/exit")).toEqual({ kind: "exit" });
  });

  test("/quit → exit", () => {
    expect(parseSlashCommand("/quit")).toEqual({ kind: "exit" });
  });

  test("unknown command", () => {
    expect(parseSlashCommand("/foobar")).toEqual({ kind: "unknown", raw: "/foobar" });
  });

  test("trims whitespace", () => {
    expect(parseSlashCommand("  /clear  ")).toEqual({ kind: "clear" });
  });
});

describe("handleSlashCommand", () => {
  const session = createSession();

  test("model_list returns open_model_picker effect", () => {
    const effect = handleSlashCommand({ kind: "model_list" }, session);
    expect(effect.kind).toBe("open_model_picker");
  });

  test("model_set with valid id returns set_model effect", () => {
    const effect = handleSlashCommand({ kind: "model_set", modelId: "claude-haiku-4-5-20251001" }, session);
    expect(effect).toEqual({ kind: "set_model", modelId: "claude-haiku-4-5-20251001" });
  });

  test("model_set with invalid id returns error message", () => {
    const effect = handleSlashCommand({ kind: "model_set", modelId: "bogus-model" }, session);
    expect(effect.kind).toBe("add_message");
    if (effect.kind === "add_message") {
      expect(effect.message.text).toContain("bogus-model");
    }
  });

  test("clear returns clear effect", () => {
    const effect = handleSlashCommand({ kind: "clear" }, session);
    expect(effect).toEqual({ kind: "clear" });
  });

  test("unknown returns error message", () => {
    const effect = handleSlashCommand({ kind: "unknown", raw: "/blah" }, session);
    expect(effect.kind).toBe("add_message");
    if (effect.kind === "add_message") {
      expect(effect.message.role).toBe("system");
    }
  });
});
