import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolve } from "node:path";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { mutantKey, hashFile, hashFileChain, loadCache, saveCache } from "../src/mutation-cache.ts";

describe("mutantKey", () => {
  it("produces a stable key from mutant properties", () => {
    const key = mutantKey("/src/button.css", "color", "red", "blue", 5);
    expect(key).toBe("/src/button.css:5:color:red->blue");
  });

  it("different mutations produce different keys", () => {
    const k1 = mutantKey("/src/a.css", "color", "red", "blue", 5);
    const k2 = mutantKey("/src/a.css", "color", "red", "green", 5);
    const k3 = mutantKey("/src/a.css", "display", "flex", "none", 5);
    const k4 = mutantKey("/src/b.css", "color", "red", "blue", 5);
    expect(k1).not.toBe(k2);
    expect(k1).not.toBe(k3);
    expect(k1).not.toBe(k4);
  });

  it("same inputs produce same key", () => {
    const k1 = mutantKey("/x.css", "opacity", "1", "0", 10);
    const k2 = mutantKey("/x.css", "opacity", "1", "0", 10);
    expect(k1).toBe(k2);
  });
});

describe("hashFile", () => {
  const dir = resolve(import.meta.dirname, ".test-hash");

  beforeAll(() => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, "a.css"), ".btn { color: red; }");
    writeFileSync(resolve(dir, "b.css"), ".btn { color: blue; }");
  });

  afterAll(() => {
    if (existsSync(dir)) rmSync(dir, { recursive: true });
  });

  it("returns a hex string", () => {
    const hash = hashFile(resolve(dir, "a.css"));
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("same file produces same hash", () => {
    const h1 = hashFile(resolve(dir, "a.css"));
    const h2 = hashFile(resolve(dir, "a.css"));
    expect(h1).toBe(h2);
  });

  it("different files produce different hashes", () => {
    const h1 = hashFile(resolve(dir, "a.css"));
    const h2 = hashFile(resolve(dir, "b.css"));
    expect(h1).not.toBe(h2);
  });

  it("hash changes when file content changes", () => {
    const before = hashFile(resolve(dir, "a.css"));
    writeFileSync(resolve(dir, "a.css"), ".btn { color: green; }");
    const after = hashFile(resolve(dir, "a.css"));
    expect(before).not.toBe(after);
    // Restore
    writeFileSync(resolve(dir, "a.css"), ".btn { color: red; }");
  });
});

describe("hashFileChain", () => {
  const dir = resolve(import.meta.dirname, ".test-chain-hash");

  beforeAll(() => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, "a.css"), ".btn { color: red; }");
    writeFileSync(resolve(dir, "test1.tsx"), 'test("x", () => {})');
    writeFileSync(resolve(dir, "test2.tsx"), 'test("y", () => {})');
  });

  afterAll(() => {
    if (existsSync(dir)) rmSync(dir, { recursive: true });
  });

  it("includes test file content in hash", () => {
    const h1 = hashFileChain(resolve(dir, "a.css"), [resolve(dir, "test1.tsx")]);
    const h2 = hashFileChain(resolve(dir, "a.css"), [resolve(dir, "test2.tsx")]);
    expect(h1).not.toBe(h2);
  });

  it("hash changes when test file changes", () => {
    const before = hashFileChain(resolve(dir, "a.css"), [resolve(dir, "test1.tsx")]);
    writeFileSync(resolve(dir, "test1.tsx"), 'test("x modified", () => {})');
    const after = hashFileChain(resolve(dir, "a.css"), [resolve(dir, "test1.tsx")]);
    expect(before).not.toBe(after);
    writeFileSync(resolve(dir, "test1.tsx"), 'test("x", () => {})');
  });

  it("hash changes when CSS changes", () => {
    const before = hashFileChain(resolve(dir, "a.css"), [resolve(dir, "test1.tsx")]);
    writeFileSync(resolve(dir, "a.css"), ".btn { color: blue; }");
    const after = hashFileChain(resolve(dir, "a.css"), [resolve(dir, "test1.tsx")]);
    expect(before).not.toBe(after);
    writeFileSync(resolve(dir, "a.css"), ".btn { color: red; }");
  });

  it("hash changes when test file is added", () => {
    const h1 = hashFileChain(resolve(dir, "a.css"), [resolve(dir, "test1.tsx")]);
    const h2 = hashFileChain(resolve(dir, "a.css"), [
      resolve(dir, "test1.tsx"),
      resolve(dir, "test2.tsx"),
    ]);
    expect(h1).not.toBe(h2);
  });

  it("hash changes when a new test is added to existing test file", () => {
    const before = hashFileChain(resolve(dir, "a.css"), [resolve(dir, "test1.tsx")]);
    writeFileSync(
      resolve(dir, "test1.tsx"),
      'test("x", () => {})\ntest("new hover test", () => {})',
    );
    const after = hashFileChain(resolve(dir, "a.css"), [resolve(dir, "test1.tsx")]);
    expect(before).not.toBe(after);
    writeFileSync(resolve(dir, "test1.tsx"), 'test("x", () => {})');
  });

  it("hash changes when test file is removed from chain", () => {
    const withTwo = hashFileChain(resolve(dir, "a.css"), [
      resolve(dir, "test1.tsx"),
      resolve(dir, "test2.tsx"),
    ]);
    const withOne = hashFileChain(resolve(dir, "a.css"), [resolve(dir, "test1.tsx")]);
    expect(withTwo).not.toBe(withOne);
  });

  it("handles missing test files", () => {
    const h = hashFileChain(resolve(dir, "a.css"), ["/nonexistent.tsx"]);
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });

  it("same inputs produce same hash", () => {
    const h1 = hashFileChain(resolve(dir, "a.css"), [resolve(dir, "test1.tsx")]);
    const h2 = hashFileChain(resolve(dir, "a.css"), [resolve(dir, "test1.tsx")]);
    expect(h1).toBe(h2);
  });
});

