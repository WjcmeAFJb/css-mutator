/**
 * Targeted tests covering edge-case mutations on lookup keys and constants.
 * Organized by the exact surviving mutation for traceability.
 */
import { describe, it, expect } from "vitest";
import { ColorMutator } from "../../src/mutators/color-mutator.ts";
import { DisplayMutator } from "../../src/mutators/display-mutator.ts";
import { SizeMutator } from "../../src/mutators/size-mutator.ts";
import { PositionMutator } from "../../src/mutators/position-mutator.ts";
import { OpacityMutator } from "../../src/mutators/opacity-mutator.ts";
import { ZIndexMutator } from "../../src/mutators/z-index-mutator.ts";
import { BorderMutator } from "../../src/mutators/border-mutator.ts";
import { FontMutator } from "../../src/mutators/font-mutator.ts";
import { SpacingMutator } from "../../src/mutators/spacing-mutator.ts";
import { VisibilityMutator } from "../../src/mutators/visibility-mutator.ts";
import { FlexMutator } from "../../src/mutators/flex-mutator.ts";
import { GridMutator } from "../../src/mutators/grid-mutator.ts";
import { parseCss } from "../../src/css-parser.ts";
import { generateCssMutantsFromSource } from "../../src/css-mutant-generator.ts";
import { cssMutationVitePlugin, setActiveMutant } from "../../src/vite-plugin.ts";
import { resolve } from "node:path";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";

// === StringLiteral on lookup keys: verify non-matching keys return empty ===
// If a key like "none" were mutated to "", the lookup should return nothing
// rather than silently returning a stale result.

describe("lookup key mutations — verify keys matter", () => {
  it("display: empty string returns empty", () => {
    expect(new DisplayMutator().mutate("display", "")).toEqual([]);
  });
  it("opacity: empty string returns empty", () => {
    expect(new OpacityMutator().mutate("opacity", "")).toEqual([]);
  });
  it("z-index: empty string returns empty", () => {
    expect(new ZIndexMutator().mutate("z-index", "")).toEqual([]);
  });
  it("position: empty string returns empty", () => {
    expect(new PositionMutator().mutate("position", "")).toEqual([]);
  });
  it("visibility: empty string returns empty", () => {
    expect(new VisibilityMutator().mutate("visibility", "")).toEqual([]);
    expect(new VisibilityMutator().mutate("overflow", "")).toEqual([]);
  });
  it("border-style: empty string returns empty", () => {
    // With key mutation, "" key could match; verify it doesn't
    const m = new BorderMutator();
    expect(m.mutate("border-style", "")).toEqual([]);
    expect(m.mutate("border-radius", "")).toEqual([]);
  });
  it("flex: empty direction/wrap returns empty", () => {
    const m = new FlexMutator();
    expect(m.mutate("flex-direction", "")).toEqual([]);
    expect(m.mutate("flex-wrap", "")).toEqual([]);
    expect(m.mutate("justify-content", "")).toEqual([]);
  });
  it("grid: empty auto-flow returns empty, empty auto-columns returns auto", () => {
    const m = new GridMutator();
    expect(m.mutate("grid-auto-flow", "")).toEqual([]);
    // Empty string doesn't match any keyword, falls through to default
    expect(m.mutate("grid-auto-columns", "")).toEqual(["auto"]);
  });
  it("font: empty values return empty", () => {
    const m = new FontMutator();
    expect(m.mutate("font-weight", "")).toEqual([]);
    expect(m.mutate("font-style", "")).toEqual([]);
    expect(m.mutate("text-align", "")).toEqual([]);
    expect(m.mutate("text-transform", "")).toEqual([]);
    expect(m.mutate("text-decoration", "")).toEqual([]);
    expect(m.mutate("white-space", "")).toEqual([]);
  });
  it("size: empty string returns empty", () => {
    expect(new SizeMutator().mutate("width", "")).toEqual([]);
  });
  it("spacing: empty string returns empty", () => {
    expect(new SpacingMutator().mutate("margin", "")).toEqual([]);
  });
  it("color: empty string returns empty", () => {
    expect(new ColorMutator().mutate("color", "")).toEqual([]);
  });
});

// === Regex mutations: multi-digit, multi-space, decimal precision ===

