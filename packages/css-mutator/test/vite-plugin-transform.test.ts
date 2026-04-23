import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolve } from "node:path";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { cssMutationVitePlugin, setActiveMutant } from "../src/vite-plugin.ts";
import type { CssMutant } from "../src/types.ts";

const TEST_DIR = resolve(import.meta.dirname, ".test-transform");
const TEST_STATE_DIR = resolve(TEST_DIR, "state");
const TEST_CSS_FILE = resolve(TEST_DIR, "test.css");

function makeMutant(overrides: Partial<CssMutant> = {}): CssMutant {
  return {
    id: "css-0",
    mutatorName: "ColorMutator",
    fileName: TEST_CSS_FILE,
    selector: ".btn",
    property: "color",
    original: "red",
    replacement: "blue",
    range: [14, 17],
    location: {
      start: { line: 1, column: 15, offset: 14 },
      end: { line: 1, column: 18, offset: 17 },
    },
    description: "ColorMutator: .btn { color: red -> blue }",
    ...overrides,
  };
}

describe("cssMutationVitePlugin transform", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_STATE_DIR, { recursive: true });
    writeFileSync(TEST_CSS_FILE, ".btn { color: red; }");
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  it("returns null for non-CSS files", () => {
    const mutant = makeMutant();
    const plugin = cssMutationVitePlugin({ mutants: [mutant], stateDir: TEST_STATE_DIR });
    const result = plugin.transform("code", "/some/file.ts");
    expect(result).toBeNull();
  });

  it("returns null when no active mutant", () => {
    const mutant = makeMutant();
    const plugin = cssMutationVitePlugin({ mutants: [mutant], stateDir: TEST_STATE_DIR });
    setActiveMutant(null, TEST_STATE_DIR);
    const result = plugin.transform("code", TEST_CSS_FILE);
    expect(result).toBeNull();
  });

  it("returns null when CSS file has no mutants", () => {
    const mutant = makeMutant({ fileName: "/other/file.css" });
    const plugin = cssMutationVitePlugin({ mutants: [mutant], stateDir: TEST_STATE_DIR });
    setActiveMutant("css-0", TEST_STATE_DIR);
    const result = plugin.transform("code", TEST_CSS_FILE);
    expect(result).toBeNull();
  });

  it("applies mutation when active mutant matches", () => {
    const mutant = makeMutant();
    const plugin = cssMutationVitePlugin({ mutants: [mutant], stateDir: TEST_STATE_DIR });
    setActiveMutant("css-0", TEST_STATE_DIR);

    const result = plugin.transform("ignored", TEST_CSS_FILE);
    expect(result).not.toBeNull();
    expect(result!.code).toBe(".btn { color: blue; }");
  });

  it("returns null when active mutant ID does not match file's mutants", () => {
    const mutant = makeMutant({ id: "css-1" });
    const plugin = cssMutationVitePlugin({ mutants: [mutant], stateDir: TEST_STATE_DIR });
    setActiveMutant("css-99", TEST_STATE_DIR);

    const result = plugin.transform("ignored", TEST_CSS_FILE);
    expect(result).toBeNull();
  });

  it("handles CSS files with query parameters", () => {
    const mutant = makeMutant();
    const plugin = cssMutationVitePlugin({ mutants: [mutant], stateDir: TEST_STATE_DIR });
    setActiveMutant("css-0", TEST_STATE_DIR);

    const result = plugin.transform("ignored", `${TEST_CSS_FILE}?used&direct`);
    expect(result).not.toBeNull();
    expect(result!.code).toBe(".btn { color: blue; }");
  });

  it("has correct plugin metadata", () => {
    const plugin = cssMutationVitePlugin({ mutants: [], stateDir: TEST_STATE_DIR });
    expect(plugin.name).toBe("css-mutator");
    expect(plugin.enforce).toBe("pre");
  });

  it("returns null when state file contains malformed JSON", () => {
    const mutant = makeMutant();
    const plugin = cssMutationVitePlugin({ mutants: [mutant], stateDir: TEST_STATE_DIR });
    // Write invalid JSON to the state file
    writeFileSync(resolve(TEST_STATE_DIR, "active-mutant.json"), "NOT_VALID_JSON{{{");

    const result = plugin.transform("ignored", TEST_CSS_FILE);
    expect(result).toBeNull();
  });
});
