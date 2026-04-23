/**
 * Generate CSS mutation report from demo CSS and take screenshots.
 * Uses the programmatic API to create mock results, generates HTML report,
 * then uses Playwright to screenshot it.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateHtmlReport } from "../../src/reporter/css-html-reporter.ts";
import type { CssMutantResult, MutationTestingSummary } from "../../src/types.ts";
import { parseCss } from "../../src/css-parser.ts";
import { createAllMutators } from "../../src/mutators/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = resolve(__dirname, "../../reports/screenshots");
const CSS_FILE_PATH = resolve(__dirname, "../../reports/screenshots/navbar.module.css");

// Create a realistic set of mutation results from the demo CSS
const demoCss = `/* navbar.module.css */
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  height: 64px;
  background-color: #1a1a2e;
  color: white;
  z-index: 10;
  position: sticky;
  top: 0;
}

.logo {
  font-size: 20px;
  font-weight: bold;
  color: white;
}`;

mkdirSync(REPORT_DIR, { recursive: true });
writeFileSync(CSS_FILE_PATH, demoCss);

const parsed = parseCss(demoCss, CSS_FILE_PATH);
const mutators = createAllMutators();
const results: CssMutantResult[] = [];
let id = 0;

for (const decl of parsed.declarations) {
  for (const mutator of mutators) {
    if (!mutator.handles(decl.property)) continue;
    const replacements = mutator.mutate(decl.property, decl.value);
    for (const replacement of replacements) {
      // Deterministic: survive every 5th mutant for a realistic demo
      const status = id % 5 === 3 ? "Survived" : "Killed";
      results.push({
        id: `css-${id++}`,
        mutatorName: mutator.name,
        fileName: CSS_FILE_PATH,
        selector: decl.selector,
        property: decl.property,
        original: decl.value,
        replacement,
        range: decl.range,
        location: decl.location,
        description: `${mutator.name}: ${decl.selector} { ${decl.property}: ${decl.value} → ${replacement} }`,
        status: status as "Killed" | "Survived",
        killedBy: status === "Killed" ? ["navbar.test.tsx"] : [],
        coveredBy: ["navbar.test.tsx"],
        duration: 150 + id * 20,
      });
    }
  }
}

// Force some specific interesting results
const zIndexMutants = results.filter((r) => r.property === "z-index");
if (zIndexMutants[0]) zIndexMutants[0].status = "Killed";
if (zIndexMutants[1]) zIndexMutants[1].status = "Survived";

const killed = results.filter((r) => r.status === "Killed").length;
const survived = results.filter((r) => r.status === "Survived").length;
const total = results.length;

const summary: MutationTestingSummary = {
  files: {
    [CSS_FILE_PATH]: results,
  },
  totals: {
    mutants: total,
    killed,
    survived,
    timeout: 0,
    noCoverage: 0,
    runtimeError: 0,
    mutationScore: (killed / total) * 100,
    mutationScoreBasedOnCoveredCode: (killed / total) * 100,
  },
  timestamp: new Date().toISOString(),
  duration: 12500,
};

mkdirSync(REPORT_DIR, { recursive: true });
const reportPath = resolve(REPORT_DIR, "index.html");
await generateHtmlReport(summary, reportPath);
console.log(`Report generated: ${reportPath}`);
console.log(`Total mutants: ${total}, Killed: ${killed}, Survived: ${survived}`);
console.log(`Mutation score: ${summary.totals.mutationScore.toFixed(1)}%`);
