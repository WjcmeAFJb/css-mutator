/**
 * Final batch of mutant killers targeting the last ~100 survivors.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
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

// === Guard against empty-string regressions in lookup-table VALUES ===
// If a value like "solid" in BORDER_STYLE_SWAPS silently became "",
// querying "dashed" would return ["", "none"] instead of ["solid", "none"].
// These tests pin the exact strings so such a regression fails loudly.

describe("kill StringLiteral survivors in lookup values", () => {
  // visibility-mutator.ts L23,24: OVERFLOW_SWAPS values
  it("overflow hidden returns exactly ['visible']", () => {
    expect(new VisibilityMutator().mutate("overflow", "hidden")).toEqual(["visible"]);
  });
  it("overflow clip returns exactly ['visible']", () => {
    expect(new VisibilityMutator().mutate("overflow", "clip")).toEqual(["visible"]);
  });

  // display-mutator.ts L21: DISPLAY_SWAPS value
  it("display inline-block -> exactly ['block', 'none']", () => {
    expect(new DisplayMutator().mutate("display", "inline-block")).toEqual(["block", "none"]);
  });

  // z-index-mutator.ts L4,5: result strings
  it("z-index auto -> exactly ['0', '-1', '9999']", () => {
    expect(new ZIndexMutator().mutate("z-index", "auto")).toEqual(["0", "-1", "9999"]);
  });
  it("z-index 0 -> exactly ['-1', '9999']", () => {
    expect(new ZIndexMutator().mutate("z-index", "0")).toEqual(["-1", "9999"]);
  });

  // opacity-mutator.ts L5: result strings
  it("opacity 1 -> results contain '0.5' exactly (not empty)", () => {
    const r = new OpacityMutator().mutate("opacity", "1");
    expect(r[1]).toBe("0.5");
  });

  // position-mutator.ts L14,15: offset keywords
  it("position auto offset -> exactly ['0px']", () => {
    expect(new PositionMutator().mutate("top", "auto")).toEqual(["0px"]);
  });

  // size-mutator.ts L12,13: keyword values
  it("size auto -> exactly ['0px', '100%']", () => {
    expect(new SizeMutator().mutate("width", "auto")).toEqual(["0px", "100%"]);
  });
  it("size fit-content -> exactly ['auto', '0px']", () => {
    expect(new SizeMutator().mutate("width", "fit-content")).toEqual(["auto", "0px"]);
  });

  // border-mutator.ts L21,22: BORDER_STYLE_SWAPS values
  it("border-style solid -> exactly ['none', 'dashed']", () => {
    expect(new BorderMutator().mutate("border-style", "solid")).toEqual(["none", "dashed"]);
  });
  it("border-style dashed -> exactly ['solid', 'none']", () => {
    expect(new BorderMutator().mutate("border-style", "dashed")).toEqual(["solid", "none"]);
  });

  // flex-mutator.ts L30,31: WRAP_SWAPS values
  it("flex-wrap nowrap -> exactly ['wrap']", () => {
    expect(new FlexMutator().mutate("flex-wrap", "nowrap")).toEqual(["wrap"]);
  });
  it("flex-wrap wrap -> exactly ['nowrap']", () => {
    expect(new FlexMutator().mutate("flex-wrap", "wrap")).toEqual(["nowrap"]);
  });

  // font-mutator.ts L51,52,123: result strings
  it("font-weight normal -> exactly ['bold']", () => {
    expect(new FontMutator().mutate("font-weight", "normal")).toEqual(["bold"]);
  });
  it("font-weight bold -> exactly ['normal']", () => {
    expect(new FontMutator().mutate("font-weight", "bold")).toEqual(["normal"]);
  });
  it("white-space normal -> exactly ['nowrap', 'pre']", () => {
    expect(new FontMutator().mutate("white-space", "normal")).toEqual(["nowrap", "pre"]);
  });
  it("white-space nowrap -> exactly ['normal']", () => {
    expect(new FontMutator().mutate("white-space", "nowrap")).toEqual(["normal"]);
  });

  // spacing-mutator.ts L7: auto result
  it("spacing auto -> exactly ['0']", () => {
    expect(new SpacingMutator().mutate("margin", "auto")).toEqual(["0"]);
  });

  // grid-mutator.ts L5,28,29: values
  it("grid-auto-flow row -> exactly ['column']", () => {
    expect(new GridMutator().mutate("grid-auto-flow", "row")).toEqual(["column"]);
  });
  it("grid-auto-flow column -> exactly ['row']", () => {
    expect(new GridMutator().mutate("grid-auto-flow", "column")).toEqual(["row"]);
  });
  it("grid-auto-flow dense -> exactly ['row']", () => {
    expect(new GridMutator().mutate("grid-auto-flow", "dense")).toEqual(["row"]);
  });

  // color-mutator.ts L17: NAMED_COLOR_SWAPS values
  it("color transparent -> exactly ['black'] (not empty array)", () => {
    const r = new ColorMutator().mutate("color", "transparent");
    expect(r).toEqual(["black"]);
    expect(r[0]).toBe("black"); // kills StringLiteral "" in value
  });
  it("color inherit -> exactly ['transparent']", () => {
    expect(new ColorMutator().mutate("color", "inherit")).toEqual(["transparent"]);
  });
});

// === Kill ConditionalExpression survivors ===

describe("kill ConditionalExpression survivors", () => {
  // border-mutator.ts L75: shorthandMatch conditional
  it("border shorthand is detected and returns none", () => {
    // Must match the shorthand regex: \d+(px|rem|em) (solid|...) color
    expect(new BorderMutator().mutate("border", "2px solid red")).toEqual(["none"]);
    // Non-matching shorthand should still return none via fallback
    expect(new BorderMutator().mutate("border", "thin solid red")).toEqual(["none"]);
  });
  it("border 'none' returns '1px solid black' not 'none'", () => {
    // Tests that the none/0 check comes before the shorthand check
    expect(new BorderMutator().mutate("border", "none")).toEqual(["1px solid black"]);
    expect(new BorderMutator().mutate("border", "0")).toEqual(["1px solid black"]);
  });

  // flex-mutator.ts L62,64,89: flex-flow and flex-basis conditionals
  it("flex-flow with one word -> empty (parts.length check)", () => {
    expect(new FlexMutator().mutate("flex-flow", "row")).toEqual([]);
  });
  it("flex-flow with three words -> empty", () => {
    expect(new FlexMutator().mutate("flex-flow", "row wrap extra")).toEqual([]);
  });
  it("flex-basis auto -> ['0', '100%']", () => {
    expect(new FlexMutator().mutate("flex-basis", "auto")).toEqual(["0", "100%"]);
  });
  it("flex-basis 0 -> ['auto', '100%']", () => {
    expect(new FlexMutator().mutate("flex-basis", "0")).toEqual(["auto", "100%"]);
  });
  it("flex-basis other -> ['0', 'auto']", () => {
    expect(new FlexMutator().mutate("flex-basis", "200px")).toEqual(["0", "auto"]);
  });

  // grid-mutator.ts L67,76,85,87: template/span conditionals
  it("grid-template with none produces 1fr 1fr", () => {
    expect(new GridMutator().mutate("grid-template-columns", "none")).toEqual(["1fr 1fr"]);
  });
  it("grid-template single column produces none", () => {
    expect(new GridMutator().mutate("grid-template-columns", "1fr")).toEqual(["none"]);
  });
  it("grid span with / produces collapsed", () => {
    expect(new GridMutator().mutate("grid-column", "1 / 4")).toEqual(["1 / 1"]);
  });
  it("grid span without / or span returns empty", () => {
    expect(new GridMutator().mutate("grid-column", "auto")).toEqual([]);
  });

  // font-mutator.ts L94: num >= 0 for line-height negative
  it("font-size with 0 produces only double", () => {
    // 0 is NOT > 0, so no doubling either
    expect(new FontMutator().mutate("font-size", "0px")).toEqual([]);
  });

  // spacing-mutator.ts L55,68: multi-value conditional
  it("spacing multi-value where all parts match -> 0", () => {
    expect(new SpacingMutator().mutate("margin", "10px 20px 30px")).toEqual(["0"]);
  });
  it("spacing multi-value with non-matching part -> empty", () => {
    expect(new SpacingMutator().mutate("margin", "10px calc(1rem)")).toEqual([]);
  });
  it("spacing single value is not treated as multi-value", () => {
    const r = new SpacingMutator().mutate("margin", "10px");
    // Goes through single-value path, not multi-value
    expect(r).toContain("0px");
    expect(r).toContain("-10px");
  });

  // color-mutator.ts L90: background compound value conditional
  it("background with hex -> transparent replacement", () => {
    expect(new ColorMutator().mutate("background", "#aaa")).toContain("transparent");
  });
  it("background without hex -> empty (no named color match)", () => {
    expect(new ColorMutator().mutate("background", "url(bg.png)")).toEqual([]);
  });

  // vite-plugin conditionals
  it("vite plugin: mutant file map is built correctly", () => {
    const dir = resolve(import.meta.dirname, ".test-vp-cond");
    const cssFile = resolve(dir, "a.css");
    mkdirSync(dir, { recursive: true });
    writeFileSync(cssFile, ".x { color: red; }");

    const mutant = {
      id: "m1",
      mutatorName: "C",
      fileName: cssFile,
      selector: ".x",
      property: "color",
      original: "red",
      replacement: "blue",
      range: [12, 15] as [number, number],
      location: {
        start: { line: 1, column: 13, offset: 12 },
        end: { line: 1, column: 16, offset: 15 },
      },
      description: "t",
    };

    const stateDir = resolve(dir, "state");
    mkdirSync(stateDir, { recursive: true });
    const plugin = cssMutationVitePlugin({ mutants: [mutant], stateDir });

    // Non-matching file
    writeFileSync(resolve(dir, "b.css"), ".y { display: flex; }");
    setActiveMutant("m1", stateDir);
    expect(plugin.transform("", resolve(dir, "b.css"))).toBeNull();

    // Matching file
    const r = plugin.transform("", cssFile);
    expect(r).not.toBeNull();
    expect(r!.code).toBe(".x { color: blue; }");

    // Cleanup
    setActiveMutant(null, stateDir);
    rmSync(dir, { recursive: true });
  });
});

// === Kill Regex survivors with multi-digit precision ===

describe("kill regex survivors — multi-digit values", () => {
  // \d+ vs \d: multi-digit numbers that would fail with single-digit match
  it("border shorthand: 10px solid black (10 needs \\d+)", () => {
    expect(new BorderMutator().mutate("border", "10px solid black")).toEqual(["none"]);
  });
  it("border shorthand: 100px solid red (100 needs \\d+)", () => {
    expect(new BorderMutator().mutate("border", "100px solid red")).toEqual(["none"]);
  });
  it("border radius: 100px (3 digits)", () => {
    expect(new BorderMutator().mutate("border-radius", "100px")).toEqual(["0", "50%"]);
  });
  it("border radius: 1.25em (multi-decimal)", () => {
    expect(new BorderMutator().mutate("border-radius", "1.25em")).toEqual(["0", "50%"]);
  });

  it("font-size: 100rem (3 digits)", () => {
    expect(new FontMutator().mutate("font-size", "100rem")).toEqual(["200rem", "50rem"]);
  });
  it("letter-spacing: 10px (2 digits)", () => {
    expect(new FontMutator().mutate("letter-spacing", "10px")).toEqual(["0", "-10px"]);
  });
  it("letter-spacing: 100em (3 digits)", () => {
    expect(new FontMutator().mutate("letter-spacing", "100em")).toEqual(["0", "-100em"]);
  });
  it("font-size with decimal: 1.25em", () => {
    // Math.round(1.25 * 2) = 3, not > 4 so no halving
    expect(new FontMutator().mutate("font-size", "1.25em")).toEqual(["3em"]);
  });

  it("position offset: 100vh (3 digits)", () => {
    expect(new PositionMutator().mutate("top", "100vh")).toEqual(["0vh", "-100vh"]);
  });

  it("size: 100vmin (3 digits)", () => {
    expect(new SizeMutator().mutate("width", "100vmin")).toContain("0vmin");
  });

  it("spacing: 100vw (3 digits)", () => {
    expect(new SpacingMutator().mutate("margin", "100vw")).toContain("0vw");
  });

  // grid span: multi-digit span number
  it("grid span 10", () => {
    expect(new GridMutator().mutate("grid-column", "span 10")).toEqual(["span 9"]);
  });
});

// === Kill MethodExpression: opacity .trim() ===
describe("opacity .trim() killer", () => {
  it("opacity with leading space fails without .trim()", () => {
    // " 1" trimmed is "1" → parseFloat("1") = 1
    // Without .trim(), parseFloat(" 1") still works (parseFloat ignores leading space)
    // If the .trim() were dropped, the value would stay as the raw string
    const m = new OpacityMutator();
    expect(m.mutate("opacity", " 1")).toEqual(["0", "0.5"]);
    expect(m.mutate("opacity", "1 ")).toEqual(["0", "0.5"]);
  });
});

// === Kill css-mutant-generator survivors ===
describe("css-mutant-generator survivors", () => {
  it("generates description with arrow separator", () => {
    const mutants = generateCssMutantsFromSource(".a { display: flex; }", "f.css");
    const m = mutants[0]!;
    // Template literal: `${mutator.name}: ... → ${replacement}`
    expect(m.description).toMatch(/→/);
  });

  it("handles excludeSelectors with non-regex string containing /", () => {
    // Test the selector exclusion regex detection (startsWith / endsWith /)
    const mutants = generateCssMutantsFromSource(
      ".a { color: red; } .b { color: blue; }",
      "f.css",
      { excludeSelectors: ["/\\.a/"] },
    );
    // .a should be excluded by the regex
    expect(mutants.every((m) => m.selector !== ".a")).toBe(true);
    expect(mutants.some((m) => m.selector === ".b")).toBe(true);
  });

  it("non-regex exclude with partial match works", () => {
    const mutants = generateCssMutantsFromSource(
      ".foo-bar { color: red; } .baz { color: blue; }",
      "f.css",
      { excludeSelectors: ["foo"] },
    );
    // "foo" is a substring of ".foo-bar"
    expect(mutants.every((m) => !m.selector.includes("foo"))).toBe(true);
  });

  it("no exclude patterns means all selectors pass", () => {
    const mutants = generateCssMutantsFromSource(
      ".a { color: red; } .b { color: blue; }",
      "f.css",
      { excludeSelectors: [] },
    );
    expect(mutants.length).toBeGreaterThan(0);
  });

  it("handles CSS with no declarations gracefully", () => {
    const mutants = generateCssMutantsFromSource("/* empty */", "f.css");
    expect(mutants).toEqual([]);
  });
});

