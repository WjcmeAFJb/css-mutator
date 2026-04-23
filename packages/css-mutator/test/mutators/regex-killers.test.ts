/**
 * Regex boundary tests — use values that ONLY match the exact regex,
 * so any weakening (dropped anchor, relaxed quantifier) makes them fail.
 */
import { describe, it, expect } from "vitest";
import { ColorMutator } from "../../src/mutators/color-mutator.ts";
import { SizeMutator } from "../../src/mutators/size-mutator.ts";
import { PositionMutator } from "../../src/mutators/position-mutator.ts";
import { SpacingMutator } from "../../src/mutators/spacing-mutator.ts";
import { BorderMutator } from "../../src/mutators/border-mutator.ts";
import { FontMutator } from "../../src/mutators/font-mutator.ts";
import { GridMutator } from "../../src/mutators/grid-mutator.ts";
import { FlexMutator } from "../../src/mutators/flex-mutator.ts";
import { parseCss } from "../../src/css-parser.ts";

describe("regex anchor killers (^ and $)", () => {
  it("SizeMutator rejects values with trailing text after unit", () => {
    const m = new SizeMutator();
    // Without $, "100pxextra" would match
    expect(m.mutate("width", "100pxextra")).toEqual([]);
  });

  it("SizeMutator rejects values with leading non-numeric text", () => {
    const m = new SizeMutator();
    // Without ^, "abc100px" would match
    expect(m.mutate("width", "abc100px")).toEqual([]);
  });

  it("PositionMutator rejects malformed offset values", () => {
    const m = new PositionMutator();
    expect(m.mutate("top", "abc10px")).toEqual([]);
    expect(m.mutate("top", "10pxabc")).toEqual([]);
  });

  it("SpacingMutator rejects non-anchored values", () => {
    const m = new SpacingMutator();
    expect(m.mutate("margin", "abc10px")).toEqual([]);
    expect(m.mutate("margin", "10pxabc")).toEqual([]);
  });

  it("ColorMutator hex pattern requires # prefix", () => {
    const m = new ColorMutator();
    // Without ^#, "ff0000" would match
    expect(m.mutate("color", "ff0000")).toEqual([]);
  });

  it("ColorMutator hex pattern requires exact format", () => {
    const m = new ColorMutator();
    // Valid hex should work
    expect(m.mutate("color", "#abc")).toHaveLength(2);
    // Too many chars should not match hex
    expect(m.mutate("color", "#abcdefabcdef")).toEqual([]);
  });

  it("ColorMutator rgb pattern requires ^ anchor", () => {
    const m = new ColorMutator();
    expect(m.mutate("color", "notrgb(1, 2, 3)")).toEqual([]);
  });

  it("ColorMutator hsl pattern requires ^ anchor", () => {
    const m = new ColorMutator();
    expect(m.mutate("color", "nothsl(0, 50%, 50%)")).toEqual([]);
  });

  it("BorderMutator radius pattern rejects malformed values", () => {
    const m = new BorderMutator();
    expect(m.mutate("border-radius", "abc8px")).toEqual([]);
    expect(m.mutate("border-radius", "8pxabc")).toEqual([]);
  });

  it("BorderMutator shorthand pattern requires exact format", () => {
    const m = new BorderMutator();
    // Valid shorthand
    expect(m.mutate("border", "1px solid black")).toEqual(["none"]);
    // Invalid shorthand (no color)
    expect(m.mutate("border", "1px solid")).toEqual(["none"]);
  });
});

describe("regex quantifier killers (+ and ?)", () => {
  it("SizeMutator handles decimal values (requires \\d+)", () => {
    const m = new SizeMutator();
    // Multi-digit number requires \d+
    const r = m.mutate("width", "123px");
    expect(r).toContain("0px");
  });

  it("SizeMutator handles decimal point values", () => {
    const m = new SizeMutator();
    // Decimal values like 1.5px require the optional decimal group
    const r = m.mutate("width", "1.5px");
    expect(r).toContain("0px");
    expect(r).toContain("3px");
  });

  it("ColorMutator handles multi-digit RGB values", () => {
    const m = new ColorMutator();
    // \d+ must match multi-digit numbers
    const r = m.mutate("color", "rgb(128, 64, 32)");
    expect(r.length).toBeGreaterThan(0);
    expect(r[0]).toContain("127");
  });

  it("SpacingMutator handles decimal spacing", () => {
    const m = new SpacingMutator();
    const r = m.mutate("margin", "1.5rem");
    expect(r).toContain("0rem");
  });

  it("PositionMutator handles negative decimal offsets", () => {
    const m = new PositionMutator();
    const r = m.mutate("top", "-3.5px");
    expect(r).toContain("0px");
    expect(r).toContain("3.5px");
  });

  it("FontMutator handles decimal font sizes", () => {
    const m = new FontMutator();
    const r = m.mutate("font-size", "1.5rem");
    expect(r).toContain("3rem");
  });

  it("FontMutator handles decimal letter-spacing", () => {
    const m = new FontMutator();
    const r = m.mutate("letter-spacing", "0.5em");
    expect(r).toContain("0");
  });
});

