import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolve } from "node:path";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import {
  extractImports,
  resolveImport,
  collectCssDependencies,
  buildImportMap,
} from "../src/import-tracker.ts";

// ─── extractImports ─────────────────────────────────────────────

describe("extractImports", () => {
  it("extracts default import", () => {
    expect(extractImports('import Foo from "./Foo";')).toEqual(["./Foo"]);
  });

  it("extracts named import", () => {
    expect(extractImports('import { Foo } from "./Foo";')).toEqual(["./Foo"]);
  });

  it("extracts namespace import", () => {
    expect(extractImports('import * as Foo from "./Foo";')).toEqual(["./Foo"]);
  });

  it("extracts side-effect import (CSS)", () => {
    expect(extractImports('import "./styles.css";')).toEqual(["./styles.css"]);
  });

  it("extracts CSS module import", () => {
    expect(extractImports('import styles from "./Button.module.css";')).toEqual([
      "./Button.module.css",
    ]);
  });

  it("extracts multiple imports", () => {
    const source = `
      import React from "react";
      import styles from "./Button.module.css";
      import { render } from "./setup";
    `;
    expect(extractImports(source)).toEqual(["react", "./Button.module.css", "./setup"]);
  });

  it("handles multiline imports", () => {
    const source = `import {
  Foo,
  Bar,
  Baz
} from "./components";`;
    expect(extractImports(source)).toEqual(["./components"]);
  });

  it("skips import type (type-only)", () => {
    expect(extractImports('import type { Foo } from "./Foo";')).toEqual([]);
  });

  it("does NOT skip inline type imports", () => {
    // `import { type Foo, Bar } from "./Foo"` is NOT type-only
    expect(extractImports('import { type Foo, Bar } from "./Foo";')).toEqual(["./Foo"]);
  });

  it("handles single quotes", () => {
    expect(extractImports("import Foo from './Foo';")).toEqual(["./Foo"]);
  });

  it("handles imports with .ts extension", () => {
    expect(extractImports('import { setup } from "./setup.ts";')).toEqual(["./setup.ts"]);
  });

  it("deduplicates same specifier", () => {
    const source = `
      import Foo from "./Foo";
      import { Bar } from "./Foo";
    `;
    expect(extractImports(source)).toEqual(["./Foo"]);
  });

  it("returns empty for no imports", () => {
    expect(extractImports("const x = 1;")).toEqual([]);
  });

  it("returns empty for empty string", () => {
    expect(extractImports("")).toEqual([]);
  });

  it("handles import with no semicolon", () => {
    expect(extractImports('import Foo from "./Foo"')).toEqual(["./Foo"]);
  });
});

// ─── resolveImport ──────────────────────────────────────────────

describe("resolveImport", () => {
  const fixtureDir = resolve(import.meta.dirname, ".test-resolve");

  beforeAll(() => {
    mkdirSync(resolve(fixtureDir, "sub"), { recursive: true });
    writeFileSync(resolve(fixtureDir, "Button.tsx"), "export function Button() {}");
    writeFileSync(resolve(fixtureDir, "Button.module.css"), ".button {}");
    writeFileSync(resolve(fixtureDir, "styles.css"), ".a {}");
    writeFileSync(resolve(fixtureDir, "sub/index.ts"), "export const x = 1;");
  });

  afterAll(() => {
    if (existsSync(fixtureDir)) rmSync(fixtureDir, { recursive: true });
  });

  it("returns null for bare specifiers", () => {
    expect(resolveImport("react", fixtureDir)).toBeNull();
    expect(resolveImport("vitest", fixtureDir)).toBeNull();
    expect(resolveImport("@vitest/browser/context", fixtureDir)).toBeNull();
  });

  it("resolves relative path with explicit extension", () => {
    expect(resolveImport("./Button.module.css", fixtureDir)).toBe(
      resolve(fixtureDir, "Button.module.css"),
    );
  });

  it("resolves relative path without extension — tries .ts then .tsx", () => {
    expect(resolveImport("./Button", fixtureDir)).toBe(resolve(fixtureDir, "Button.tsx"));
  });

  it("resolves CSS file without extension", () => {
    expect(resolveImport("./styles.css", fixtureDir)).toBe(resolve(fixtureDir, "styles.css"));
  });

  it("resolves directory import to index file", () => {
    expect(resolveImport("./sub", fixtureDir)).toBe(resolve(fixtureDir, "sub/index.ts"));
  });

  it("returns null when file does not exist", () => {
    expect(resolveImport("./NonExistent", fixtureDir)).toBeNull();
  });

  it("handles ../ relative paths", () => {
    const subDir = resolve(fixtureDir, "sub");
    expect(resolveImport("../Button", subDir)).toBe(resolve(fixtureDir, "Button.tsx"));
  });
});

// ─── collectCssDependencies ─────────────────────────────────────

