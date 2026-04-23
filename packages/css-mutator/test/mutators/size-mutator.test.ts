import { describe, it, expect } from "vitest";
import { SizeMutator } from "../../src/mutators/size-mutator.ts";

describe("SizeMutator", () => {
  const mutator = new SizeMutator();

  it("handles width/height properties", () => {
    expect(mutator.handles("width")).toBe(true);
    expect(mutator.handles("height")).toBe(true);
    expect(mutator.handles("min-width")).toBe(true);
    expect(mutator.handles("max-height")).toBe(true);
    expect(mutator.handles("color")).toBe(false);
  });

  it("mutates pixel values to zero and double", () => {
    const result = mutator.mutate("width", "100px");
    expect(result).toContain("0px");
    expect(result).toContain("200px");
  });

  it("mutates rem values", () => {
    const result = mutator.mutate("width", "2rem");
    expect(result).toContain("0rem");
    expect(result).toContain("4rem");
  });

  it("mutates percentage values", () => {
    const result = mutator.mutate("width", "50%");
    expect(result).toContain("0%");
    expect(result).toContain("100%");
  });

  it("mutates auto to 0px and 100%", () => {
    const result = mutator.mutate("width", "auto");
    expect(result).toContain("0px");
    expect(result).toContain("100%");
  });

  it("mutates min-content/max-content", () => {
    expect(mutator.mutate("width", "min-content")).toContain("max-content");
    expect(mutator.mutate("width", "max-content")).toContain("min-content");
  });

  it("handles zero values", () => {
    const result = mutator.mutate("width", "0px");
    expect(result).not.toContain("0px"); // No self-mutation
  });

  it("generates negative mutations for positive values", () => {
    const result = mutator.mutate("width", "10px");
    expect(result).toContain("-10px");
  });
});