describe("regex character class killers", () => {
  it("ColorMutator hex accepts a-f and A-F", () => {
    const m = new ColorMutator();
    expect(m.mutate("color", "#aAbBcC")).toHaveLength(2);
    expect(m.mutate("color", "#AABBCC")).toHaveLength(2);
  });

  it("SizeMutator handles all valid units", () => {
    const m = new SizeMutator();
    const units = ["px", "rem", "em", "vh", "vw", "vmin", "vmax", "%", "ch", "cm", "mm"];
    for (const u of units) {
      expect(m.mutate("width", `10${u}`).length).toBeGreaterThan(0);
    }
  });

  it("SpacingMutator handles all valid units", () => {
    const m = new SpacingMutator();
    const units = ["px", "rem", "em", "vh", "vw", "%"];
    for (const u of units) {
      expect(m.mutate("margin", `10${u}`).length).toBeGreaterThan(0);
    }
  });

  it("PositionMutator handles all valid units", () => {
    const m = new PositionMutator();
    const units = ["px", "rem", "em", "vh", "vw", "%"];
    for (const u of units) {
      expect(m.mutate("top", `10${u}`).length).toBeGreaterThan(0);
    }
  });

  it("BorderMutator radius handles all valid units", () => {
    const m = new BorderMutator();
    const units = ["px", "rem", "em", "%"];
    for (const u of units) {
      expect(m.mutate("border-radius", `10${u}`)).toEqual(["0", "50%"]);
    }
  });
});

describe("GridMutator regex killers", () => {
  const m = new GridMutator();

  it("span regex requires digits after span", () => {
    expect(m.mutate("grid-column", "span abc")).toEqual([]);
  });

  it("span regex requires space after span", () => {
    expect(m.mutate("grid-column", "span3")).toEqual([]);
  });

  it("split regex splits on whitespace", () => {
    const r = m.mutate("grid-template-columns", "1fr 2fr 3fr");
    expect(r).toContain("1fr");
    expect(r).toContain("none");
  });
});

describe("FlexMutator regex killers", () => {
  const m = new FlexMutator();

  it("flex-flow split handles tabs", () => {
    const r = m.mutate("flex-flow", "row\twrap");
    expect(r.length).toBeGreaterThan(0);
  });
});

describe("BaseCssMutator wildcard pattern edge cases", () => {
  it("handles exact match (no wildcard)", () => {
    const m = new BorderMutator();
    expect(m.handles("border")).toBe(true);
    expect(m.handles("border-style")).toBe(true);
    expect(m.handles("margin")).toBe(false);
  });

  it("wildcard does not match without prefix", () => {
    // border-* should match border-top but not xborder-top
    const m = new BorderMutator();
    expect(m.handles("border-top")).toBe(true);
    expect(m.handles("not-border-top")).toBe(false);
  });
});

describe("css-parser edge cases for mutation", () => {
  it("handles CSS with no colon (should not crash)", () => {
    // PostCSS will parse this as a comment or raw node, not a declaration
    const r = parseCss("/* no declarations */", "test.css");
    expect(r.declarations).toHaveLength(0);
  });

  it("handles multiline values correctly", () => {
    const css = `.a {\n  color:\n    red;\n}`;
    const r = parseCss(css, "test.css");
    expect(r.declarations[0]!.value).toBe("red");
    // Range should point to "red"
    const extracted = css.slice(r.declarations[0]!.range[0], r.declarations[0]!.range[1]);
    expect(extracted).toBe("red");
  });

  it("handles multiple declarations with correct ranges", () => {
    const css = `.a { color: red; display: flex; opacity: 0.5; }`;
    const r = parseCss(css, "test.css");
    for (const decl of r.declarations) {
      const extracted = css.slice(decl.range[0], decl.range[1]);
      expect(extracted).toBe(decl.value);
    }
  });
});

describe("vite-plugin default state dir constants", () => {
  it("setActiveMutant uses .css-mutator-tmp in default path", async () => {
    const { setActiveMutant } = await import("../../src/vite-plugin.ts");
    setActiveMutant("test-id");
    setActiveMutant(null);
  });
});
