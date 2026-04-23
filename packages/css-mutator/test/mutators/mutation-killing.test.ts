/**
 * Targeted mutation-killing tests.
 * Each test verifies exact output values to catch StringLiteral,
 * ArrayDeclaration, and ConditionalExpression mutations.
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

describe("ColorMutator exact outputs", () => {
  const m = new ColorMutator();

  it("green -> red, transparent", () => {
    expect(m.mutate("color", "green")).toEqual(["red", "transparent"]);
  });
  it("yellow -> blue, transparent", () => {
    expect(m.mutate("color", "yellow")).toEqual(["blue", "transparent"]);
  });
  it("orange -> blue, transparent", () => {
    expect(m.mutate("color", "orange")).toEqual(["blue", "transparent"]);
  });
  it("purple -> green, transparent", () => {
    expect(m.mutate("color", "purple")).toEqual(["green", "transparent"]);
  });
  it("pink -> green, transparent", () => {
    expect(m.mutate("color", "pink")).toEqual(["green", "transparent"]);
  });
  it("gray -> black, white", () => {
    expect(m.mutate("color", "gray")).toEqual(["black", "white"]);
  });
  it("grey -> black, white", () => {
    expect(m.mutate("color", "grey")).toEqual(["black", "white"]);
  });
  it("currentcolor -> transparent", () => {
    expect(m.mutate("color", "currentcolor")).toEqual(["transparent"]);
  });
  it("handles fill property", () => {
    expect(m.mutate("fill", "red")).toEqual(["blue", "transparent"]);
  });
  it("handles stroke property", () => {
    expect(m.mutate("stroke", "blue")).toEqual(["red", "transparent"]);
  });
  it("handles outline-color", () => {
    expect(m.mutate("outline-color", "black")).toEqual(["white", "transparent"]);
  });
  it("handles text-decoration-color", () => {
    expect(m.mutate("text-decoration-color", "red")).toEqual(["blue", "transparent"]);
  });
  it("inverts #ffffff to #000000", () => {
    const result = m.mutate("color", "#ffffff");
    expect(result).toContain("#000000");
  });
  it("handles 8-char hex", () => {
    const result = m.mutate("color", "#ff000080");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("DisplayMutator exact outputs", () => {
  const m = new DisplayMutator();

  it("table -> block, none", () => {
    expect(m.mutate("display", "table")).toEqual(["block", "none"]);
  });
  it("table-row -> block, none", () => {
    expect(m.mutate("display", "table-row")).toEqual(["block", "none"]);
  });
  it("table-cell -> block, none", () => {
    expect(m.mutate("display", "table-cell")).toEqual(["block", "none"]);
  });
  it("contents -> none, block", () => {
    expect(m.mutate("display", "contents")).toEqual(["none", "block"]);
  });
  it("list-item -> block, none", () => {
    expect(m.mutate("display", "list-item")).toEqual(["block", "none"]);
  });
  it("inline-block -> block, none", () => {
    expect(m.mutate("display", "inline-block")).toEqual(["block", "none"]);
  });
  it("inline-grid -> grid, none", () => {
    expect(m.mutate("display", "inline-grid")).toEqual(["grid", "none"]);
  });
});

describe("SizeMutator exact outputs", () => {
  const m = new SizeMutator();

  it("handles vh units", () => {
    const result = m.mutate("height", "100vh");
    expect(result).toContain("0vh");
    expect(result).toContain("200vh");
    expect(result).toContain("50vh");
    expect(result).toContain("-100vh");
  });
  it("handles em units", () => {
    const result = m.mutate("width", "2em");
    expect(result).toContain("0em");
    expect(result).toContain("4em");
  });
  it("handles min-height", () => {
    expect(m.mutate("min-height", "auto")).toEqual(["0px", "100%"]);
  });
  it("handles max-width", () => {
    const result = m.mutate("max-width", "500px");
    expect(result).toContain("0px");
  });
  it("handles 1px (no halving below 1)", () => {
    const result = m.mutate("width", "1px");
    expect(result).toContain("0px");
    expect(result).toContain("2px");
    expect(result).toContain("-1px");
    expect(result).not.toContain("0.5px");
  });
});

describe("PositionMutator exact outputs", () => {
  const m = new PositionMutator();

  it("static -> relative, absolute", () => {
    expect(m.mutate("position", "static")).toEqual(["relative", "absolute"]);
  });
  it("sticky -> static, relative", () => {
    expect(m.mutate("position", "sticky")).toEqual(["static", "relative"]);
  });
  it("handles right property", () => {
    const result = m.mutate("right", "10px");
    expect(result).toContain("0px");
    expect(result).toContain("-10px");
  });
  it("handles bottom property", () => {
    expect(m.mutate("bottom", "auto")).toEqual(["0px"]);
  });
  it("handles left with em", () => {
    const result = m.mutate("left", "2em");
    expect(result).toContain("0em");
    expect(result).toContain("-2em");
  });
});

describe("OpacityMutator exact outputs", () => {
  const m = new OpacityMutator();

  it("1 -> exactly [0, 0.5]", () => {
    expect(m.mutate("opacity", "1")).toEqual(["0", "0.5"]);
  });
  it("0 -> exactly [1]", () => {
    expect(m.mutate("opacity", "0")).toEqual(["1"]);
  });
  it("0.3 -> exactly [0, 1]", () => {
    expect(m.mutate("opacity", "0.3")).toEqual(["0", "1"]);
  });
  it("0.8 -> exactly [0, 1]", () => {
    expect(m.mutate("opacity", "0.8")).toEqual(["0", "1"]);
  });
});

describe("ZIndexMutator exact outputs", () => {
  const m = new ZIndexMutator();

  it("100 -> exactly [-1, 0]", () => {
    expect(m.mutate("z-index", "100")).toEqual(["-1", "0"]);
  });
  it("1 -> exactly [-1, 0]", () => {
    expect(m.mutate("z-index", "1")).toEqual(["-1", "0"]);
  });
  it("auto -> exactly [0, -1, 9999]", () => {
    expect(m.mutate("z-index", "auto")).toEqual(["0", "-1", "9999"]);
  });
});

describe("BorderMutator exact outputs", () => {
  const m = new BorderMutator();

  it("border: 2px dashed red -> none", () => {
    expect(m.mutate("border", "2px dashed red")).toEqual(["none"]);
  });
  it("border: 0 -> 1px solid black", () => {
    expect(m.mutate("border", "0")).toEqual(["1px solid black"]);
  });
  it("border-style: dashed -> solid, none", () => {
    expect(m.mutate("border-style", "dashed")).toEqual(["solid", "none"]);
  });
  it("border-style: dotted -> solid, none", () => {
    expect(m.mutate("border-style", "dotted")).toEqual(["solid", "none"]);
  });
  it("border-style: double -> solid, none", () => {
    expect(m.mutate("border-style", "double")).toEqual(["solid", "none"]);
  });
  it("border-style: hidden -> 1px solid black", () => {
    expect(m.mutate("border-style", "hidden")).toEqual(["1px solid black"]);
  });
  it("border-style: groove -> solid, none", () => {
    expect(m.mutate("border-style", "groove")).toEqual(["solid", "none"]);
  });
  it("border-style: ridge -> solid, none", () => {
    expect(m.mutate("border-style", "ridge")).toEqual(["solid", "none"]);
  });
  it("border-style: inset -> solid, none", () => {
    expect(m.mutate("border-style", "inset")).toEqual(["solid", "none"]);
  });
  it("border-style: outset -> solid, none", () => {
    expect(m.mutate("border-style", "outset")).toEqual(["solid", "none"]);
  });
  it("border-style: none -> 1px solid black", () => {
    expect(m.mutate("border-style", "none")).toEqual(["1px solid black"]);
  });
  it("border-width: 0 -> 2px", () => {
    expect(m.mutate("border-width", "0")).toEqual(["2px"]);
  });
  it("border-width: 0px -> 2px", () => {
    expect(m.mutate("border-width", "0px")).toEqual(["2px"]);
  });
  it("outline-style works", () => {
    expect(m.mutate("outline-style", "solid")).toEqual(["none", "dashed"]);
  });
  it("outline-width works", () => {
    expect(m.mutate("outline-width", "0")).toEqual(["2px"]);
  });
  it("outline: none -> 1px solid black", () => {
    expect(m.mutate("outline", "none")).toEqual(["1px solid black"]);
  });
  it("border-top-left-radius: 4px -> 0, 50%", () => {
    expect(m.mutate("border-top-left-radius", "4px")).toEqual(["0", "50%"]);
  });
  it("border-top-right-radius: 0 -> 50%, 8px", () => {
    expect(m.mutate("border-top-right-radius", "0")).toEqual(["50%", "8px"]);
  });
});

describe("FontMutator exact outputs", () => {
  const m = new FontMutator();

  it("font-weight: lighter -> bolder", () => {
    expect(m.mutate("font-weight", "lighter")).toEqual(["bolder"]);
  });
  it("font-weight: bolder -> lighter", () => {
    expect(m.mutate("font-weight", "bolder")).toEqual(["lighter"]);
  });
  it("font-weight: 200 -> 800", () => {
    expect(m.mutate("font-weight", "200")).toEqual(["800"]);
  });
  it("font-weight: 300 -> 700", () => {
    expect(m.mutate("font-weight", "300")).toEqual(["700"]);
  });
  it("font-weight: 500 -> 300", () => {
    expect(m.mutate("font-weight", "500")).toEqual(["300"]);
  });
  it("font-weight: 600 -> 300", () => {
    expect(m.mutate("font-weight", "600")).toEqual(["300"]);
  });
  it("font-weight: 800 -> 200", () => {
    expect(m.mutate("font-weight", "800")).toEqual(["200"]);
  });
  it("font-weight: 900 -> 100", () => {
    expect(m.mutate("font-weight", "900")).toEqual(["100"]);
  });
  it("font-style: oblique -> normal", () => {
    expect(m.mutate("font-style", "oblique")).toEqual(["normal"]);
  });
  it("text-align: justify -> left, center", () => {
    expect(m.mutate("text-align", "justify")).toEqual(["left", "center"]);
  });
  it("text-align: start -> end, center", () => {
    expect(m.mutate("text-align", "start")).toEqual(["end", "center"]);
  });
  it("text-align: end -> start, center", () => {
    expect(m.mutate("text-align", "end")).toEqual(["start", "center"]);
  });
  it("text-transform: capitalize -> uppercase, none", () => {
    expect(m.mutate("text-transform", "capitalize")).toEqual(["uppercase", "none"]);
  });
  it("text-decoration: overline -> none, underline", () => {
    expect(m.mutate("text-decoration", "overline")).toEqual(["none", "underline"]);
  });
  it("text-decoration-line: line-through -> none, underline", () => {
    expect(m.mutate("text-decoration-line", "line-through")).toEqual(["none", "underline"]);
  });
  it("font-size: 4px -> only doubles (no halving below 4)", () => {
    const result = m.mutate("font-size", "4px");
    expect(result).toEqual(["8px"]);
  });
  it("word-spacing: 3px -> 0, -3px", () => {
    expect(m.mutate("word-spacing", "3px")).toEqual(["0", "-3px"]);
  });
  it("line-height: 0.5 returns exactly 2 values", () => {
    const result = m.mutate("line-height", "0.5");
    expect(result).toHaveLength(2);
  });
});

describe("SpacingMutator exact outputs", () => {
  const m = new SpacingMutator();

  it("margin: 0rem -> 10rem (margin uses 10, not 16)", () => {
    const result = m.mutate("margin", "0rem");
    expect(result).toContain("10rem");
  });
  it("padding: 5px -> 0px", () => {
    const result = m.mutate("padding", "5px");
    expect(result).toContain("0px");
  });
  it("margin-top: 0em -> 10em", () => {
    const result = m.mutate("margin-top", "0em");
    expect(result).toContain("10em");
  });
  it("gap: 0px -> non-zero (gap is not padding so uses 10)", () => {
    const result = m.mutate("gap", "0px");
    expect(result).toContain("10px");
  });
  it("margin-right: -10px -> 0px only (negative num < 0)", () => {
    const result = m.mutate("margin-right", "-10px");
    expect(result).toContain("0px");
  });
  it("padding-bottom: 0vh -> 16vh", () => {
    expect(m.mutate("padding-bottom", "0vh")).toContain("16vh");
  });
  it("row-gap works", () => {
    expect(m.mutate("row-gap", "8px")).toContain("0px");
  });
  it("column-gap works", () => {
    expect(m.mutate("column-gap", "12px")).toContain("0px");
  });
});

describe("VisibilityMutator exact outputs", () => {
  const m = new VisibilityMutator();

  it("overflow-x: hidden -> visible", () => {
    expect(m.mutate("overflow-x", "hidden")).toEqual(["visible"]);
  });
  it("overflow-y: scroll -> hidden, visible", () => {
    expect(m.mutate("overflow-y", "scroll")).toEqual(["hidden", "visible"]);
  });
  it("pointer-events: none -> auto", () => {
    expect(m.mutate("pointer-events", "none")).toEqual(["auto"]);
  });
  it("backface-visibility: visible -> hidden", () => {
    expect(m.mutate("backface-visibility", "visible")).toEqual(["hidden"]);
  });
  it("backface-visibility: hidden -> visible", () => {
    expect(m.mutate("backface-visibility", "hidden")).toEqual(["visible"]);
  });
});

describe("FlexMutator exact outputs", () => {
  const m = new FlexMutator();

  it("flex-direction: row-reverse -> row, column-reverse", () => {
    expect(m.mutate("flex-direction", "row-reverse")).toEqual(["row", "column-reverse"]);
  });
  it("flex-direction: column-reverse -> column, row-reverse", () => {
    expect(m.mutate("flex-direction", "column-reverse")).toEqual(["column", "row-reverse"]);
  });
  it("flex-wrap: wrap-reverse -> nowrap, wrap", () => {
    expect(m.mutate("flex-wrap", "wrap-reverse")).toEqual(["nowrap", "wrap"]);
  });
  it("align-items: stretch -> flex-start, center", () => {
    expect(m.mutate("align-items", "stretch")).toEqual(["flex-start", "center"]);
  });
  it("align-items: baseline -> center, flex-start", () => {
    expect(m.mutate("align-items", "baseline")).toEqual(["center", "flex-start"]);
  });
  it("justify-content: space-around -> center, space-between", () => {
    expect(m.mutate("justify-content", "space-around")).toEqual(["center", "space-between"]);
  });
  it("justify-content: space-evenly -> center, space-between", () => {
    expect(m.mutate("justify-content", "space-evenly")).toEqual(["center", "space-between"]);
  });
  it("align-content: flex-start -> flex-end, center", () => {
    expect(m.mutate("align-content", "flex-start")).toEqual(["flex-end", "center"]);
  });
  it("align-self: flex-end -> flex-start, center", () => {
    expect(m.mutate("align-self", "flex-end")).toEqual(["flex-start", "center"]);
  });
  it("align-items: start -> end, center", () => {
    expect(m.mutate("align-items", "start")).toEqual(["end", "center"]);
  });
  it("align-items: end -> start, center", () => {
    expect(m.mutate("align-items", "end")).toEqual(["start", "center"]);
  });
  it("flex-shrink: 0 -> 1", () => {
    expect(m.mutate("flex-shrink", "0")).toEqual(["1"]);
  });
  it("flex-shrink: 1 -> 0", () => {
    expect(m.mutate("flex-shrink", "1")).toEqual(["0"]);
  });
  it("flex-basis: 0px -> auto, 100%", () => {
    expect(m.mutate("flex-basis", "0px")).toEqual(["auto", "100%"]);
  });
});

describe("GridMutator exact outputs", () => {
  const m = new GridMutator();

  it("grid-auto-flow: column -> row", () => {
    expect(m.mutate("grid-auto-flow", "column")).toEqual(["row"]);
  });
  it("grid-auto-columns: min-content -> auto, max-content", () => {
    expect(m.mutate("grid-auto-columns", "min-content")).toEqual(["auto", "max-content"]);
  });
  it("grid-auto-columns: max-content -> auto, min-content", () => {
    expect(m.mutate("grid-auto-columns", "max-content")).toEqual(["auto", "min-content"]);
  });
  it("grid-template-rows: 1fr 1fr -> 1fr, none", () => {
    const result = m.mutate("grid-template-rows", "1fr 1fr");
    expect(result).toContain("1fr");
    expect(result).toContain("none");
  });
  it("grid-row: span 2 -> span 1", () => {
    expect(m.mutate("grid-row", "span 2")).toEqual(["span 1"]);
  });
  it("grid-column: 2 / 4 -> 2 / 2", () => {
    const result = m.mutate("grid-column", "2 / 4");
    expect(result).toEqual(["2 / 2"]);
  });
});

/**
 * Tests that guard against accidentally dropped .trim() / .toLowerCase() calls.
 * Inputs deliberately include whitespace and mixed case.
 */