describe("regex precision killers", () => {
  // \d+ vs \d — multi-digit numbers
  it("border shorthand with multi-digit width", () => {
    const m = new BorderMutator();
    expect(m.mutate("border", "12px solid black")).toEqual(["none"]);
    // Also verify decimal width
    expect(m.mutate("border", "1.5px solid black")).toEqual(["none"]);
  });
  it("border shorthand with decimal radius", () => {
    const m = new BorderMutator();
    expect(m.mutate("border-radius", "1.5px")).toEqual(["0", "50%"]);
    expect(m.mutate("border-radius", "12.5em")).toEqual(["0", "50%"]);
  });
  // \s+ vs \s — multiple whitespace chars
  it("border shorthand with multiple spaces", () => {
    const m = new BorderMutator();
    expect(m.mutate("border", "1px  solid  black")).toEqual(["none"]);
  });

  // RGB with various spacings
  it("rgb with no spaces after commas", () => {
    const m = new ColorMutator();
    expect(m.mutate("color", "rgb(10,20,30)")).toHaveLength(2);
  });
  it("rgb with extra spaces", () => {
    const m = new ColorMutator();
    expect(m.mutate("color", "rgb(  10 ,  20 ,  30 )")).toHaveLength(2);
  });
  it("rgb single-digit values", () => {
    const m = new ColorMutator();
    const r = m.mutate("color", "rgb(1, 2, 3)");
    expect(r.length).toBe(2);
    expect(r[0]).toContain("254, 253, 252");
  });
  it("hsl single-digit hue", () => {
    const m = new ColorMutator();
    const r = m.mutate("color", "hsl(5, 50%, 50%)");
    expect(r[0]).toContain("185");
  });

  // Font-size regex precision
  it("font-size multi-digit", () => {
    const m = new FontMutator();
    expect(m.mutate("font-size", "120px")).toEqual(["240px", "60px"]);
  });
  it("font-size decimal", () => {
    const m = new FontMutator();
    expect(m.mutate("font-size", "1.5rem")).toEqual(["3rem"]);
  });
  it("font-size single-digit", () => {
    const m = new FontMutator();
    expect(m.mutate("font-size", "8px")).toEqual(["16px", "4px"]);
  });
  it("letter-spacing decimal rem", () => {
    const m = new FontMutator();
    expect(m.mutate("letter-spacing", "1.5rem")).toEqual(["0", "-1.5rem"]);
  });

  // Spacing regex
  it("spacing single-digit value", () => {
    const m = new SpacingMutator();
    expect(m.mutate("margin", "5px")).toContain("0px");
  });
  it("spacing decimal value", () => {
    const m = new SpacingMutator();
    expect(m.mutate("margin", "1.5rem")).toContain("0rem");
  });

  // Split on whitespace (grid, spacing, flex)
  it("grid split on tab", () => {
    const m = new GridMutator();
    expect(m.mutate("grid-template-columns", "1fr\t2fr")).toContain("1fr");
  });
  it("spacing multi-value with tabs", () => {
    const m = new SpacingMutator();
    expect(m.mutate("margin", "10px\t20px")).toContain("0");
  });
  it("grid span single-digit", () => {
    const m = new GridMutator();
    expect(m.mutate("grid-column", "span 3")).toEqual(["span 2"]);
  });
  it("grid span with extra space", () => {
    const m = new GridMutator();
    expect(m.mutate("grid-column", "span  4")).toEqual(["span 3"]);
  });
  it("flex-flow with multiple spaces", () => {
    const m = new FlexMutator();
    const r = m.mutate("flex-flow", "row  wrap");
    expect(r.length).toBeGreaterThan(0);
  });

  // Size regex — required decimal quantifier
  it("size regex with decimal", () => {
    const m = new SizeMutator();
    expect(m.mutate("width", "12.5px")).toContain("0px");
  });
});

// === ArithmeticOperator in color inversion — verify exact arithmetic ===

describe("color inversion arithmetic", () => {
  const m = new ColorMutator();

  it("rgb inversion: each channel is 255 - original", () => {
    const r = m.mutate("color", "rgb(100, 150, 200)");
    // 255-100=155, 255-150=105, 255-200=55
    expect(r[0]).toContain("155, 105, 55");
  });

  it("3-char hex inversion: each char doubled then inverted", () => {
    // #abc → a=aa=170, b=bb=187, c=cc=204
    // inv: 255-170=85=55, 255-187=68=44, 255-204=51=33
    const r = m.mutate("color", "#abc");
    expect(r[0]).toBe("#554433");
  });

  it("hsl hue shift: exactly +180 mod 360", () => {
    const r = m.mutate("color", "hsl(90, 50%, 50%)");
    expect(r[0]).toContain("270");
  });

  it("hsl hue wrap: 200 + 180 = 380 → 20", () => {
    const r = m.mutate("color", "hsl(200, 50%, 50%)");
    expect(r[0]).toContain("20");
  });
});

