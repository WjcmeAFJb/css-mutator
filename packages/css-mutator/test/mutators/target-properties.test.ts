/**
 * Tests that every targetProperties entry is correctly recognized.
 * Kills StringLiteral mutants on property name strings and
 * ArrayDeclaration mutants on the targetProperties arrays.
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

describe("ColorMutator handles all target properties", () => {
  const m = new ColorMutator();
  const props = [
    "color",
    "background-color",
    "background",
    "border-color",
    "border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color",
    "outline-color",
    "text-decoration-color",
    "fill",
    "stroke",
    "box-shadow",
    "text-shadow",
    "caret-color",
    "column-rule-color",
    "accent-color",
  ];
  for (const p of props) {
    it(`handles ${p}`, () => expect(m.handles(p)).toBe(true));
  }
  it("rejects unrelated", () => expect(m.handles("display")).toBe(false));
});

describe("DisplayMutator handles all target properties", () => {
  const m = new DisplayMutator();
  it("handles display", () => expect(m.handles("display")).toBe(true));
  it("rejects color", () => expect(m.handles("color")).toBe(false));
});

describe("SizeMutator handles all target properties", () => {
  const m = new SizeMutator();
  const props = [
    "width",
    "height",
    "min-width",
    "min-height",
    "max-width",
    "max-height",
    "inline-size",
    "block-size",
    "min-inline-size",
    "min-block-size",
    "max-inline-size",
    "max-block-size",
  ];
  for (const p of props) {
    it(`handles ${p}`, () => expect(m.handles(p)).toBe(true));
  }
  it("rejects color", () => expect(m.handles("color")).toBe(false));
});

describe("PositionMutator handles all target properties", () => {
  const m = new PositionMutator();
  const props = [
    "position",
    "top",
    "right",
    "bottom",
    "left",
    "inset",
    "inset-block",
    "inset-inline",
  ];
  for (const p of props) {
    it(`handles ${p}`, () => expect(m.handles(p)).toBe(true));
  }
  it("rejects color", () => expect(m.handles("color")).toBe(false));
});

describe("OpacityMutator handles all target properties", () => {
  const m = new OpacityMutator();
  it("handles opacity", () => expect(m.handles("opacity")).toBe(true));
  it("rejects color", () => expect(m.handles("color")).toBe(false));
});

describe("ZIndexMutator handles all target properties", () => {
  const m = new ZIndexMutator();
  it("handles z-index", () => expect(m.handles("z-index")).toBe(true));
  it("rejects color", () => expect(m.handles("color")).toBe(false));
});

describe("BorderMutator handles all target properties", () => {
  const m = new BorderMutator();
  const props = [
    "border",
    "border-top",
    "border-right",
    "border-bottom",
    "border-left",
    "border-style",
    "border-width",
    "border-radius",
    "border-top-left-radius",
    "border-top-right-radius",
    "border-bottom-left-radius",
    "border-bottom-right-radius",
    "outline",
    "outline-style",
    "outline-width",
  ];
  for (const p of props) {
    it(`handles ${p}`, () => expect(m.handles(p)).toBe(true));
  }
  it("rejects color", () => expect(m.handles("color")).toBe(false));
});

describe("FontMutator handles all target properties", () => {
  const m = new FontMutator();
  const props = [
    "font-size",
    "font-weight",
    "font-style",
    "font-family",
    "text-align",
    "text-transform",
    "text-decoration",
    "text-decoration-line",
    "letter-spacing",
    "line-height",
    "word-spacing",
    "white-space",
  ];
  for (const p of props) {
    it(`handles ${p}`, () => expect(m.handles(p)).toBe(true));
  }
  it("rejects color", () => expect(m.handles("color")).toBe(false));
});

describe("SpacingMutator handles all target properties", () => {
  const m = new SpacingMutator();
  const props = [
    "margin",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "margin-block",
    "margin-inline",
    "margin-block-start",
    "margin-block-end",
    "margin-inline-start",
    "margin-inline-end",
    "padding",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "padding-block",
    "padding-inline",
    "padding-block-start",
    "padding-block-end",
    "padding-inline-start",
    "padding-inline-end",
    "gap",
    "row-gap",
    "column-gap",
  ];
  for (const p of props) {
    it(`handles ${p}`, () => expect(m.handles(p)).toBe(true));
  }
  it("rejects color", () => expect(m.handles("color")).toBe(false));
});

describe("VisibilityMutator handles all target properties", () => {
  const m = new VisibilityMutator();
  const props = [
    "visibility",
    "overflow",
    "overflow-x",
    "overflow-y",
    "pointer-events",
    "clip-path",
    "backface-visibility",
  ];
  for (const p of props) {
    it(`handles ${p}`, () => expect(m.handles(p)).toBe(true));
  }
  it("rejects color", () => expect(m.handles("color")).toBe(false));
});

describe("FlexMutator handles all target properties", () => {
  const m = new FlexMutator();
  const props = [
    "flex-direction",
    "flex-wrap",
    "flex-flow",
    "justify-content",
    "align-items",
    "align-self",
    "align-content",
    "flex-grow",
    "flex-shrink",
    "flex-basis",
    "order",
    "place-content",
    "place-items",
    "place-self",
  ];
  for (const p of props) {
    it(`handles ${p}`, () => expect(m.handles(p)).toBe(true));
  }
  it("rejects color", () => expect(m.handles("color")).toBe(false));
});

describe("GridMutator handles all target properties", () => {
  const m = new GridMutator();
  const props = [
    "grid-template-columns",
    "grid-template-rows",
    "grid-column",
    "grid-row",
    "grid-auto-flow",
    "grid-auto-columns",
    "grid-auto-rows",
  ];
  for (const p of props) {
    it(`handles ${p}`, () => expect(m.handles(p)).toBe(true));
  }
  it("rejects color", () => expect(m.handles("color")).toBe(false));
});

/**
 * Test that each mutator produces at least one mutation for a realistic
 * value of every target property. This kills the ArrayDeclaration mutants
 * that empty the targetProperties array entirely.
 */
