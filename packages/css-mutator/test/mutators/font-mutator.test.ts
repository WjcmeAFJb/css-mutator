import { describe, it, expect } from "vitest";
import { FontMutator } from "../../src/mutators/font-mutator.ts";

describe("FontMutator", () => {
  const mutator = new FontMutator();

  it("handles font and text properties", () => {
    expect(mutator.handles("font-size")).toBe(true);
    expect(mutator.handles("font-weight")).toBe(true);
    expect(mutator.handles("text-align")).toBe(true);
    expect(mutator.handles("color")).toBe(false);
  });

  it("swaps font-weight bold to normal", () => {
    const result = mutator.mutate("font-weight", "bold");
    expect(result).toContain("normal");
  });

  it("swaps font-weight normal to bold", () => {
    const result = mutator.mutate("font-weight", "normal");
    expect(result).toContain("bold");
  });

  it("swaps numeric font weights", () => {
    expect(mutator.mutate("font-weight", "700")).toContain("400");
    expect(mutator.mutate("font-weight", "400")).toContain("700");
  });

  it("mutates font-size by doubling and halving", () => {
    const result = mutator.mutate("font-size", "16px");
    expect(result).toContain("32px");
    expect(result).toContain("8px");
  });

  it("swaps text-align directions", () => {
    expect(mutator.mutate("text-align", "left")).toContain("right");
    expect(mutator.mutate("text-align", "center")).toContain("left");
  });

  it("swaps text-transform", () => {
    expect(mutator.mutate("text-transform", "uppercase")).toContain("lowercase");
    expect(mutator.mutate("text-transform", "none")).toContain("uppercase");
  });

  it("swaps text-decoration", () => {
    expect(mutator.mutate("text-decoration", "underline")).toContain("none");
    expect(mutator.mutate("text-decoration", "none")).toContain("underline");
  });

  it("swaps font-style", () => {
    expect(mutator.mutate("font-style", "normal")).toContain("italic");
    expect(mutator.mutate("font-style", "italic")).toContain("normal");
  });

  it("mutates font-family to visually distinct fallback", () => {
    const result = mutator.mutate("font-family", "Arial, sans-serif");
    expect(result.some((r) => r === "serif" || r === "monospace")).toBe(true);
  });
});