// === ConditionalExpression and EqualityOperator boundary tests ===

describe("boundary condition killers", () => {
  it("size: num === 0 produces no mutations (skip self, no double/halve/negate)", () => {
    const m = new SizeMutator();
    const r = m.mutate("width", "0px");
    expect(r).toEqual([]);
  });

  it("size: num > 1 produces halved", () => {
    const m = new SizeMutator();
    const big = m.mutate("width", "4px");
    expect(big).toContain("2px"); // Math.round(4/2)=2
    expect(big).toContain("0px"); // zero
    expect(big).toContain("8px"); // double
    expect(big).toContain("-4px"); // negative
  });

  it("size: num === 1 produces 0, 2, -1 but no halve", () => {
    const m = new SizeMutator();
    const r = m.mutate("width", "1px");
    expect(r).toContain("0px");
    expect(r).toContain("2px");
    expect(r).toContain("-1px");
    // Math.round(1/2) = 1, which would be self-mutation, so no halving
  });

  it("size: num > 0 produces negative", () => {
    const m = new SizeMutator();
    expect(m.mutate("width", "5px")).toContain("-5px");
  });

  it("font-size: num > 0 doubles, num > 4 halves (Math.round)", () => {
    const m = new FontMutator();
    // 3px: > 0 so doubles, but NOT > 4 so no halving
    expect(m.mutate("font-size", "3px")).toEqual(["6px"]);
    // 5px: > 0 doubles, > 4 halves — Math.round(5/2) = 3
    const r = m.mutate("font-size", "5px");
    expect(r).toContain("10px");
    expect(r).toContain("3px");
  });

  it("font line-height: num > 0 and not NaN", () => {
    const m = new FontMutator();
    // 0 is not > 0
    expect(m.mutate("line-height", "0")).toEqual([]);
    // negative
    expect(m.mutate("line-height", "-1")).toEqual([]);
  });

  it("spacing: num !== 0 produces zero", () => {
    const m = new SpacingMutator();
    const r = m.mutate("padding", "1px");
    expect(r).toContain("0px");
    const r0 = m.mutate("padding", "0px");
    expect(r0).not.toContain("0px");
  });

  it("spacing: num >= 0 and margin produces negative", () => {
    const m = new SpacingMutator();
    const r = m.mutate("margin", "5px");
    expect(r).toContain("-5px");
    // For 0, num >= 0 is true but num > 0 is false, so -0 → 10
    const r0 = m.mutate("margin", "0px");
    expect(r0).toContain("10px");
  });

  it("spacing: multi-value with single part does not match", () => {
    // parts.length > 1 check
    const m = new SpacingMutator();
    const r = m.mutate("margin", "10px");
    // Single value goes through the SPACING_PATTERN branch, not multi-value
    expect(r).toContain("0px");
  });
});

// === MethodExpression: .trim() on opacity ===

describe("method expression killers", () => {
  it("opacity with whitespace", () => {
    const m = new OpacityMutator();
    expect(m.mutate("opacity", "  0.5  ")).toEqual(["0", "1"]);
  });
});

// === css-mutant-generator: template literal mutations, idCounter ===