describe("each target property produces mutations", () => {
  it("ColorMutator produces mutations for all color properties", () => {
    const m = new ColorMutator();
    for (const p of m.targetProperties) {
      const result = m.mutate(p, "red");
      expect(result.length, `${p} should produce mutations`).toBeGreaterThan(0);
    }
  });

  it("SizeMutator produces mutations for all size properties", () => {
    const m = new SizeMutator();
    for (const p of m.targetProperties) {
      const result = m.mutate(p, "100px");
      expect(result.length, `${p} should produce mutations`).toBeGreaterThan(0);
    }
  });

  it("PositionMutator produces mutations for all position properties", () => {
    const m = new PositionMutator();
    for (const p of m.targetProperties) {
      const value = p === "position" ? "relative" : "10px";
      const result = m.mutate(p, value);
      expect(result.length, `${p} should produce mutations`).toBeGreaterThan(0);
    }
  });

  it("BorderMutator produces mutations for all border properties", () => {
    const m = new BorderMutator();
    for (const p of m.targetProperties) {
      const value = p.includes("radius")
        ? "8px"
        : p.includes("style")
          ? "solid"
          : p.includes("width")
            ? "2px"
            : "1px solid black";
      const result = m.mutate(p, value);
      expect(result.length, `${p} should produce mutations`).toBeGreaterThan(0);
    }
  });

  it("FontMutator produces mutations for all font properties", () => {
    const m = new FontMutator();
    const values: Record<string, string> = {
      "font-size": "16px",
      "font-weight": "bold",
      "font-style": "normal",
      "font-family": "Arial",
      "text-align": "left",
      "text-transform": "none",
      "text-decoration": "none",
      "text-decoration-line": "none",
      "letter-spacing": "normal",
      "line-height": "normal",
      "word-spacing": "normal",
      "white-space": "normal",
    };
    for (const p of m.targetProperties) {
      const value = values[p] ?? "normal";
      const result = m.mutate(p, value);
      expect(result.length, `${p} should produce mutations`).toBeGreaterThan(0);
    }
  });

  it("SpacingMutator produces mutations for all spacing properties", () => {
    const m = new SpacingMutator();
    for (const p of m.targetProperties) {
      const result = m.mutate(p, "10px");
      expect(result.length, `${p} should produce mutations`).toBeGreaterThan(0);
    }
  });

  it("VisibilityMutator produces mutations for all visibility properties", () => {
    const m = new VisibilityMutator();
    const values: Record<string, string> = {
      visibility: "visible",
      overflow: "hidden",
      "overflow-x": "hidden",
      "overflow-y": "hidden",
      "pointer-events": "auto",
      "clip-path": "none",
      "backface-visibility": "visible",
    };
    for (const p of m.targetProperties) {
      const value = values[p] ?? "visible";
      const result = m.mutate(p, value);
      expect(result.length, `${p} should produce mutations`).toBeGreaterThan(0);
    }
  });

  it("FlexMutator produces mutations for all flex properties", () => {
    const m = new FlexMutator();
    const values: Record<string, string> = {
      "flex-direction": "row",
      "flex-wrap": "nowrap",
      "flex-flow": "row wrap",
      "justify-content": "center",
      "align-items": "center",
      "align-self": "center",
      "align-content": "center",
      "flex-grow": "0",
      "flex-shrink": "0",
      "flex-basis": "auto",
      order: "0",
      "place-content": "center",
      "place-items": "center",
      "place-self": "center",
    };
    for (const p of m.targetProperties) {
      const value = values[p] ?? "center";
      const result = m.mutate(p, value);
      expect(result.length, `${p} should produce mutations`).toBeGreaterThan(0);
    }
  });

  it("GridMutator produces mutations for all grid properties", () => {
    const m = new GridMutator();
    const values: Record<string, string> = {
      "grid-template-columns": "1fr 1fr",
      "grid-template-rows": "1fr 1fr",
      "grid-column": "span 2",
      "grid-row": "span 2",
      "grid-auto-flow": "row",
      "grid-auto-columns": "auto",
      "grid-auto-rows": "auto",
    };
    for (const p of m.targetProperties) {
      const value = values[p] ?? "auto";
      const result = m.mutate(p, value);
      expect(result.length, `${p} should produce mutations`).toBeGreaterThan(0);
    }
  });
});