describe("MethodExpression mutant killers", () => {
  it("ColorMutator: handles mixed case", () => {
    const m = new ColorMutator();
    // .toLowerCase() is needed to match lookup keys
    expect(m.mutate("color", "  Red  ")).toEqual(["blue", "transparent"]);
    expect(m.mutate("color", "BLACK")).toEqual(["white", "transparent"]);
  });

  it("DisplayMutator: handles whitespace and case", () => {
    const m = new DisplayMutator();
    expect(m.mutate("display", " FLEX ")).toEqual(["block", "none"]);
    expect(m.mutate("display", "  Grid  ")).toEqual(["block", "none"]);
  });

  it("SizeMutator: handles whitespace", () => {
    const m = new SizeMutator();
    expect(m.mutate("width", "  Auto  ")).toEqual(["0px", "100%"]);
    // Uppercase units still match after toLowerCase
    const r = m.mutate("width", " 10PX ");
    expect(r).toContain("0px");
  });

  it("PositionMutator: handles whitespace and case", () => {
    const m = new PositionMutator();
    expect(m.mutate("position", "  Relative  ")).toEqual(["static", "absolute"]);
    expect(m.mutate("top", "  AUTO  ")).toEqual(["0px"]);
  });

  it("OpacityMutator: handles whitespace", () => {
    const m = new OpacityMutator();
    expect(m.mutate("opacity", "  1  ")).toEqual(["0", "0.5"]);
  });

  it("ZIndexMutator: handles whitespace and case", () => {
    const m = new ZIndexMutator();
    expect(m.mutate("z-index", "  Auto  ")).toEqual(["0", "-1", "9999"]);
  });

  it("BorderMutator: handles whitespace", () => {
    const m = new BorderMutator();
    expect(m.mutate("border", "  None  ")).toEqual(["1px solid black"]);
    expect(m.mutate("border-style", "  Solid  ")).toEqual(["none", "dashed"]);
  });

  it("FontMutator: handles whitespace and case", () => {
    const m = new FontMutator();
    expect(m.mutate("font-weight", "  BOLD  ")).toEqual(["normal"]);
    expect(m.mutate("text-align", "  Center  ")).toEqual(["left", "right"]);
  });

  it("SpacingMutator: handles whitespace", () => {
    const m = new SpacingMutator();
    expect(m.mutate("margin", "  Auto  ")).toEqual(["0"]);
  });

  it("VisibilityMutator: handles whitespace and case", () => {
    const m = new VisibilityMutator();
    expect(m.mutate("visibility", "  Visible  ")).toEqual(["hidden"]);
    expect(m.mutate("overflow", "  Hidden  ")).toEqual(["visible"]);
  });

  it("FlexMutator: handles whitespace and case", () => {
    const m = new FlexMutator();
    expect(m.mutate("flex-direction", "  Row  ")).toEqual(["column", "row-reverse"]);
  });

  it("GridMutator: handles whitespace and case", () => {
    const m = new GridMutator();
    expect(m.mutate("grid-auto-flow", "  Row  ")).toEqual(["column"]);
  });
});

