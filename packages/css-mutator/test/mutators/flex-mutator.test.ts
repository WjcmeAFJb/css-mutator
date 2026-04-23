import { describe, it, expect } from "vitest";
import { FlexMutator } from "../../src/mutators/flex-mutator.ts";

describe("FlexMutator", () => {
  const mutator = new FlexMutator();

  it("handles flex properties", () => {
    expect(mutator.handles("flex-direction")).toBe(true);
    expect(mutator.handles("justify-content")).toBe(true);
    expect(mutator.handles("align-items")).toBe(true);
    expect(mutator.handles("flex-grow")).toBe(true);
    expect(mutator.handles("color")).toBe(false);
  });

  describe("flex-direction", () => {
    it("swaps row to column and row-reverse", () => {
      const result = mutator.mutate("flex-direction", "row");
      expect(result).toContain("column");
      expect(result).toContain("row-reverse");
    });

    it("swaps column to row and column-reverse", () => {
      const result = mutator.mutate("flex-direction", "column");
      expect(result).toContain("row");
      expect(result).toContain("column-reverse");
    });
  });

  describe("justify-content", () => {
    it("swaps center to flex-start and flex-end", () => {
      const result = mutator.mutate("justify-content", "center");
      expect(result).toContain("flex-start");
      expect(result).toContain("flex-end");
    });

    it("swaps space-between to center and flex-start", () => {
      const result = mutator.mutate("justify-content", "space-between");
      expect(result).toContain("center");
    });
  });

  describe("flex-grow/shrink", () => {
    it("mutates 0 to 1", () => {
      expect(mutator.mutate("flex-grow", "0")).toContain("1");
    });

    it("mutates 1 to 0", () => {
      expect(mutator.mutate("flex-grow", "1")).toContain("0");
    });
  });

  describe("flex-wrap", () => {
    it("swaps nowrap to wrap", () => {
      expect(mutator.mutate("flex-wrap", "nowrap")).toContain("wrap");
    });

    it("swaps wrap to nowrap", () => {
      expect(mutator.mutate("flex-wrap", "wrap")).toContain("nowrap");
    });
  });

  describe("order", () => {
    it("mutates 0 to -1 and 1", () => {
      const result = mutator.mutate("order", "0");
      expect(result).toContain("-1");
      expect(result).toContain("1");
    });
  });
});