// === Kill css-parser survivors ===
describe("css-parser survivors", () => {
  it("parsed declaration node is preserved", () => {
    const r = parseCss(".a { color: red; }", "t.css");
    // ObjectLiteral survivor on line 39: the node property
    expect(r.declarations[0]!.node).toBeDefined();
    expect(r.declarations[0]!.node.prop).toBe("color");
  });

  it("handles value after colon with tab whitespace", () => {
    const css = ".a { color:\tred; }";
    const r = parseCss(css, "t.css");
    expect(r.declarations[0]!.value).toBe("red");
    const extracted = css.slice(r.declarations[0]!.range[0], r.declarations[0]!.range[1]);
    expect(extracted).toBe("red");
  });

  it("positionToOffset works for multi-line", () => {
    // Tests the positionToOffset function (lines 128-135)
    const css = "a {\n  color: red;\n  display: flex;\n}";
    const r = parseCss(css, "t.css");
    // Line 3 declaration
    expect(r.declarations[1]!.location.start.line).toBe(3);
    expect(r.declarations[1]!.value).toBe("flex");
  });

  it("offsetToPosition handles end of file", () => {
    const css = ".a { color: red; }";
    const r = parseCss(css, "t.css");
    expect(r.declarations[0]!.location.end.offset).toBe(15);
  });
});

