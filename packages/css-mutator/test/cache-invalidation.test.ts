/**
 * Tests that the mutation cache correctly invalidates when test files change.
 *
 * Scenario: a CSS file has :hover rules that Survive because no test hovers.
 * The user adds a hover test. On the next run, the cache should detect the
 * test file change and re-run the previously-survived mutants.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolve } from "node:path";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import {
  hashFileChain,
  loadCache,
  saveCache,
  mutantKey,
  type MutationCacheData,
} from "../src/mutation-cache.ts";

const tmpDir = resolve(import.meta.dirname, ".test-cache-invalidation");

function setup() {
  mkdirSync(tmpDir, { recursive: true });
  writeFileSync(
    resolve(tmpDir, "button.css"),
    `.btn { color: red; }\n.btn:hover { color: blue; }`,
  );
  writeFileSync(
    resolve(tmpDir, "button.test.tsx"),
    `test("renders button", () => { /* no hover */ })`,
  );
}

function cleanup() {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
}

describe("cache invalidation on test file changes", () => {
  beforeEach(setup);
  afterEach(cleanup);

  const cssFile = () => resolve(tmpDir, "button.css");
  const testFile = () => resolve(tmpDir, "button.test.tsx");
  const cacheDir = () => resolve(tmpDir, "cache");

  it("invalidates when a hover test is added to existing test file", () => {
    const testFiles = [testFile()];

    // Run 1: compute hash, simulate "Survived" for :hover mutant
    const hash1 = hashFileChain(cssFile(), testFiles);
    const key = mutantKey(cssFile(), "color", "blue", "red", 2);
    const cache: MutationCacheData = {
      statuses: { [key]: "Survived" },
      cssHashes: { [cssFile()]: hash1 },
      killers: {},
    };
    saveCache(cacheDir(), cache);

    // User adds a hover test
    writeFileSync(
      testFile(),
      `test("renders button", () => {})\ntest("hovers button", () => { /* hover! */ })`,
    );

    // Run 2: recompute hash — should differ
    const hash2 = hashFileChain(cssFile(), testFiles);
    expect(hash2).not.toBe(hash1);

    // Load old cache, compare hashes
    const loaded = loadCache(cacheDir());
    const oldHash = loaded.cssHashes[cssFile()];
    expect(oldHash).toBe(hash1);
    expect(oldHash).not.toBe(hash2);

    // The orchestrator's check: oldHash !== newHash → skip cache → re-run
    const shouldUseCache = oldHash === hash2 && loaded.statuses[key] !== undefined;
    expect(shouldUseCache).toBe(false);
  });

  it("invalidates when a new test file is added to import chain", () => {
    const testFiles1 = [testFile()];
    const hash1 = hashFileChain(cssFile(), testFiles1);

    const cache: MutationCacheData = {
      statuses: { someKey: "Survived" },
      cssHashes: { [cssFile()]: hash1 },
      killers: {},
    };
    saveCache(cacheDir(), cache);

    // A new test file is created that also imports button.css
    const newTest = resolve(tmpDir, "button-hover.test.tsx");
    writeFileSync(newTest, `test("hovers button", () => {})`);
    const testFiles2 = [testFile(), newTest];

    const hash2 = hashFileChain(cssFile(), testFiles2);
    expect(hash2).not.toBe(hash1);
  });

  it("does NOT invalidate when nothing changed", () => {
    const testFiles = [testFile()];
    const hash1 = hashFileChain(cssFile(), testFiles);

    const cache: MutationCacheData = {
      statuses: { someKey: "Killed" },
      cssHashes: { [cssFile()]: hash1 },
      killers: {},
    };
    saveCache(cacheDir(), cache);

    // Nothing changed — hash should be the same
    const hash2 = hashFileChain(cssFile(), testFiles);
    expect(hash2).toBe(hash1);

    const loaded = loadCache(cacheDir());
    expect(loaded.cssHashes[cssFile()]).toBe(hash2);
  });

  it("invalidates when CSS file changes even if test unchanged", () => {
    const testFiles = [testFile()];
    const hash1 = hashFileChain(cssFile(), testFiles);

    const cache: MutationCacheData = {
      statuses: { someKey: "Survived" },
      cssHashes: { [cssFile()]: hash1 },
      killers: {},
    };
    saveCache(cacheDir(), cache);

    // Modify the CSS
    writeFileSync(cssFile(), `.btn { color: green; }\n.btn:hover { color: yellow; }`);
    const hash2 = hashFileChain(cssFile(), testFiles);
    expect(hash2).not.toBe(hash1);
  });

  it("invalidates when test file is deleted", () => {
    const testFiles = [testFile()];
    const hash1 = hashFileChain(cssFile(), testFiles);

    // Delete the test file — hashFileChain handles missing files
    rmSync(testFile());
    const hash2 = hashFileChain(cssFile(), testFiles);
    expect(hash2).not.toBe(hash1);
  });

  it("simulates full orchestrator cache decision flow", () => {
    const testFiles = [testFile()];

    // === Run 1: no hover test → :hover mutant Survived ===
    const hash1 = hashFileChain(cssFile(), testFiles);
    const hoverKey = mutantKey(cssFile(), "color", "blue", "red", 2);
    const normalKey = mutantKey(cssFile(), "color", "red", "green", 1);

    const run1Cache: MutationCacheData = {
      statuses: {
        [hoverKey]: "Survived",
        [normalKey]: "Killed",
      },
      cssHashes: { [cssFile()]: hash1 },
      killers: {
        [normalKey]: { file: "button.test.tsx", testName: "renders button" },
      },
    };
    saveCache(cacheDir(), run1Cache);

    // === User adds hover test ===
    writeFileSync(
      testFile(),
      `test("renders button", () => {})\ntest("hovers button", () => {})`,
    );

    // === Run 2: should detect change and re-run ===
    const loaded = loadCache(cacheDir());
    const hash2 = hashFileChain(cssFile(), testFiles);

    // Check each mutant's cache status
    const oldHash = loaded.cssHashes[cssFile()];
    const hashChanged = oldHash !== hash2;
    expect(hashChanged).toBe(true);

    // Hover mutant: hash changed → should NOT use cache → re-run
    const useHoverCache = !hashChanged && loaded.statuses[hoverKey] !== undefined;
    expect(useHoverCache).toBe(false);

    // Normal mutant: hash changed → also re-runs (correct — test might have changed)
    const useNormalCache = !hashChanged && loaded.statuses[normalKey] !== undefined;
    expect(useNormalCache).toBe(false);
  });
});
