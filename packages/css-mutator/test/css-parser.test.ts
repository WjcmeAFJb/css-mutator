import { describe, it, expect } from "vitest";
import { parseCss, applyCssMutation } from "../src/css-parser.ts";

describe("parseCss", () => {
  it("parses simple CSS declarations", () => {
    const source = `.button { color: red; display: flex; }`;
    const result = parseCss(source, "test.css");

    expect(result.declarations).toHaveLength(2);
    expect(result.declarations[0]!.selector).toBe(".button");
    expect(result.declarations[0]!.property).toBe("color");
    expect(result.declarations[0]!.value).toBe("red");
    expect(result.declarations[1]!.property).toBe("display");
    expect(result.declarations[1]!.value).toBe("flex");
  });

  it("captures correct byte ranges for values", () => {
    const source = `.button { color: red; }`;
    const result = parseCss(source, "test.css");

    const decl = result.declarations[0]!;
    // Extract the value from the source using the range
    const extracted = source.slice(decl.range[0], decl.range[1]);
    expect(extracted).toBe("red");
  });

  it("handles multiline CSS", () => {
    const source = `.card {
  background-color: #fff;
  border-radius: 8px;
  padding: 16px;
}`;
    const result = parseCss(source, "test.css");

    expect(result.declarations).toHaveLength(3);
    expect(result.declarations[0]!.property).toBe("background-color");
    expect(result.declarations[0]!.value).toBe("#fff");
    expect(result.declarations[1]!.property).toBe("border-radius");
    expect(result.declarations[2]!.property).toBe("padding");
  });

  it("handles nested selectors (BEM-style)", () => {
    const source = `
.nav { display: flex; }
.nav__item { color: blue; }
.nav__item--active { font-weight: bold; }
`;
    const result = parseCss(source, "test.css");

    expect(result.declarations).toHaveLength(3);
    expect(result.declarations[0]!.selector).toBe(".nav");
    expect(result.declarations[1]!.selector).toBe(".nav__item");
    expect(result.declarations[2]!.selector).toBe(".nav__item--active");
  });

  it("handles media queries", () => {
    const source = `
@media (max-width: 768px) {
  .container { width: 100%; }
}`;
    const result = parseCss(source, "test.css");

    expect(result.declarations).toHaveLength(1);
    expect(result.declarations[0]!.selector).toBe(".container");
    expect(result.declarations[0]!.property).toBe("width");
  });

  it("handles multiple selectors", () => {
    const source = `h1, h2, h3 { margin: 0; }`;
    const result = parseCss(source, "test.css");

    expect(result.declarations).toHaveLength(1);
    expect(result.declarations[0]!.selector).toBe("h1, h2, h3");
  });

  it("handles CSS modules syntax", () => {
    const source = `
.container { display: grid; }
.header { composes: container; background: white; }
`;
    const result = parseCss(source, "test.module.css");

    // composes is a valid declaration in CSS modules
    expect(result.declarations.length).toBeGreaterThanOrEqual(2);
  });

  it("records correct line/column locations", () => {
    const source = `.a { color: red; }\n.b { display: flex; }`;
    const result = parseCss(source, "test.css");

    expect(result.declarations[0]!.location.start.line).toBe(1);
    expect(result.declarations[1]!.location.start.line).toBe(2);
  });
});

describe("applyCssMutation", () => {
  it("replaces value at the correct position", () => {
    const source = `.button { color: red; }`;
    const parsed = parseCss(source, "test.css");
    const decl = parsed.declarations[0]!;

    const mutated = applyCssMutation(source, decl.range, "blue");
    expect(mutated).toBe(`.button { color: blue; }`);
  });

  it("handles multiline replacements", () => {
    const source = `.card {\n  background-color: #fff;\n  padding: 16px;\n}`;
    const parsed = parseCss(source, "test.css");

    // Mutate background-color
    const decl = parsed.declarations[0]!;
    const mutated = applyCssMutation(source, decl.range, "#000");
    expect(mutated).toContain("background-color: #000");
    expect(mutated).toContain("padding: 16px"); // Other properties unchanged
  });

  it("handles replacements of different length", () => {
    const source = `.a { width: 100px; }`;
    const parsed = parseCss(source, "test.css");
    const decl = parsed.declarations[0]!;

    const mutated = applyCssMutation(source, decl.range, "0px");
    expect(mutated).toBe(`.a { width: 0px; }`);
  });
});