// === Kill StringLiteral on name/description and targetProperties values ===
import { createAllMutators } from "../../src/mutators/index.ts";

describe("mutator metadata — name and description are non-empty", () => {
  const mutators = createAllMutators();

  for (const m of mutators) {
    it(`${m.name} has non-empty name`, () => {
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.name).toContain("Mutator");
    });

    it(`${m.name} has non-empty description`, () => {
      expect(m.description.length).toBeGreaterThan(5);
    });

    it(`${m.name} has non-empty targetProperties`, () => {
      expect(m.targetProperties.length).toBeGreaterThan(0);
      for (const p of m.targetProperties) {
        expect(p.length).toBeGreaterThan(0);
      }
    });
  }
});

// === Kill remaining vite-plugin ConditionalExpression/BooleanLiteral ===
describe("vite-plugin: all transform branches", () => {
  const DIR = resolve(import.meta.dirname, ".test-vp-branches");
  const STATE = resolve(DIR, "state");
  const CSS1 = resolve(DIR, "a.css");
  const CSS2 = resolve(DIR, "b.css");

  beforeEach(() => {
    mkdirSync(DIR, { recursive: true });
    mkdirSync(STATE, { recursive: true });
    writeFileSync(CSS1, ".x { color: red; }");
    writeFileSync(CSS2, ".y { display: flex; }");
  });

  afterEach(() => {
    if (existsSync(DIR)) rmSync(DIR, { recursive: true });
  });

  it("only applies mutation to the file that matches the mutant", () => {
    const mutant = {
      id: "m1",
      mutatorName: "C",
      fileName: CSS1,
      selector: ".x",
      property: "color",
      original: "red",
      replacement: "blue",
      range: [12, 15] as [number, number],
      location: {
        start: { line: 1, column: 13, offset: 12 },
        end: { line: 1, column: 16, offset: 15 },
      },
      description: "t",
    };

    const plugin = cssMutationVitePlugin({ mutants: [mutant], stateDir: STATE });

    // Non-CSS file
    expect(plugin.transform("", resolve(DIR, "script.ts"))).toBeNull();

    // CSS file not in mutants list
    setActiveMutant("m1", STATE);
    expect(plugin.transform("", CSS2)).toBeNull();

    // CSS file with matching mutant
    const result = plugin.transform("", CSS1);
    expect(result).not.toBeNull();
    expect(result!.code).toBe(".x { color: blue; }");
    expect(result!.map).toBeNull();

    // Clear active mutant — should return null
    setActiveMutant(null, STATE);
    expect(plugin.transform("", CSS1)).toBeNull();
  });

  it("mutant map uses resolved paths", () => {
    const mutant = {
      id: "m2",
      mutatorName: "D",
      fileName: CSS1, // already absolute
      selector: ".x",
      property: "color",
      original: "red",
      replacement: "green",
      range: [12, 15] as [number, number],
      location: {
        start: { line: 1, column: 13, offset: 12 },
        end: { line: 1, column: 16, offset: 15 },
      },
      description: "t2",
    };
    const plugin = cssMutationVitePlugin({ mutants: [mutant], stateDir: STATE });
    setActiveMutant("m2", STATE);
    const r = plugin.transform("", CSS1);
    expect(r!.code).toBe(".x { color: green; }");
  });
});

