import { describe, it, expect } from "vitest";
import { PositionMutator } from "../../src/mutators/position-mutator.ts";

describe("PositionMutator", () => {
  const mutator = new PositionMutator();

  it("handles position and offset properties", () => {
    expect(mutator.handles("position")).toBe(true);
    expect(mutator.handles("top")).toBe(true);
    expect(mutator.handles("left")).toBe(true);
    expect(mutator.handles("inset")).toBe(true);
    expect(mutator.handles("width")).toBe(false);
  });

  it("swaps relative to static and absolute", () => {
    const result = mutator.mutate("position", "relative");
    expect(result).toContain("static");
    expect(result).toContain("absolute");
  });

  it("swaps fixed to static and absolute", () => {
    const result = mutator.mutate("position", "fixed");
    expect(result).toContain("static");
    expect(result).toContain("absolute");
  });

  it("mutates offset values to zero and negated", () => {
    const result = mutator.mutate("top", "20px");
    expect(result).toContain("0px");
    expect(result).toContain("-20px");
  });

  it("mutates auto offset to 0px", () => {
    const result = mutator.mutate("top", "auto");
    expect(result).toContain("0px");
  });

  it("mutates zero offset to 10", () => {
    const result = mutator.mutate("top", "0px");
    expect(result).toContain("10px");
  });
});
