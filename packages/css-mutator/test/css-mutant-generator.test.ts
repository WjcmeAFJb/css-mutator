import { describe, it, expect } from "vitest";
import { parseCss } from "../src/css-parser.ts";
import { createAllMutators } from "../src/mutators/index.ts";
import type { CssMutant } from "../src/types.ts";

/**
 * Helper to generate mutants from a CSS string without file I/O.
 */
function generateMutantsFromString(source: string, fileName = "test.css"): CssMutant[] {
  const parsed = parseCss(source, fileName);
  const mutators = createAllMutators();
  const mutants: CssMutant[] = [];
  let idCounter = 0;

  for (const decl of parsed.declarations) {
    for (const mutator of mutators) {
      if (!mutator.handles(decl.property)) continue;
      const replacements = mutator.mutate(decl.property, decl.value);
      for (const replacement of replacements) {
        mutants.push({
          id: `css-${idCounter++}`,
          mutatorName: mutator.name,
          fileName,
          selector: decl.selector,
          property: decl.property,
          original: decl.value,
          replacement,
          range: decl.range,
          location: decl.location,
          description: `${mutator.name}: ${decl.selector} { ${decl.property}: ${decl.value} → ${replacement} }`,
        });
      }
    }
  }

  return mutants;
}

describe("CSS Mutant Generator", () => {
  it("generates mutants for a simple CSS file", () => {
    const css = `.button { color: red; display: flex; }`;
    const mutants = generateMutantsFromString(css);

    expect(mutants.length).toBeGreaterThan(0);

    // Should have color mutations
    const colorMutants = mutants.filter((m) => m.mutatorName === "ColorMutator");
    expect(colorMutants.length).toBeGreaterThan(0);

    // Should have display mutations
    const displayMutants = mutants.filter((m) => m.mutatorName === "DisplayMutator");
    expect(displayMutants.length).toBeGreaterThan(0);
  });

  it("generates unique IDs for each mutant", () => {
    const css = `.a { color: red; } .b { color: blue; }`;
    const mutants = generateMutantsFromString(css);
    const ids = mutants.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("captures correct selectors", () => {
    const css = `
      .header { background-color: #333; }
      .footer a { color: blue; }
    `;
    const mutants = generateMutantsFromString(css);

    const headerMutants = mutants.filter((m) => m.selector === ".header");
    const footerMutants = mutants.filter((m) => m.selector === ".footer a");

    expect(headerMutants.length).toBeGreaterThan(0);
    expect(footerMutants.length).toBeGreaterThan(0);
  });

  it("generates mutants for layout properties", () => {
    const css = `
      .container {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        padding: 24px;
      }
    `;
    const mutants = generateMutantsFromString(css);

    const mutatorNames = [...new Set(mutants.map((m) => m.mutatorName))];
    expect(mutatorNames).toContain("DisplayMutator");
    expect(mutatorNames).toContain("GridMutator");
    expect(mutatorNames).toContain("SpacingMutator");
  });

  it("generates correct replacement values", () => {
    const css = `.box { opacity: 1; }`;
    const mutants = generateMutantsFromString(css);

    const opacityMutants = mutants.filter((m) => m.mutatorName === "OpacityMutator");
    expect(opacityMutants.some((m) => m.replacement === "0")).toBe(true);
    expect(opacityMutants.some((m) => m.replacement === "0.5")).toBe(true);
  });

  it("handles a realistic CSS module file", () => {
    const css = `
      .card {
        display: flex;
        flex-direction: column;
        background-color: white;
        border-radius: 8px;
        padding: 16px;
        margin: 0 auto;
        max-width: 400px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .card__title {
        font-size: 24px;
        font-weight: bold;
        color: #333;
        margin-bottom: 8px;
      }

      .card__body {
        font-size: 14px;
        line-height: 1.5;
        color: #666;
      }

      .card__actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 16px;
      }
    `;

    const mutants = generateMutantsFromString(css, "card.module.css");

    // Should generate a substantial number of mutants
    expect(mutants.length).toBeGreaterThan(20);

    // Should cover multiple mutator types
    const mutatorNames = [...new Set(mutants.map((m) => m.mutatorName))];
    expect(mutatorNames.length).toBeGreaterThanOrEqual(5);

    // Each mutant should have valid structure
    for (const mutant of mutants) {
      expect(mutant.id).toBeTruthy();
      expect(mutant.fileName).toBe("card.module.css");
      expect(mutant.selector).toBeTruthy();
      expect(mutant.property).toBeTruthy();
      expect(mutant.original).toBeTruthy();
      expect(mutant.replacement).toBeTruthy();
      expect(mutant.replacement).not.toBe(mutant.original);
      expect(mutant.range[0]).toBeLessThan(mutant.range[1]);
    }
  });

  it("generates descriptions that are human-readable", () => {
    const css = `.btn { color: red; }`;
    const mutants = generateMutantsFromString(css);

    for (const mutant of mutants) {
      expect(mutant.description).toContain(mutant.mutatorName);
      expect(mutant.description).toContain(mutant.property);
      expect(mutant.description).toContain(mutant.original);
      expect(mutant.description).toContain(mutant.replacement);
    }
  });
});