// === Kill remaining ConditionalExpression in spacing/grid ===
describe("spacing and grid conditionals", () => {
  it("spacing: padding zero gets 16 (the else if num===0 path)", () => {
    const m = new SpacingMutator();
    expect(m.mutate("padding", "0px")).toEqual(["16px"]);
  });
  it("spacing: padding non-zero gets only 0 (no negative for padding)", () => {
    const m = new SpacingMutator();
    const r = m.mutate("padding", "10px");
    expect(r).toEqual(["0px"]);
  });
  it("spacing: margin non-zero gets 0 and negative", () => {
    const m = new SpacingMutator();
    const r = m.mutate("margin", "10px");
    expect(r).toEqual(["0px", "-10px"]);
  });

  it("grid-template with repeat -> 1fr", () => {
    const m = new GridMutator();
    const r = m.mutate("grid-template-columns", "repeat(3, 1fr)");
    expect(r).toContain("1fr");
  });
  it("grid-column: auto (no span, no /) -> empty", () => {
    expect(new GridMutator().mutate("grid-column", "auto")).toEqual([]);
  });
  it("grid-column: span 1 -> span 2", () => {
    expect(new GridMutator().mutate("grid-column", "span 1")).toEqual(["span 2"]);
  });
  it("grid-template: single column -> none", () => {
    expect(new GridMutator().mutate("grid-template-rows", "auto")).toEqual(["none"]);
  });
});

