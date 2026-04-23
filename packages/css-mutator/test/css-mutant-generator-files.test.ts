import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolve } from "node:path";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { generateCssMutants } from "../src/css-mutant-generator.ts";

const TEST_DIR = resolve(import.meta.dirname, ".test-gen-files");

describe("generateCssMutants with files", () => {
  beforeAll(() => {
    mkdirSync(resolve(TEST_DIR, "src"), { recursive: true });
    writeFileSync(
      resolve(TEST_DIR, "src/button.css"),
      ".btn { color: red; display: flex; padding: 8px; }",
    );
    writeFileSync(
      resolve(TEST_DIR, "src/card.css"),
      ".card { background: white; border-radius: 8px; }",
    );
  });

  afterAll(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  it("finds and generates mutants from CSS files", async () => {
    const mutants = await generateCssMutants({
      files: ["src/**/*.css"],
      cwd: TEST_DIR,
    });

    expect(mutants.length).toBeGreaterThan(5);
    const files = new Set(mutants.map((m) => m.fileName));
    expect(files.size).toBe(2);
  });

  it("filters by mutator name", async () => {
    const mutants = await generateCssMutants({
      files: ["src/**/*.css"],
      cwd: TEST_DIR,
      mutators: ["ColorMutator"],
    });

    expect(mutants.every((m) => m.mutatorName === "ColorMutator")).toBe(true);
  });

  it("excludes mutators", async () => {
    const mutants = await generateCssMutants({
      files: ["src/**/*.css"],
      cwd: TEST_DIR,
      excludeMutators: ["ColorMutator", "SpacingMutator"],
    });

    expect(mutants.every((m) => m.mutatorName !== "ColorMutator")).toBe(true);
    expect(mutants.every((m) => m.mutatorName !== "SpacingMutator")).toBe(true);
  });

  it("excludes selectors", async () => {
    const mutants = await generateCssMutants({
      files: ["src/**/*.css"],
      cwd: TEST_DIR,
      excludeSelectors: [".card"],
    });

    expect(mutants.every((m) => m.selector !== ".card")).toBe(true);
    expect(mutants.some((m) => m.selector === ".btn")).toBe(true);
  });

  it("returns empty when no files match pattern", async () => {
    const mutants = await generateCssMutants({
      files: ["nonexistent/**/*.css"],
      cwd: TEST_DIR,
    });

    expect(mutants).toEqual([]);
  });

  it("deduplicates files from overlapping patterns", async () => {
    const mutants = await generateCssMutants({
      files: ["src/**/*.css", "src/button.css"],
      cwd: TEST_DIR,
    });

    // Should not have duplicate mutants from the same file
    const ids = mutants.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