describe("collectCssDependencies", () => {
  const fixtureDir = resolve(import.meta.dirname, ".test-collect");

  beforeAll(() => {
    mkdirSync(resolve(fixtureDir, "src"), { recursive: true });
    mkdirSync(resolve(fixtureDir, "test"), { recursive: true });

    // CSS files
    writeFileSync(resolve(fixtureDir, "src/Button.module.css"), ".button { color: red; }");
    writeFileSync(resolve(fixtureDir, "src/Card.module.css"), ".card { display: flex; }");

    // Components
    writeFileSync(
      resolve(fixtureDir, "src/Button.tsx"),
      `import styles from "./Button.module.css";\nexport function Button() { return null; }`,
    );
    writeFileSync(
      resolve(fixtureDir, "src/Card.tsx"),
      `import styles from "./Card.module.css";\nexport function Card() { return null; }`,
    );

    // Test files
    writeFileSync(
      resolve(fixtureDir, "test/Button.test.tsx"),
      `import { Button } from "../src/Button.tsx";\nimport { expect } from "vitest";`,
    );
    writeFileSync(
      resolve(fixtureDir, "test/Card.test.tsx"),
      `import { Card } from "../src/Card.tsx";\nimport { expect } from "vitest";`,
    );

    // Shared setup (no CSS)
    writeFileSync(resolve(fixtureDir, "test/setup.ts"), `export function render() {}`);

    // A file with a cycle
    writeFileSync(
      resolve(fixtureDir, "src/A.ts"),
      'import "./B.ts";\nimport "./Button.module.css";',
    );
    writeFileSync(resolve(fixtureDir, "src/B.ts"), 'import "./A.ts";');
  });

  afterAll(() => {
    if (existsSync(fixtureDir)) rmSync(fixtureDir, { recursive: true });
  });

  it("finds Button.module.css from Button.test.tsx", () => {
    const cache = new Map<string, string[]>();
    const deps = collectCssDependencies(
      resolve(fixtureDir, "test/Button.test.tsx"),
      cache,
      new Set(),
    );
    expect(deps.size).toBe(1);
    expect(deps.has(resolve(fixtureDir, "src/Button.module.css"))).toBe(true);
  });

  it("finds Card.module.css from Card.test.tsx", () => {
    const cache = new Map<string, string[]>();
    const deps = collectCssDependencies(
      resolve(fixtureDir, "test/Card.test.tsx"),
      cache,
      new Set(),
    );
    expect(deps.size).toBe(1);
    expect(deps.has(resolve(fixtureDir, "src/Card.module.css"))).toBe(true);
  });

  it("does NOT find Card.module.css from Button.test.tsx", () => {
    const cache = new Map<string, string[]>();
    const deps = collectCssDependencies(
      resolve(fixtureDir, "test/Button.test.tsx"),
      cache,
      new Set(),
    );
    expect(deps.has(resolve(fixtureDir, "src/Card.module.css"))).toBe(false);
  });

  it("returns empty set for file with no CSS imports", () => {
    const cache = new Map<string, string[]>();
    const deps = collectCssDependencies(resolve(fixtureDir, "test/setup.ts"), cache, new Set());
    expect(deps.size).toBe(0);
  });

  it("handles cycles without infinite loops", () => {
    const cache = new Map<string, string[]>();
    const deps = collectCssDependencies(resolve(fixtureDir, "src/A.ts"), cache, new Set());
    // Should find Button.module.css through A.ts's direct import
    expect(deps.has(resolve(fixtureDir, "src/Button.module.css"))).toBe(true);
    // Should not hang
  });

  it("returns empty for nonexistent file", () => {
    const cache = new Map<string, string[]>();
    const deps = collectCssDependencies("/nonexistent/file.ts", cache, new Set());
    expect(deps.size).toBe(0);
  });

  it("uses cache across calls", () => {
    const cache = new Map<string, string[]>();

    // First call populates cache
    collectCssDependencies(resolve(fixtureDir, "test/Button.test.tsx"), cache, new Set());
    expect(cache.size).toBeGreaterThan(0);

    // Second call reuses cache
    const cacheSizeBefore = cache.size;
    collectCssDependencies(resolve(fixtureDir, "test/Button.test.tsx"), cache, new Set());
    expect(cache.size).toBe(cacheSizeBefore);
  });

  it("finds CSS from direct CSS import", () => {
    const cache = new Map<string, string[]>();
    const deps = collectCssDependencies(
      resolve(fixtureDir, "src/Button.module.css"),
      cache,
      new Set(),
    );
    expect(deps.size).toBe(1);
    expect(deps.has(resolve(fixtureDir, "src/Button.module.css"))).toBe(true);
  });
});

// ─── buildImportMap ─────────────────────────────────────────────