// === Kill ArrayDeclaration survivors ===
describe("array declaration mutant killers", () => {
  it("spacing: results array is populated for non-zero margin", () => {
    const m = new SpacingMutator();
    const r = m.mutate("margin", "5px");
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBe(2);
    expect(r[0]).toBe("0px");
    expect(r[1]).toBe("-5px");
  });

  it("color: NAMED_COLOR_SWAPS returns real arrays", () => {
    const m = new ColorMutator();
    const r = m.mutate("color", "red");
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBe(2);
  });
});

// === Kill remaining css-mutant-generator survivors ===
describe("css-mutant-generator: idCounter and sort", () => {
  it("mutant IDs are sequential starting from 0", () => {
    const mutants = generateCssMutantsFromSource(".a { color: red; display: flex; }", "f.css");
    for (let i = 0; i < mutants.length; i++) {
      expect(mutants[i]!.id).toBe("css-" + String(i));
    }
  });

  it("isSelectorExcluded with non-regex does includes() check", () => {
    // excludeSelectors with partial string should use includes
    const mutants = generateCssMutantsFromSource(
      ".my-button { color: red; } .my-input { color: blue; }",
      "f.css",
      { excludeSelectors: ["button"] },
    );
    expect(mutants.every((m) => !m.selector.includes("button"))).toBe(true);
    expect(mutants.some((m) => m.selector.includes("input"))).toBe(true);
  });

  it("excludeSelectors regex delimiter detection", () => {
    // String starting with / but not ending with / is NOT a regex
    const mutants = generateCssMutantsFromSource(
      ".a { color: red; } /weird { color: blue; }",
      "f.css",
      { excludeSelectors: ["/weird"] },
    );
    // "/weird" is a plain string (does not end with /), so it uses includes()
    expect(mutants.some((m) => m.selector === ".a")).toBe(true);
  });

  it("isSelectorExcluded returns false for non-excluded selectors", () => {
    // When excludeSelectors doesn't match anything
    const mutants = generateCssMutantsFromSource(".keep { color: red; }", "f.css", {
      excludeSelectors: [".nope", "/.never/"],
    });
    expect(mutants.length).toBeGreaterThan(0);
    expect(mutants[0]!.selector).toBe(".keep");
  });
});