describe("loadCache / saveCache", () => {
  const dir = resolve(import.meta.dirname, ".test-cache");

  afterAll(() => {
    if (existsSync(dir)) rmSync(dir, { recursive: true });
  });

  it("returns empty cache when no file exists", () => {
    const cache = loadCache(resolve(dir, "nonexistent"));
    expect(cache.killers).toEqual({});
    expect(cache.cssHashes).toEqual({});
    expect(cache.statuses).toEqual({});
  });

  it("saves and loads cache round-trip", () => {
    const data = {
      killers: {
        "f.css:1:color:red->blue": {
          file: "test/Button.test.tsx",
          testName: "primary button screenshot",
        },
      },
      cssHashes: { "/src/f.css": "abcdef0123456789" },
      statuses: { "f.css:1:color:red->blue": "Killed" },
    };
    saveCache(dir, data);
    const loaded = loadCache(dir);
    expect(loaded).toEqual(data);
  });

  it("handles corrupted statuses.json gracefully", () => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, "statuses.json"), "NOT VALID JSON{{{");
    const cache = loadCache(dir);
    expect(cache.statuses).toEqual({});
  });

  it("handles corrupted killers.json gracefully", () => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, "killers.json"), "NOT VALID{");
    const cache = loadCache(dir);
    expect(cache.killers).toEqual({});
  });

  it("loads statuses and killers independently", () => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      resolve(dir, "statuses.json"),
      JSON.stringify({
        statuses: { x: "Killed" },
        cssHashes: { y: "abc" },
      }),
    );
    writeFileSync(
      resolve(dir, "killers.json"),
      JSON.stringify({
        killers: { x: { file: "a.test.tsx", testName: "test 1" } },
      }),
    );
    const cache = loadCache(dir);
    expect(cache.statuses).toEqual({ x: "Killed" });
    expect(cache.killers).toEqual({ x: { file: "a.test.tsx", testName: "test 1" } });
  });

  it("overwrites existing cache", () => {
    saveCache(dir, {
      killers: { a: { file: "x", testName: "t1" } },
      cssHashes: { b: "y" },
      statuses: { a: "Killed" },
    });
    saveCache(dir, {
      killers: { c: { file: "z", testName: "t2" } },
      cssHashes: { d: "w" },
      statuses: { c: "Survived" },
    });
    const loaded = loadCache(dir);
    expect(loaded.killers).toEqual({ c: { file: "z", testName: "t2" } });
    expect(loaded.statuses).toEqual({ c: "Survived" });
  });
});
