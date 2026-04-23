import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolve } from "node:path";
import { readFileSync, rmSync, existsSync } from "node:fs";
import { setActiveMutant } from "../src/vite-plugin.ts";

const TEST_STATE_DIR = resolve(import.meta.dirname, ".test-state");

describe("setActiveMutant", () => {
  beforeEach(() => {
    if (existsSync(TEST_STATE_DIR)) {
      rmSync(TEST_STATE_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (existsSync(TEST_STATE_DIR)) {
      rmSync(TEST_STATE_DIR, { recursive: true });
    }
  });

  it("creates state directory if it does not exist", () => {
    setActiveMutant("css-0", TEST_STATE_DIR);
    expect(existsSync(TEST_STATE_DIR)).toBe(true);
  });

  it("writes active mutant ID to state file", () => {
    setActiveMutant("css-42", TEST_STATE_DIR);

    const stateFile = resolve(TEST_STATE_DIR, "active-mutant.json");
    expect(existsSync(stateFile)).toBe(true);

    const data = JSON.parse(readFileSync(stateFile, "utf-8"));
    expect(data.activeMutant).toBe("css-42");
  });

  it("clears active mutant when set to null", () => {
    setActiveMutant("css-0", TEST_STATE_DIR);
    setActiveMutant(null, TEST_STATE_DIR);

    const stateFile = resolve(TEST_STATE_DIR, "active-mutant.json");
    const data = JSON.parse(readFileSync(stateFile, "utf-8"));
    expect(data.activeMutant).toBeNull();
  });
});
