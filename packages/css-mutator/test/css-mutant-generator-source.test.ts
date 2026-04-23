import { describe, it, expect } from "vitest";
import { generateCssMutantsFromSource } from "../src/css-mutant-generator.ts";

describe("generateCssMutantsFromSource", () => {
  it("generates mutants from a CSS string", () => {
    const css = `.button { color: red; display: flex; }`;
    const mutants = generateCssMutantsFromSource(css, "test.css");

    expect(mutants.length).toBeGreaterThan(0);
    expect(mutants.every((m) => m.fileName === "test.css")).toBe(true);
  });

  it("filters by mutator name", () => {
    const css = `.btn { color: red; display: flex; }`;
    const mutants = generateCssMutantsFromSource(css, "test.css", {
      mutators: ["ColorMutator"],
    });

    expect(mutants.every((m) => m.mutatorName === "ColorMutator")).toBe(true);
    expect(mutants.length).toBeGreaterThan(0);
  });

  it("excludes mutators", () => {
    const css = `.btn { color: red; display: flex; }`;
    const mutants = generateCssMutantsFromSource(css, "test.css", {
      excludeMutators: ["ColorMutator"],
    });

    expect(mutants.every((m) => m.mutatorName !== "ColorMutator")).toBe(true);
  });

  it("excludes selectors by string match", () => {
    const css = `.keep { color: red; } .skip { color: blue; }`;
    const mutants = generateCssMutantsFromSource(css, "test.css", {
      excludeSelectors: [".skip"],
    });

    expect(mutants.every((m) => m.selector !== ".skip")).toBe(true);
    expect(mutants.some((m) => m.selector === ".keep")).toBe(true);
  });

  it("excludes selectors by regex", () => {
    const css = `.modal-v1 { color: red; } .modal-v2 { color: blue; } .button { color: green; }`;
    const mutants = generateCssMutantsFromSource(css, "test.css", {
      excludeSelectors: ["/\\.modal-/"],
    });

    expect(mutants.every((m) => !m.selector.startsWith(".modal-"))).toBe(true);
    expect(mutants.some((m) => m.selector === ".button")).toBe(true);
  });

  it("returns empty array for CSS with no mutable properties", () => {
    const css = `.a { composes: base; }`;
    const mutants = generateCssMutantsFromSource(css, "test.css");

    expect(mutants).toEqual([]);
  });

  it("generates correct byte ranges", () => {
    const css = `.x { color: red; }`;
    const mutants = generateCssMutantsFromSource(css, "test.css");

    for (const mutant of mutants) {
      const original = css.slice(mutant.range[0], mutant.range[1]);
      expect(original).toBe(mutant.original);
    }
  });
});
