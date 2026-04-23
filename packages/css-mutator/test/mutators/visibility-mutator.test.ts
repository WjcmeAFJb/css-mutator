import { describe, it, expect } from "vitest";
import { VisibilityMutator } from "../../src/mutators/visibility-mutator.ts";

describe("VisibilityMutator", () => {
  const mutator = new VisibilityMutator();

  it("handles visibility and overflow properties", () => {
    expect(mutator.handles("visibility")).toBe(true);
    expect(mutator.handles("overflow")).toBe(true);
    expect(mutator.handles("overflow-x")).toBe(true);
    expect(mutator.handles("pointer-events")).toBe(true);
    expect(mutator.handles("clip-path")).toBe(true);
    expect(mutator.handles("display")).toBe(false);
  });

  it("swaps visible to hidden", () => {
    expect(mutator.mutate("visibility", "visible")).toContain("hidden");
  });

  it("swaps hidden to visible", () => {
    expect(mutator.mutate("visibility", "hidden")).toContain("visible");
  });

  it("swaps overflow hidden to visible", () => {
    expect(mutator.mutate("overflow", "hidden")).toContain("visible");
  });

  it("swaps overflow visible to hidden and scroll", () => {
    const result = mutator.mutate("overflow", "visible");
    expect(result).toContain("hidden");
    expect(result).toContain("scroll");
  });

  it("swaps pointer-events auto to none", () => {
    expect(mutator.mutate("pointer-events", "auto")).toContain("none");
  });

  it("mutates clip-path none to circle(0%)", () => {
    expect(mutator.mutate("clip-path", "none")).toContain("circle(0%)");
  });

  it("mutates clip-path value to none", () => {
    expect(mutator.mutate("clip-path", "circle(50%)")).toContain("none");
  });
});