// === Kill grid-mutator ConditionalExpression survivors ===
describe("grid-mutator branch killers", () => {
  const m = new GridMutator();

  it("mutateTemplate: value with 'none' in it does NOT add 'none' again", () => {
    // Tests the !value.includes("none") branch
    const r = m.mutate("grid-template-columns", "none");
    expect(r).toEqual(["1fr 1fr"]);
    // "none" IS the value, so it goes through value==="none" branch
    // and does NOT hit the "push none" branch
    expect(r).not.toContain("none");
  });

  it("mutateTemplate: value without repeat does NOT push 1fr", () => {
    const r = m.mutate("grid-template-columns", "200px 300px");
    // No "repeat", so "1fr" is NOT pushed from the repeat branch
    // But "200px" IS pushed from the parts.length > 1 branch
    expect(r).toContain("200px");
    expect(r).toContain("none");
    expect(r).not.toContain("1fr");
  });

  it("mutateSpan: value without span AND without / -> empty", () => {
    expect(m.mutate("grid-column", "auto")).toEqual([]);
    expect(m.mutate("grid-column", "1")).toEqual([]);
  });

  it("mutateSpan: span without digits -> empty via spanMatch guard", () => {
    // "span abc" matches value.includes("span") but spanMatch regex fails
    expect(m.mutate("grid-column", "span abc")).toEqual([]);
  });

  it("grid-auto-flow: row dense -> column dense, row", () => {
    expect(m.mutate("grid-auto-flow", "row dense")).toEqual(["column dense", "row"]);
  });
  it("grid-auto-flow: column dense -> row dense, column", () => {
    expect(m.mutate("grid-auto-flow", "column dense")).toEqual(["row dense", "column"]);
  });

  it("mutateSpan: / with 3 parts -> empty", () => {
    // "1 / 2 / 3" splits into 3 parts, not 2
    expect(m.mutate("grid-column", "1 / 2 / 3")).toEqual([]);
  });
});
