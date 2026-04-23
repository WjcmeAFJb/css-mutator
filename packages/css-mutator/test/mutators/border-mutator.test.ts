import { describe, it, expect } from "vitest";
import { BorderMutator } from "../../src/mutators/border-mutator.ts";

describe("BorderMutator", () => {
  const mutator = new BorderMutator();

  it("handles border properties", () => {
    expect(mutator.handles("border")).toBe(true);
    expect(mutator.handles("border-radius")).toBe(true);
    expect(mutator.handles("outline")).toBe(true);
    expect(mutator.handles("color")).toBe(false);
  });

  it("removes borders by replacing with none", () => {
    const result = mutator.mutate("border", "1px solid black");
    expect(result).toContain("none");
  });

  it("adds border when none", () => {
    const result = mutator.mutate("border", "none");
    expect(result).toContain("1px solid black");
  });

  it("mutates border-radius from value to 0 and 50%", () => {
    const result = mutator.mutate("border-radius", "8px");
    expect(result).toContain("0");
    expect(result).toContain("50%");
  });

  it("mutates border-radius from 0 to values", () => {
    const result = mutator.mutate("border-radius", "0px");
    expect(result).toContain("50%");
    expect(result).toContain("8px");
  });

  it("swaps border styles", () => {
    const result = mutator.mutate("border-style", "solid");
    expect(result).toContain("none");
    expect(result).toContain("dashed");
  });

  it("mutates border-width", () => {
    const result = mutator.mutate("border-width", "2px");
    expect(result).toContain("0");
  });
});
