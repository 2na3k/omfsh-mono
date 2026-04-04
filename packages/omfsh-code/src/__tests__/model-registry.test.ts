import { describe, test, expect } from "bun:test";
import { listModels, isValidModelId, formatModelLabel } from "../model-registry.js";

describe("listModels", () => {
  test("returns array of model ids", () => {
    const models = listModels();
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
  });

  test("includes known models", () => {
    const models = listModels();
    expect(models).toContain("claude-sonnet-4-6");
    expect(models).toContain("claude-haiku-4-5-20251001");
  });
});

describe("isValidModelId", () => {
  test("returns true for valid model", () => {
    expect(isValidModelId("claude-sonnet-4-6")).toBe(true);
  });

  test("returns false for unknown string", () => {
    expect(isValidModelId("not-a-real-model")).toBe(false);
  });

  test("returns false for empty string", () => {
    expect(isValidModelId("")).toBe(false);
  });
});

describe("formatModelLabel", () => {
  test("includes model id and provider", () => {
    const label = formatModelLabel("claude-sonnet-4-6");
    expect(label).toContain("claude-sonnet-4-6");
    expect(label).toContain("anthropic");
  });

  test("includes context window", () => {
    const label = formatModelLabel("claude-sonnet-4-6");
    expect(label).toContain("200");
  });
});
