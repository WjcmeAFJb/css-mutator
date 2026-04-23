import { describe, it, expect } from "vitest";
import { GridMutator } from "../../src/mutators/grid-mutator.ts";

describe("GridMutator", () => {
  const mutator = new GridMutator();

  it("handles grid properties", () => {
    expect(mutator.handles("grid-template-columns")).toBe(true);
    expect(mutator.handles("grid-template-rows")).toBe(true);
    expect(mutator.handles("grid-auto-flow")).toBe(true);
    expect(mutator.handles("grid-column")).toBe(true);
    expect(mutator.handles("display")).toBe(false);
  });

  it("mutates grid-template-columns repeat to 1fr", () => {
    const result = mutator.mutate("grid-template-columns", "repeat(3, 1fr)");
    expect(result).toContain("1fr");
  });

  it("mutates multi-column template to single", () => {
    const result = mutator.mutate("grid-template-columns", "1fr 2fr 1fr");
    expect(result).toContain("1fr");
    expect(result).toContain("none");
  });

  it("mutates none template to 1fr 1fr", () => {
    const result = mutator.mutate("grid-template-columns", "none");
    expect(result).toContain("1fr 1fr");
  });

  it("swaps grid-auto-flow row to column", () => {
    expect(mutator.mutate("grid-auto-flow", "row")).toContain("column");
  });

  it("mutates grid-column span", () => {
    const result = mutator.mutate("grid-column", "span 3");
    expect(result).toContain("span 2");
  });

  it("mutates grid-auto-columns auto to alternatives", () => {
    const result = mutator.mutate("grid-auto-columns", "auto");
    expect(result).toContain("min-content");
    expect(result).toContain("1fr");
  });
});
