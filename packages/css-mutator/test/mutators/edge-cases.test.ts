import { describe, it, expect } from "vitest";
import { FlexMutator } from "../../src/mutators/flex-mutator.ts";
import { FontMutator } from "../../src/mutators/font-mutator.ts";
import { GridMutator } from "../../src/mutators/grid-mutator.ts";
import { ColorMutator } from "../../src/mutators/color-mutator.ts";
import { BorderMutator } from "../../src/mutators/border-mutator.ts";
import { getMutatorByName, getMutatorNames } from "../../src/mutators/index.ts";
import { PositionMutator } from "../../src/mutators/position-mutator.ts";
import { VisibilityMutator } from "../../src/mutators/visibility-mutator.ts";
import { ZIndexMutator } from "../../src/mutators/z-index-mutator.ts";
import { SizeMutator } from "../../src/mutators/size-mutator.ts";
import { SpacingMutator } from "../../src/mutators/spacing-mutator.ts";

describe("BaseCssMutator wildcard matching", () => {
  it("handles wildcard patterns in targetProperties", () => {
    const borderMutator = new BorderMutator();
    expect(borderMutator.handles("border-top-left-radius")).toBe(true);
    expect(borderMutator.handles("border-bottom-right-radius")).toBe(true);
  });
});

describe("FlexMutator edge cases", () => {
  const mutator = new FlexMutator();

  it("handles flex-flow shorthand", () => {
    const result = mutator.mutate("flex-flow", "row wrap");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns empty for unknown flex-flow", () => {
    expect(mutator.mutate("flex-flow", "weird")).toEqual([]);
  });

  it("handles flex-basis auto", () => {
    const result = mutator.mutate("flex-basis", "auto");
    expect(result).toContain("0");
    expect(result).toContain("100%");
  });

  it("handles flex-basis 0", () => {
    const result = mutator.mutate("flex-basis", "0");
    expect(result).toContain("auto");
  });

  it("handles flex-basis non-zero", () => {
    const result = mutator.mutate("flex-basis", "200px");
    expect(result).toContain("0");
    expect(result).toContain("auto");
  });

  it("handles flex-grow/shrink with values other than 0 and 1", () => {
    const result = mutator.mutate("flex-grow", "3");
    expect(result).toContain("0");
    expect(result).toContain("1");
  });

  it("handles order with non-zero value", () => {
    const result = mutator.mutate("order", "5");
    expect(result).toContain("0");
    expect(result).toContain("-5");
  });

  it("handles place-content", () => {
    const result = mutator.mutate("place-content", "center");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns empty for unknown align value", () => {
    expect(mutator.mutate("align-items", "unknown-value")).toEqual([]);
  });

  it("returns empty for non-numeric flex-grow", () => {
    expect(mutator.mutate("flex-grow", "abc")).toEqual([]);
  });

  it("returns empty for non-numeric order", () => {
    expect(mutator.mutate("order", "abc")).toEqual([]);
  });

  it("returns empty for unknown flex property", () => {
    expect(mutator.mutate("unknown-flex-prop", "center")).toEqual([]);
  });
});

describe("FontMutator edge cases", () => {
  const mutator = new FontMutator();

  it("handles line-height normal", () => {
    const result = mutator.mutate("line-height", "normal");
    expect(result).toContain("1");
    expect(result).toContain("2");
  });

  it("handles line-height numeric", () => {
    const result = mutator.mutate("line-height", "1.5");
    expect(result.length).toBe(2);
  });

  it("handles white-space pre", () => {
    expect(mutator.mutate("white-space", "pre")).toContain("normal");
  });

  it("handles white-space nowrap", () => {
    expect(mutator.mutate("white-space", "nowrap")).toContain("normal");
  });

  it("handles unknown font-size format", () => {
    expect(mutator.mutate("font-size", "inherit")).toEqual([]);
  });

  it("handles unknown white-space value", () => {
    expect(mutator.mutate("white-space", "break-spaces")).toEqual([]);
  });

  it("handles letter-spacing zero", () => {
    const result = mutator.mutate("letter-spacing", "0px");
    expect(result).toContain("5px");
  });

  it("handles letter-spacing normal", () => {
    const result = mutator.mutate("letter-spacing", "normal");
    expect(result).toContain("5px");
  });

  it("returns empty for unknown property", () => {
    expect(mutator.mutate("unknown-prop", "value")).toEqual([]);
  });

  it("returns empty for unparseable line-height", () => {
    expect(mutator.mutate("line-height", "inherit")).toEqual([]);
  });

  it("returns empty for unparseable letter-spacing", () => {
    expect(mutator.mutate("letter-spacing", "10vh")).toEqual([]);
  });

  it("returns empty for unparseable word-spacing", () => {
    expect(mutator.mutate("word-spacing", "inherit")).toEqual([]);
  });

  it("handles numeric font weight 100", () => {
    expect(mutator.mutate("font-weight", "100")).toContain("900");
  });

  it("handles font-family that already includes serif", () => {
    const result = mutator.mutate("font-family", "Georgia, serif");
    expect(result).toContain("monospace");
    expect(result).not.toContain("serif");
  });
});

