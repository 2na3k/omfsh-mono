import { describe, it, expect } from "bun:test";
import { executeToolsParallel, buildToolMessage } from "../generate.js";
import type { ToolMap, ToolCallRecord } from "../types.js";

describe("executeToolsParallel", () => {
  it("executes all tools and returns results", async () => {
    const tools: ToolMap = {
      add: { description: "add", parameters: {}, execute: (input: unknown) => (input as { a: number }).a + 1 },
      greet: { description: "greet", parameters: {}, execute: (input: unknown) => `hi ${(input as { name: string }).name}` },
    };
    const calls: ToolCallRecord[] = [
      { toolCallId: "tc1", toolName: "add",   input: { a: 4 } },
      { toolCallId: "tc2", toolName: "greet", input: { name: "fish" } },
    ];

    const results = await executeToolsParallel(tools, calls);
    expect(results).toHaveLength(2);
    expect(results.find((r) => r.toolCallId === "tc1")?.output).toBe(5);
    expect(results.find((r) => r.toolCallId === "tc2")?.output).toBe("hi fish");
  });

  it("executes tools in parallel — total time close to max individual time, not sum", async () => {
    const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const tools: ToolMap = {
      slow1: { description: "", parameters: {}, execute: async () => { await delay(50); return "a"; } },
      slow2: { description: "", parameters: {}, execute: async () => { await delay(50); return "b"; } },
    };
    const calls: ToolCallRecord[] = [
      { toolCallId: "tc1", toolName: "slow1", input: {} },
      { toolCallId: "tc2", toolName: "slow2", input: {} },
    ];

    const start = Date.now();
    await executeToolsParallel(tools, calls);
    const elapsed = Date.now() - start;

    // parallel: should finish in ~50ms, not ~100ms
    expect(elapsed).toBeLessThan(90);
  });

  it("isolates tool failures — other tools still succeed", async () => {
    const tools: ToolMap = {
      good: { description: "", parameters: {}, execute: () => "ok" },
      bad:  { description: "", parameters: {}, execute: () => { throw new Error("boom"); } },
    };
    const calls: ToolCallRecord[] = [
      { toolCallId: "tc1", toolName: "good", input: {} },
      { toolCallId: "tc2", toolName: "bad",  input: {} },
    ];

    const results = await executeToolsParallel(tools, calls);
    expect(results).toHaveLength(2);
    expect(results.find((r) => r.toolCallId === "tc1")?.output).toBe("ok");
    expect((results.find((r) => r.toolCallId === "tc2")?.output as { error: string }).error).toBe("boom");
  });

  it("returns error output for unknown tool name", async () => {
    const tools: ToolMap = {};
    const calls: ToolCallRecord[] = [{ toolCallId: "tc1", toolName: "missing", input: {} }];

    const results = await executeToolsParallel(tools, calls);
    expect(results).toHaveLength(1);
    expect((results[0].output as { error: string }).error).toContain("missing");
  });

  it("preserves toolCallId and toolName in results", async () => {
    const tools: ToolMap = {
      echo: { description: "", parameters: {}, execute: (i: unknown) => i },
    };
    const calls: ToolCallRecord[] = [{ toolCallId: "my-id", toolName: "echo", input: "ping" }];

    const results = await executeToolsParallel(tools, calls);
    expect(results[0].toolCallId).toBe("my-id");
    expect(results[0].toolName).toBe("echo");
  });
});

describe("buildToolMessage", () => {
  it("builds a tool message from results", () => {
    const results = [
      { toolCallId: "tc1", toolName: "search", output: "found it" },
      { toolCallId: "tc2", toolName: "fetch",  output: { data: 42 } },
    ];
    const msg = buildToolMessage(results);
    expect(msg.role).toBe("tool");
    expect(msg.content).toHaveLength(2);
    expect(msg.content[0]).toEqual({ type: "tool-result", toolCallId: "tc1", toolName: "search", output: "found it" });
    expect(msg.content[1]).toEqual({ type: "tool-result", toolCallId: "tc2", toolName: "fetch",  output: { data: 42 } });
  });

  it("returns empty content for empty results", () => {
    const msg = buildToolMessage([]);
    expect(msg.role).toBe("tool");
    expect(msg.content).toHaveLength(0);
  });
});
