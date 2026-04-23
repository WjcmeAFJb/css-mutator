import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolve } from "node:path";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { parseCss, parseCssFile, applyCssMutation } from "../src/css-parser.ts";

describe("parseCss edge cases", () => {
  it("handles empty CSS", () => {
    const result = parseCss("", "empty.css");
    expect(result.declarations).toHaveLength(0);
    expect(result.source).toBe("");
  });

  it("handles CSS with only comments", () => {
    const result = parseCss("/* just a comment */", "comment.css");
    expect(result.declarations).toHaveLength(0);
  });

  it("handles root-level custom properties", () => {
    const css = `:root { --color: red; }`;
    const result = parseCss(css, "root.css");
    expect(result.declarations.length).toBeGreaterThan(0);
  });

  it("handles keyframes declarations", () => {
    const css = `@keyframes fade { from { opacity: 1; } to { opacity: 0; } }`;
    const result = parseCss(css, "anim.css");
    expect(result.declarations.length).toBeGreaterThanOrEqual(2);
  });

  it("handles @font-face declarations (atrule parent)", () => {
    const css = `@font-face { font-family: MyFont; font-weight: bold; }`;
    const result = parseCss(css, "font.css");
    expect(result.declarations.length).toBe(2);
    expect(result.declarations[0]!.selector).toBe("@font-face");
  });

  it("handles selectors with special characters", () => {
    const css = `div[data-state="active"] > .child { color: red; }`;
    const result = parseCss(css, "test.css");
    expect(result.declarations).toHaveLength(1);
    expect(result.declarations[0]!.selector).toContain("[data-state");
  });

  it("preserves the AST", () => {
    const css = `.a { color: red; }`;
    const result = parseCss(css, "test.css");
    expect(result.ast).toBeDefined();
    expect(result.ast.type).toBe("root");
  });

  it("handles values with spaces", () => {
    const css = `.a { margin: 10px 20px 30px 40px; }`;
    const result = parseCss(css, "test.css");
    expect(result.declarations[0]!.value).toBe("10px 20px 30px 40px");
  });
});

describe("parseCssFile", () => {
  const testDir = resolve(import.meta.dirname, ".test-parse-file");
  const testFile = resolve(testDir, "test.css");

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(testFile, ".a { color: red; }\n.b { display: flex; }");
  });

  afterAll(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it("parses a CSS file from disk", () => {
    const result = parseCssFile(testFile);
    expect(result.declarations).toHaveLength(2);
    expect(result.fileName).toBe(testFile);
  });
});

describe("applyCssMutation edge cases", () => {
  it("handles replacement at the beginning of a file", () => {
    const css = `red`;
    const result = applyCssMutation(css, [0, 3], "blue");
    expect(result).toBe("blue");
  });

  it("handles empty replacement", () => {
    const css = `.a { color: red; }`;
    const result = applyCssMutation(css, [12, 15], "");
    expect(result).toBe(".a { color: ; }");
  });

  it("handles longer replacement", () => {
    const css = `.a { color: red; }`;
    const result = applyCssMutation(css, [12, 15], "transparent");
    expect(result).toBe(".a { color: transparent; }");
  });
});