describe("GridMutator edge cases", () => {
  const mutator = new GridMutator();

  it("handles grid-auto-flow dense variants", () => {
    expect(mutator.mutate("grid-auto-flow", "row dense")).toContain("column dense");
    expect(mutator.mutate("grid-auto-flow", "column dense")).toContain("row dense");
    expect(mutator.mutate("grid-auto-flow", "dense")).toContain("row");
  });

  it("handles grid-auto-rows", () => {
    expect(mutator.mutate("grid-auto-rows", "auto")).toContain("min-content");
    expect(mutator.mutate("grid-auto-rows", "min-content")).toContain("auto");
    expect(mutator.mutate("grid-auto-rows", "max-content")).toContain("auto");
    expect(mutator.mutate("grid-auto-rows", "200px")).toContain("auto");
  });

  it("handles grid-column with slash notation", () => {
    const result = mutator.mutate("grid-column", "1 / 3");
    expect(result.length).toBeGreaterThan(0);
  });

  it("handles grid-column span 1", () => {
    const result = mutator.mutate("grid-column", "span 1");
    expect(result).toContain("span 2");
  });

  it("handles unknown grid-auto-flow value", () => {
    expect(mutator.mutate("grid-auto-flow", "weird")).toEqual([]);
  });

  it("handles unknown property", () => {
    expect(mutator.mutate("unknown-prop", "value")).toEqual([]);
  });
});

describe("ColorMutator edge cases", () => {
  const mutator = new ColorMutator();

  it("handles background shorthand with hex color", () => {
    const result = mutator.mutate("background", "#ff0000");
    expect(result.length).toBeGreaterThan(0);
  });

  it("replaces hex within compound box-shadow value", () => {
    const result = mutator.mutate("box-shadow", "0 2px 8px #000");
    expect(result).toEqual(["0 2px 8px transparent"]);
  });

  it("replaces hex within compound text-shadow value", () => {
    const result = mutator.mutate("text-shadow", "1px 1px #ff0000");
    expect(result).toEqual(["1px 1px transparent"]);
  });

  it("returns empty for compound value without hex", () => {
    expect(mutator.mutate("box-shadow", "0 2px 8px rgba(0,0,0,0.5)")).toEqual([]);
  });

  it("handles currentColor", () => {
    const result = mutator.mutate("color", "currentColor");
    expect(result).toContain("transparent");
  });

  it("handles inherit", () => {
    const result = mutator.mutate("color", "inherit");
    expect(result).toContain("transparent");
  });
});

describe("PositionMutator edge cases", () => {
  const mutator = new PositionMutator();

  it("returns empty for unknown position value", () => {
    expect(mutator.mutate("position", "weird")).toEqual([]);
  });

  it("returns empty for unparseable offset", () => {
    expect(mutator.mutate("top", "calc(100% - 20px)")).toEqual([]);
  });
});

describe("VisibilityMutator edge cases", () => {
  const mutator = new VisibilityMutator();

  it("handles collapse", () => {
    expect(mutator.mutate("visibility", "collapse")).toContain("visible");
  });

  it("handles overflow auto", () => {
    const result = mutator.mutate("overflow", "auto");
    expect(result).toContain("hidden");
  });

  it("handles overflow clip", () => {
    expect(mutator.mutate("overflow", "clip")).toContain("visible");
  });

  it("returns empty for unknown visibility value", () => {
    expect(mutator.mutate("visibility", "weird")).toEqual([]);
  });

  it("returns empty for unknown property", () => {
    expect(mutator.mutate("unknown", "value")).toEqual([]);
  });
});

describe("ZIndexMutator edge cases", () => {
  const mutator = new ZIndexMutator();

  it("returns empty for non-numeric non-auto value", () => {
    expect(mutator.mutate("z-index", "inherit")).toEqual([]);
  });
});

describe("SizeMutator edge cases", () => {
  const mutator = new SizeMutator();

  it("returns empty for unparseable value", () => {
    expect(mutator.mutate("width", "calc(100% - 20px)")).toEqual([]);
  });

  it("handles fit-content", () => {
    expect(mutator.mutate("width", "fit-content")).toContain("auto");
  });
});

describe("SpacingMutator edge cases", () => {
  const mutator = new SpacingMutator();

  it("returns empty for unparseable value", () => {
    expect(mutator.mutate("margin", "calc(1rem + 10px)")).toEqual([]);
  });

  it("handles mixed shorthand with auto", () => {
    const result = mutator.mutate("margin", "0 auto");
    expect(result).toContain("0");
  });
});

describe("mutator index helpers", () => {
  it("getMutatorByName returns correct mutator", () => {
    const mutator = getMutatorByName("ColorMutator");
    expect(mutator).toBeDefined();
    expect(mutator?.name).toBe("ColorMutator");
  });

  it("getMutatorByName returns undefined for unknown", () => {
    expect(getMutatorByName("NonExistentMutator")).toBeUndefined();
  });

  it("getMutatorNames returns all 12 names", () => {
    const names = getMutatorNames();
    expect(names).toHaveLength(12);
    expect(names).toContain("ColorMutator");
    expect(names).toContain("GridMutator");
  });
});