describe("css-mutant-generator survivors", () => {
  it("generates unique sequential IDs", () => {
    const mutants = generateCssMutantsFromSource(
      ".a { color: red; } .b { color: blue; }",
      "test.css",
    );
    // IDs should be sequential css-0, css-1, ...
    for (let i = 0; i < mutants.length; i++) {
      expect(mutants[i]!.id).toBe(`css-${i}`);
    }
  });

  it("descriptions contain all parts", () => {
    const mutants = generateCssMutantsFromSource(".x { display: flex; }", "f.css");
    for (const m of mutants) {
      expect(m.description).toContain(m.mutatorName);
      expect(m.description).toContain(m.selector);
      expect(m.description).toContain(m.property);
      expect(m.description).toContain(m.original);
      expect(m.description).toContain(m.replacement);
      expect(m.description).toContain("→");
    }
  });

  it("only processes mutators that handle the property", () => {
    const mutants = generateCssMutantsFromSource(".a { opacity: 0.5; }", "f.css");
    // Only OpacityMutator handles opacity
    expect(mutants.every((m) => m.mutatorName === "OpacityMutator")).toBe(true);
  });

  it("selector exclusion regex requires / delimiters", () => {
    // Without proper regex parsing (startsWith/endsWith /), the regex branch won't fire
    const mutants = generateCssMutantsFromSource(
      ".skip-me { color: red; } .keep { color: blue; }",
      "f.css",
      { excludeSelectors: ["/.skip/"] },
    );
    expect(mutants.every((m) => !m.selector.includes(".skip"))).toBe(true);
  });

  it("selector exclusion with plain string", () => {
    const mutants = generateCssMutantsFromSource(
      ".skip { color: red; } .keep { color: blue; }",
      "f.css",
      { excludeSelectors: [".skip"] },
    );
    expect(mutants.every((m) => m.selector !== ".skip")).toBe(true);
    expect(mutants.length).toBeGreaterThan(0);
  });
});

// === css-parser: ObjectLiteral, StringLiteral, ConditionalExpression ===

describe("css-parser survivors", () => {
  it("declaration location has correct structure", () => {
    const r = parseCss(".a { color: red; }", "t.css");
    const d = r.declarations[0]!;
    expect(d.location.start.line).toBe(1);
    expect(d.location.start.column).toBeGreaterThan(0);
    expect(d.location.start.offset).toBeGreaterThanOrEqual(0);
    expect(d.location.end.line).toBe(1);
    expect(d.location.end.column).toBeGreaterThan(d.location.start.column);
    expect(d.location.end.offset).toBeGreaterThan(d.location.start.offset);
  });

  it("(root) selector for declarations without rule parent", () => {
    // A declaration at root level (no selector) should get "(root)"
    // This is unusual CSS but valid PostCSS
    const r = parseCss("color: red;", "t.css");
    expect(r.declarations[0]!.selector).toBe("(root)");
  });

  it("multiline value — colon offset search spans lines", () => {
    const css = ".a {\n  color:\n    red;\n}";
    const r = parseCss(css, "t.css");
    expect(r.declarations[0]!.value).toBe("red");
    const extracted = css.slice(r.declarations[0]!.range[0], r.declarations[0]!.range[1]);
    expect(extracted).toBe("red");
  });

  it("offsetToPosition handles multi-line correctly", () => {
    const css = ".a {\n  color: red;\n}\n.b {\n  display: flex;\n}";
    const r = parseCss(css, "t.css");
    expect(r.declarations[1]!.location.start.line).toBe(5);
  });
});

// === vite-plugin: ConditionalExpression, BooleanLiteral, ArrayDeclaration ===

describe("vite-plugin survivors", () => {
  const TEST_DIR = resolve(import.meta.dirname, ".test-kill-remaining");
  const TEST_STATE_DIR = resolve(TEST_DIR, "state");
  const TEST_CSS = resolve(TEST_DIR, "test.css");

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_STATE_DIR, { recursive: true });
    writeFileSync(TEST_CSS, ".a { color: red; }");
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });

  it("plugin map correctly indexes mutants by file", () => {
    const mutant = {
      id: "css-0",
      mutatorName: "ColorMutator",
      fileName: TEST_CSS,
      selector: ".a",
      property: "color",
      original: "red",
      replacement: "blue",
      range: [12, 15] as [number, number],
      location: {
        start: { line: 1, column: 13, offset: 12 },
        end: { line: 1, column: 16, offset: 15 },
      },
      description: "test",
    };
    const plugin = cssMutationVitePlugin({ mutants: [mutant], stateDir: TEST_STATE_DIR });

    // Without active mutant, returns null
    setActiveMutant(null, TEST_STATE_DIR);
    expect(plugin.transform("", TEST_CSS)).toBeNull();

    // With matching active mutant, returns mutated CSS
    setActiveMutant("css-0", TEST_STATE_DIR);
    const result = plugin.transform("", TEST_CSS);
    expect(result).not.toBeNull();
    expect(result!.code).toBe(".a { color: blue; }");
    expect(result!.map).toBeNull();
  });
});

// Need to import beforeEach/afterEach
import { beforeEach, afterEach } from "vitest";
