import { describe, it, expect } from "vitest";
import { SpacingMutator } from "../../src/mutators/spacing-mutator.ts";

describe("SpacingMutator", () => {
  const mutator = new SpacingMutator();

  it("handles margin and padding properties", () => {
    expect(mutator.handles("margin")).toBe(true);
    expect(mutator.handles("margin-top")).toBe(true);
    expect(mutator.handles("padding")).toBe(true);
    expect(mutator.handles("padding-left")).toBe(true);
    expect(mutator.handles("gap")).toBe(true);
    expect(mutator.handles("color")).toBe(false);
  });

  it("mutates positive spacing to zero", () => {
    const result = mutator.mutate("margin", "10px");
    expect(result).toContain("0px");
  });

  it("generates negative mutation for margin", () => {
    const result = mutator.mutate("margin", "10px");
    expect(result).toContain("-10px");
  });

  it("does not generate negative mutation for padding", () => {
    const result = mutator.mutate("padding", "10px");
    expect(result).not.toContain("-10px");
  });

  it("mutates zero to non-zero", () => {
    const result = mutator.mutate("padding", "0px");
    expect(result).toContain("16px");
  });

  it("mutates auto margin to 0", () => {
    const result = mutator.mutate("margin", "auto");
    expect(result).toContain("0");
  });

  it("zeros out multi-value shorthand", () => {
    const result = mutator.mutate("margin", "10px 20px");
    expect(result).toContain("0");
  });

  it("handles rem units", () => {
    const result = mutator.mutate("padding", "1rem");
    expect(result).toContain("0rem");
  });

  it("handles gap property", () => {
    const result = mutator.mutate("gap", "16px");
    expect(result).toContain("0px");
  });
});