describe("buildImportMap", () => {
  const fixtureDir = resolve(import.meta.dirname, ".test-import-map");

  beforeAll(() => {
    mkdirSync(resolve(fixtureDir, "src"), { recursive: true });
    mkdirSync(resolve(fixtureDir, "test"), { recursive: true });

    writeFileSync(resolve(fixtureDir, "src/Button.module.css"), ".button {}");
    writeFileSync(resolve(fixtureDir, "src/Card.module.css"), ".card {}");
    writeFileSync(resolve(fixtureDir, "src/Unused.module.css"), ".unused {}");

    writeFileSync(
      resolve(fixtureDir, "src/Button.tsx"),
      'import styles from "./Button.module.css";\nexport const Button = () => null;',
    );
    writeFileSync(
      resolve(fixtureDir, "src/Card.tsx"),
      'import styles from "./Card.module.css";\nexport const Card = () => null;',
    );

    writeFileSync(
      resolve(fixtureDir, "test/Button.test.tsx"),
      'import { Button } from "../src/Button.tsx";',
    );
    writeFileSync(
      resolve(fixtureDir, "test/Card.test.tsx"),
      'import { Card } from "../src/Card.tsx";',
    );
    writeFileSync(
      resolve(fixtureDir, "test/Both.test.tsx"),
      'import { Button } from "../src/Button.tsx";\nimport { Card } from "../src/Card.tsx";',
    );
  });

  afterAll(() => {
    if (existsSync(fixtureDir)) rmSync(fixtureDir, { recursive: true });
  });

  it("maps Button.module.css to Button.test.tsx and Both.test.tsx", async () => {
    const map = await buildImportMap(["test/**/*.test.tsx"], fixtureDir);
    const buttonCss = resolve(fixtureDir, "src/Button.module.css");
    const buttonTests = map.get(buttonCss);

    expect(buttonTests).toBeDefined();
    expect(buttonTests!.length).toBe(2);
    expect(buttonTests).toContainEqual(resolve(fixtureDir, "test/Button.test.tsx"));
    expect(buttonTests).toContainEqual(resolve(fixtureDir, "test/Both.test.tsx"));
  });

  it("maps Card.module.css to Card.test.tsx and Both.test.tsx", async () => {
    const map = await buildImportMap(["test/**/*.test.tsx"], fixtureDir);
    const cardCss = resolve(fixtureDir, "src/Card.module.css");
    const cardTests = map.get(cardCss);

    expect(cardTests).toBeDefined();
    expect(cardTests!.length).toBe(2);
    expect(cardTests).toContainEqual(resolve(fixtureDir, "test/Card.test.tsx"));
    expect(cardTests).toContainEqual(resolve(fixtureDir, "test/Both.test.tsx"));
  });

  it("does NOT map Unused.module.css to any test", async () => {
    const map = await buildImportMap(["test/**/*.test.tsx"], fixtureDir);
    const unusedCss = resolve(fixtureDir, "src/Unused.module.css");
    expect(map.has(unusedCss)).toBe(false);
  });

  it("returns empty map when no test files match pattern", async () => {
    const map = await buildImportMap(["nonexistent/**/*.test.tsx"], fixtureDir);
    expect(map.size).toBe(0);
  });

  it("handles multiple glob patterns", async () => {
    const map = await buildImportMap(["test/Button.test.tsx", "test/Card.test.tsx"], fixtureDir);
    expect(map.size).toBe(2);
  });
});

// ─── Integration: real e2e project ──────────────────────────────

describe("buildImportMap against e2e project", () => {
  const e2eDir = resolve(import.meta.dirname, "e2e/project");

  it("maps Button.module.css to Button.test.tsx only", async () => {
    const map = await buildImportMap(["test/**/*.test.tsx"], e2eDir);
    const buttonCss = resolve(e2eDir, "src/Button.module.css");
    const tests = map.get(buttonCss);

    expect(tests).toBeDefined();
    expect(tests!.length).toBe(1);
    expect(tests![0]).toBe(resolve(e2eDir, "test/Button.test.tsx"));
  });

  it("maps Card.module.css to Card.test.tsx only", async () => {
    const map = await buildImportMap(["test/**/*.test.tsx"], e2eDir);
    const cardCss = resolve(e2eDir, "src/Card.module.css");
    const tests = map.get(cardCss);

    expect(tests).toBeDefined();
    expect(tests!.length).toBe(1);
    expect(tests![0]).toBe(resolve(e2eDir, "test/Card.test.tsx"));
  });

  it("Button.module.css is NOT mapped to Card.test.tsx", async () => {
    const map = await buildImportMap(["test/**/*.test.tsx"], e2eDir);
    const buttonCss = resolve(e2eDir, "src/Button.module.css");
    const tests = map.get(buttonCss)!;
    expect(tests.every((t) => !t.includes("Card.test"))).toBe(true);
  });
});
