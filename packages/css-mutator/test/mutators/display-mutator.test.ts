import { describe, it, expect } from "vitest";
import { DisplayMutator } from "../../src/mutators/display-mutator.ts";

describe("DisplayMutator", () => {
  const mutator = new DisplayMutator();

  it("handles only display property", () => {
    expect(mutator.handles("display")).toBe(true);
    expect(mutator.handles("color")).toBe(false);
  });

  it("mutates block to none and inline", () => {
    const result = mutator.mutate("display", "block");
    expect(result).toContain("none");
    expect(result).toContain("inline");
  });

  it("mutates flex to block and none", () => {
    const result = mutator.mutate("display", "flex");
    expect(result).toContain("block");
    expect(result).toContain("none");
  });

  it("mutates grid to block and none", () => {
    const result = mutator.mutate("display", "grid");
    expect(result).toContain("block");
    expect(result).toContain("none");
  });

  it("mutates none to block", () => {
    const result = mutator.mutate("display", "none");
    expect(result).toContain("block");
  });

  it("mutates inline to block and none", () => {
    const result = mutator.mutate("display", "inline");
    expect(result).toContain("block");
    expect(result).toContain("none");
  });

  it("mutates inline-flex to flex and none", () => {
    const result = mutator.mutate("display", "inline-flex");
    expect(result).toContain("flex");
    expect(result).toContain("none");
  });

  it("returns empty for unknown values", () => {
    expect(mutator.mutate("display", "weird-value")).toEqual([]);
  });
});