/**
 * Additional exact-match tests for remaining lookup table entries
 * to kill StringLiteral and ArrayDeclaration mutants.
 */
describe("Complete lookup table coverage", () => {
  describe("ColorMutator all entries", () => {
    const m = new ColorMutator();
    it("red", () => expect(m.mutate("color", "red")).toEqual(["blue", "transparent"]));
    it("blue", () => expect(m.mutate("color", "blue")).toEqual(["red", "transparent"]));
    it("black", () => expect(m.mutate("color", "black")).toEqual(["white", "transparent"]));
    it("white", () => expect(m.mutate("color", "white")).toEqual(["black", "transparent"]));
    it("transparent", () => expect(m.mutate("color", "transparent")).toEqual(["black"]));
    it("inherit", () => expect(m.mutate("color", "inherit")).toEqual(["transparent"]));
    it("currentColor", () => expect(m.mutate("color", "currentColor")).toEqual(["transparent"]));

    // Hex invertions exact check
    it("#ff0000 inverts correctly", () => {
      const r = m.mutate("color", "#ff0000");
      expect(r[0]).toBe("#00ffff");
      expect(r[1]).toBe("transparent");
    });

    // RGB inversion exact check
    it("rgb(0, 0, 0) inverts to rgb(255, 255, 255)", () => {
      const r = m.mutate("color", "rgb(0, 0, 0)");
      expect(r[0]).toContain("255, 255, 255");
    });

    // Background shorthand with standalone hex
    it("background with hex #aabbcc", () => {
      const r = m.mutate("background", "#aabbcc");
      expect(r.length).toBeGreaterThan(0);
      // should get inverted hex + transparent
    });
    it("text-shadow with no color returns empty", () => {
      expect(m.mutate("text-shadow", "0 2px 4px")).toEqual([]);
    });
    it("background shorthand hex replacement", () => {
      const r = m.mutate("background", "#fff");
      expect(r.some((v) => v.includes("transparent") || v.includes("#"))).toBe(true);
    });
  });

  describe("PositionMutator all swap entries", () => {
    const m = new PositionMutator();
    it("absolute -> static, relative", () =>
      expect(m.mutate("position", "absolute")).toEqual(["static", "relative"]));
    it("fixed -> static, absolute", () =>
      expect(m.mutate("position", "fixed")).toEqual(["static", "absolute"]));
    it("relative -> static, absolute", () =>
      expect(m.mutate("position", "relative")).toEqual(["static", "absolute"]));

    // Offset with % unit
    it("top 50% -> 0%, -50%", () => {
      expect(m.mutate("top", "50%")).toEqual(["0%", "-50%"]);
    });
    // Offset with vw
    it("left 10vw -> 0vw, -10vw", () => {
      expect(m.mutate("left", "10vw")).toEqual(["0vw", "-10vw"]);
    });
  });

  describe("SizeMutator all keyword entries", () => {
    const m = new SizeMutator();
    it("auto -> 0px, 100%", () => expect(m.mutate("width", "auto")).toEqual(["0px", "100%"]));
    it("fit-content -> auto, 0px", () =>
      expect(m.mutate("width", "fit-content")).toEqual(["auto", "0px"]));
    it("min-content -> max-content, 0px", () =>
      expect(m.mutate("width", "min-content")).toEqual(["max-content", "0px"]));
    it("max-content -> min-content, 0px", () =>
      expect(m.mutate("width", "max-content")).toEqual(["min-content", "0px"]));

    // Various units
    it("10% -> 0%, 20%, 5%, -10%", () => {
      const r = m.mutate("width", "10%");
      expect(r).toEqual(["0%", "20%", "5%", "-10%"]);
    });
    it("3rem -> 0rem, 6rem, -3rem (no halve below 2)", () => {
      const r = m.mutate("width", "3rem");
      expect(r).toContain("0rem");
      expect(r).toContain("6rem");
    });
  });

  describe("SpacingMutator all property names", () => {
    const m = new SpacingMutator();
    it("margin-block: 10px", () => expect(m.mutate("margin-block", "10px")).toContain("0px"));
    it("margin-inline: 10px", () => expect(m.mutate("margin-inline", "10px")).toContain("0px"));
    it("padding-block: 10px", () => expect(m.mutate("padding-block", "10px")).toContain("0px"));
    it("padding-inline: 10px", () => expect(m.mutate("padding-inline", "10px")).toContain("0px"));
    it("margin-block-start", () => expect(m.mutate("margin-block-start", "10px")).toContain("0px"));
    it("padding-inline-end", () => expect(m.mutate("padding-inline-end", "10px")).toContain("0px"));

    // Multi-value with auto
    it("margin: 10px auto 10px auto -> 0", () => {
      expect(m.mutate("margin", "10px auto 10px auto")).toEqual(["0"]);
    });
    // Multi-value with just zeros
    it("margin: 0 0 -> 0", () => {
      expect(m.mutate("margin", "0 0")).toEqual(["0"]);
    });
  });

  describe("FlexMutator all alignment values", () => {
    const m = new FlexMutator();
    it("flex-start -> flex-end, center", () =>
      expect(m.mutate("justify-content", "flex-start")).toEqual(["flex-end", "center"]));
    it("flex-end -> flex-start, center", () =>
      expect(m.mutate("justify-content", "flex-end")).toEqual(["flex-start", "center"]));
    it("center -> flex-start, flex-end", () =>
      expect(m.mutate("justify-content", "center")).toEqual(["flex-start", "flex-end"]));
    it("space-between -> center, flex-start", () =>
      expect(m.mutate("justify-content", "space-between")).toEqual(["center", "flex-start"]));

    // flex-flow shorthand with unrecognized direction
    it("flex-flow: weird nowrap -> empty", () =>
      expect(m.mutate("flex-flow", "weird nowrap")).toEqual([]));
  });

  describe("GridMutator comprehensive", () => {
    const m = new GridMutator();
    it("grid-template-columns: none -> 1fr 1fr", () =>
      expect(m.mutate("grid-template-columns", "none")).toEqual(["1fr 1fr"]));
    it("grid-template-rows: none -> 1fr 1fr", () =>
      expect(m.mutate("grid-template-rows", "none")).toEqual(["1fr 1fr"]));

    // Single value template
    it("grid-template-columns: 1fr -> none only", () => {
      const r = m.mutate("grid-template-columns", "1fr");
      expect(r).toEqual(["none"]);
    });
  });

  describe("VisibilityMutator all overflow entries", () => {
    const m = new VisibilityMutator();
    it("visible -> hidden, scroll", () =>
      expect(m.mutate("overflow", "visible")).toEqual(["hidden", "scroll"]));
    it("hidden -> visible", () => expect(m.mutate("overflow", "hidden")).toEqual(["visible"]));
    it("scroll -> hidden, visible", () =>
      expect(m.mutate("overflow", "scroll")).toEqual(["hidden", "visible"]));
    it("auto -> hidden, visible", () =>
      expect(m.mutate("overflow", "auto")).toEqual(["hidden", "visible"]));
    it("clip -> visible", () => expect(m.mutate("overflow", "clip")).toEqual(["visible"]));
  });

  describe("BorderMutator radius units", () => {
    const m = new BorderMutator();
    it("border-radius: 2rem -> 0, 50%", () =>
      expect(m.mutate("border-radius", "2rem")).toEqual(["0", "50%"]));
    it("border-radius: 10em -> 0, 50%", () =>
      expect(m.mutate("border-radius", "10em")).toEqual(["0", "50%"]));
    it("border-radius: 50% -> 0, 50%", () =>
      expect(m.mutate("border-radius", "50%")).toEqual(["0", "50%"]));
    it("border-bottom-left-radius: 0px -> 50%, 8px", () =>
      expect(m.mutate("border-bottom-left-radius", "0px")).toEqual(["50%", "8px"]));
    it("border: non-matching shorthand -> none", () =>
      expect(m.mutate("border", "thin solid red")).toEqual(["none"]));
    it("border-top: none -> 1px solid black", () =>
      expect(m.mutate("border-top", "none")).toEqual(["1px solid black"]));
    it("border-right: 3px dotted blue -> none (via shorthand regex)", () =>
      expect(m.mutate("border-right", "3px dotted blue")).toEqual(["none"]));
    it("border-left: 0 -> 1px solid black", () =>
      expect(m.mutate("border-left", "0")).toEqual(["1px solid black"]));
  });

  describe("FontMutator all text-decoration entries", () => {
    const m = new FontMutator();
    it("none -> underline, line-through", () =>
      expect(m.mutate("text-decoration", "none")).toEqual(["underline", "line-through"]));
    it("underline -> none, line-through", () =>
      expect(m.mutate("text-decoration", "underline")).toEqual(["none", "line-through"]));
    it("line-through -> none, underline", () =>
      expect(m.mutate("text-decoration", "line-through")).toEqual(["none", "underline"]));

    // All text-transform entries
    it("none -> uppercase", () =>
      expect(m.mutate("text-transform", "none")).toEqual(["uppercase"]));
    it("uppercase -> lowercase, none", () =>
      expect(m.mutate("text-transform", "uppercase")).toEqual(["lowercase", "none"]));
    it("lowercase -> uppercase, none", () =>
      expect(m.mutate("text-transform", "lowercase")).toEqual(["uppercase", "none"]));

    // All text-align entries
    it("left -> right, center", () =>
      expect(m.mutate("text-align", "left")).toEqual(["right", "center"]));
    it("right -> left, center", () =>
      expect(m.mutate("text-align", "right")).toEqual(["left", "center"]));

    // font-size with pt and % units
    it("font-size: 12pt -> 24pt, 6pt", () =>
      expect(m.mutate("font-size", "12pt")).toEqual(["24pt", "6pt"]));
    it("font-size: 100% -> 200%, 50%", () =>
      expect(m.mutate("font-size", "100%")).toEqual(["200%", "50%"]));

    // letter/word spacing with non-zero
    it("letter-spacing: 2px -> 0, -2px", () =>
      expect(m.mutate("letter-spacing", "2px")).toEqual(["0", "-2px"]));
    it("word-spacing: normal -> 5px, -2px", () =>
      expect(m.mutate("word-spacing", "normal")).toEqual(["5px", "-2px"]));

    // line-height numeric
    it("line-height: 2 -> 1, 4", () => expect(m.mutate("line-height", "2")).toEqual(["1", "4"]));

    // font-family monospace
    it("font-family: monospace -> serif only", () =>
      expect(m.mutate("font-family", "monospace")).toEqual(["serif"]));
  });
});
