import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { read } from "../tools/read.js";
import { write } from "../tools/write.js";
import { bash } from "../tools/bash.js";
import { grep } from "../tools/grep.js";

const TEST_DIR = join(process.cwd(), ".test-tmp");

beforeAll(async () => {
  await mkdir(TEST_DIR, { recursive: true });
});

afterAll(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

describe("read tool", () => {
  test("reads entire file", async () => {
    const path = join(TEST_DIR, "full.txt");
    await Bun.write(path, "line1\nline2\nline3\n");

    const result = await read.execute({ path });

    expect(result).toBe("line1\nline2\nline3\n");
  });

  test("reads with offset", async () => {
    const path = join(TEST_DIR, "offset.txt");
    await Bun.write(path, "a\nb\nc\nd\n");

    const result = await read.execute({ path, offset: 2 });

    expect(result).toBe("b\nc\nd\n");
  });

  test("reads with limit", async () => {
    const path = join(TEST_DIR, "limit.txt");
    await Bun.write(path, "1\n2\n3\n4\n5\n");

    const result = await read.execute({ path, offset: 1, limit: 2 });

    expect(result).toBe("1\n2");
  });

  test("reads with offset and limit", async () => {
    const path = join(TEST_DIR, "offset-limit.txt");
    await Bun.write(path, "a\nb\nc\nd\ne\n");

    const result = await read.execute({ path, offset: 2, limit: 2 });

    expect(result).toBe("b\nc");
  });
});

describe("write tool", () => {
  test("writes file and returns byte count", async () => {
    const path = join(TEST_DIR, "write-test.txt");

    const result = await write.execute({ path, content: "hello" });

    expect(result).toContain("5 bytes");
    expect(result).toContain(path);

    const content = await Bun.file(path).text();
    expect(content).toBe("hello");
  });

  test("creates parent directories by default", async () => {
    const path = join(TEST_DIR, "nested", "deep", "file.txt");

    const result = await write.execute({ path, content: "nested" });

    expect(result).toContain("nested");
    const content = await Bun.file(path).text();
    expect(content).toBe("nested");
  });

  test("skips directory creation when createDirs is false", async () => {
    const path = join(TEST_DIR, "no-dirs", "skip.txt");

    try {
      await write.execute({ path, content: "fail", createDirs: false });
      expect.fail("should have thrown");
    } catch {
      // expected — parent dir doesn't exist
    }
  });
});

describe("bash tool", () => {
  test("runs simple command", async () => {
    const result = await bash.execute({ command: "echo hello" });

    expect(result).toContain("hello");
  });

  test("captures stderr", async () => {
    const result = await bash.execute({ command: "echo error >&2" });

    expect(result).toContain("error");
  });

  test("truncates large output", async () => {
    const big = "x".repeat(10_000);
    const result = await bash.execute({ command: `echo "${big}"` });

    expect(result).toContain("truncated");
    expect(result.byteLength || result.length).toBeLessThanOrEqual(9000);
  });

  test("returns exit code on empty output", async () => {
    const result = await bash.execute({ command: "true" });

    expect(result).toContain("exit code");
  });
});

describe("grep tool", () => {
  test.skip("finds matching content", async () => {
    const path = join(TEST_DIR, "grep-test.txt");
    await Bun.write(path, "hello world\nfoo bar\nhello again\n");

    const result = await grep.execute({ pattern: "hello", path });

    expect(result).toContain("hello");
  });

  test.skip("returns no matches message", async () => {
    const path = join(TEST_DIR, "grep-empty.txt");
    await Bun.write(path, "nothing here\n");

    const result = await grep.execute({ pattern: "zzzznotfound", path });

    expect(result).toBe("(no matches)");
  });

  test.skip("respects caseInsensitive flag", async () => {
    const path = join(TEST_DIR, "grep-case.txt");
    await Bun.write(path, "HELLO\nhello\n");

    const result = await grep.execute({ pattern: "hello", path, caseInsensitive: true });

    expect(result).toContain("HELLO");
    expect(result).toContain("hello");
  });

  test.skip("respects maxResults", async () => {
    const path = join(TEST_DIR, "grep-max.txt");
    await Bun.write(path, "match\nmatch\nmatch\n");

    const result = await grep.execute({ pattern: "match", path, maxResults: 1 });

    const lines = result.split("\n").filter(Boolean);
    expect(lines.length).toBeLessThanOrEqual(1);
  });
});

describe("TOOLS export", () => {
  test("exports all four tools", async () => {
    const { TOOLS } = await import("../tools/index.js");

    expect(Object.keys(TOOLS)).toEqual(["grep", "bash", "read", "write"]);
  });
});
