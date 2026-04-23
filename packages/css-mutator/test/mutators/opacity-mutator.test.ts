import { describe, it, expect } from "vitest";
import { OpacityMutator } from "../../src/mutators/opacity-mutator.ts";

describe("OpacityMutator", () => {
  const mutator = new OpacityMutator();

  it("handles only opacity property", () => {
    expect(mutator.handles("opacity")).toBe(true);
    expect(mutator.handles("color")).toBe(false);
  });

  it("mutates 1 to 0 and 0.5", () => {
    const result = mutator.mutate("opacity", "1");
    expect(result).toContain("0");
    expect(result).toContain("0.5");
  });

  it("mutates 0 to 1", () => {
    const result = mutator.mutate("opacity", "0");
    expect(result).toContain("1");
  });

  it("mutates partial opacity to 0 and 1", () => {
    const result = mutator.mutate("opacity", "0.5");
    expect(result).toContain("0");
    expect(result).toContain("1");
  });

  it("returns empty for non-numeric values", () => {
    expect(mutator.mutate("opacity", "inherit")).toEqual([]);
  });
});
