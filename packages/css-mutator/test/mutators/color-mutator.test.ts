import { describe, it, expect } from "vitest";
import { ColorMutator } from "../../src/mutators/color-mutator.ts";

describe("ColorMutator", () => {
  const mutator = new ColorMutator();

  it("has correct name and description", () => {
    expect(mutator.name).toBe("ColorMutator");
    expect(mutator.description).toContain("color");
  });

  it("handles color-related properties", () => {
    expect(mutator.handles("color")).toBe(true);
    expect(mutator.handles("background-color")).toBe(true);
    expect(mutator.handles("border-color")).toBe(true);
    expect(mutator.handles("fill")).toBe(true);
    expect(mutator.handles("stroke")).toBe(true);
    expect(mutator.handles("display")).toBe(false);
    expect(mutator.handles("width")).toBe(false);
  });

  describe("named colors", () => {
    it("swaps red to blue and transparent", () => {
      const result = mutator.mutate("color", "red");
      expect(result).toContain("blue");
      expect(result).toContain("transparent");
    });

    it("swaps black to white and transparent", () => {
      const result = mutator.mutate("color", "black");
      expect(result).toContain("white");
      expect(result).toContain("transparent");
    });

    it("swaps white to black and transparent", () => {
      const result = mutator.mutate("color", "white");
      expect(result).toContain("black");
      expect(result).toContain("transparent");
    });

    it("swaps transparent to black", () => {
      const result = mutator.mutate("color", "transparent");
      expect(result).toContain("black");
    });

    it("is case-insensitive for named colors", () => {
      const result = mutator.mutate("color", "RED");
      expect(result).toContain("blue");
    });
  });

  describe("hex colors", () => {
    it("inverts hex colors", () => {
      const result = mutator.mutate("color", "#ff0000");
      expect(result).toContain("#00ffff");
      expect(result).toContain("transparent");
    });

    it("handles 3-char hex", () => {
      const result = mutator.mutate("color", "#f00");
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain("transparent");
    });

    it("inverts #000000 to #ffffff", () => {
      const result = mutator.mutate("color", "#000000");
      expect(result).toContain("#ffffff");
    });
  });

  describe("rgb colors", () => {
    it("inverts rgb values", () => {
      const result = mutator.mutate("color", "rgb(255, 0, 0)");
      expect(result.some((r) => r.includes("0, 255, 255"))).toBe(true);
      expect(result).toContain("transparent");
    });

    it("handles rgba", () => {
      const result = mutator.mutate("color", "rgba(100, 200, 50, 0.5)");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("hsl colors", () => {
    it("shifts hue by 180 degrees", () => {
      const result = mutator.mutate("color", "hsl(0, 100%, 50%)");
      expect(result.some((r) => r.includes("180"))).toBe(true);
    });

    it("wraps hue around 360", () => {
      const result = mutator.mutate("color", "hsl(200, 50%, 50%)");
      expect(result.some((r) => r.includes("20"))).toBe(true); // 200+180=380→20
    });
  });

  it("returns empty array for non-color values", () => {
    const result = mutator.mutate("color", "not-a-color");
    expect(result).toEqual([]);
  });
});
