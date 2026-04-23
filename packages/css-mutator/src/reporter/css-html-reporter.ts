import { readFileSync, writeFileSync } from "node:fs";
import type {
  CssCoverageReport,
  CssMutantResult,
  MutantStatus,
  MutationTestingSummary,
} from "../types.ts";

/**
 * Print a console summary of mutation testing results.
 */
export function printConsoleReport(summary: MutationTestingSummary): void {
  const { totals } = summary;

  console.log("\n" + "=".repeat(60));
  console.log("  CSS Mutation Testing Results");
  console.log("=".repeat(60));
  console.log(`  Total mutants:    ${totals.mutants}`);
  console.log(`  Killed:           ${totals.killed} ✅`);
  console.log(`  Survived:         ${totals.survived} ❌`);
  console.log(`  Timeout:          ${totals.timeout} ⏱️`);
  console.log(`  No Coverage:      ${totals.noCoverage}`);
  console.log(`  Runtime Error:    ${totals.runtimeError}`);
  console.log(`  Mutation Score:   ${totals.mutationScore.toFixed(2)}%`);
  console.log(`  Duration:         ${(summary.duration / 1000).toFixed(1)}s`);
  console.log("=".repeat(60));

  // Per-file breakdown
  for (const [fileName, results] of Object.entries(summary.files)) {
    const shortName = fileName.split("/").slice(-2).join("/");
    const fileKilled = results.filter((r) => r.status === "Killed").length;
    const fileTotal = results.length;
    const fileScore = fileTotal > 0 ? ((fileKilled / fileTotal) * 100).toFixed(1) : "100.0";

    console.log(`\n  📁 ${shortName} — ${fileScore}% (${fileKilled}/${fileTotal})`);

    // Show survived mutants
    const survived = results.filter((r) => r.status === "Survived");
    for (const mutant of survived) {
      console.log(
        `     ❌ L${mutant.location.start.line}: ${mutant.selector} { ${mutant.property}: ${mutant.original} → ${mutant.replacement} }`,
      );
    }
  }

  console.log("");
}

/**
 * Generate an HTML report with inline CSS coverage visualization.
 */
export async function generateHtmlReport(
  summary: MutationTestingSummary,
  outputPath: string,
): Promise<void> {
  const fileReports: string[] = [];

  for (const [fileName, results] of Object.entries(summary.files)) {
    const shortName = fileName.split("/").slice(-3).join("/");
    let source: string;
    try {
      source = readFileSync(fileName, "utf-8");
    } catch {
      source = "/* Could not read source file */";
    }

    fileReports.push(renderFileReport(shortName, source, results));
  }

  const coverageSection = summary.cssCoverage
    ? renderCoverageSection(summary.cssCoverage)
    : "";
  const html = renderFullReport(summary, fileReports, coverageSection);
  writeFileSync(outputPath, html, "utf-8");
}

/**
 * Generate a JSON report compatible with mutation-testing-report-schema.
 */
export function generateJsonReport(summary: MutationTestingSummary, outputPath: string): void {
  // Convert to mutation-testing-report-schema format
  const schemaReport = {
    $schema: "https://git.io/mutation-testing-schema",
    schemaVersion: "2",
    thresholds: { high: 80, low: 60 },
    projectRoot: process.cwd(),
    files: {} as Record<string, unknown>,
  };

  for (const [fileName, results] of Object.entries(summary.files)) {
    let source: string;
    try {
      source = readFileSync(fileName, "utf-8");
    } catch {
      source = "";
    }

    schemaReport.files[fileName] = {
      language: "css",
      source,
      mutants: results.map((r) => ({
        id: r.id,
        mutatorName: r.mutatorName,
        replacement: r.replacement,
        description: r.description,
        location: {
          start: { line: r.location.start.line, column: r.location.start.column },
          end: { line: r.location.end.line, column: r.location.end.column },
        },
        status: r.status,
        killedBy: r.killedBy,
        coveredBy: r.coveredBy,
        duration: r.duration,
      })),
    };
  }

  writeFileSync(outputPath, JSON.stringify(schemaReport, null, 2), "utf-8");
}

function renderFileReport(fileName: string, source: string, results: CssMutantResult[]): string {
  const lines = source.split("\n");
  const killed = results.filter((r) => r.status === "Killed").length;
  const total = results.length;
  const score = total > 0 ? ((killed / total) * 100).toFixed(1) : "100.0";

  // Build a map of line number → mutants on that line
  const mutantsByLine = new Map<number, CssMutantResult[]>();
  for (const result of results) {
    const line = result.location.start.line;
    if (!mutantsByLine.has(line)) {
      mutantsByLine.set(line, []);
    }
    mutantsByLine.get(line)!.push(result);
  }

  // Render source lines with mutation annotations
  const renderedLines = lines.map((line, index) => {
    const lineNum = index + 1;
    const lineMutants = mutantsByLine.get(lineNum);
    const escapedLine = escapeHtml(line);

    if (!lineMutants) {
      return `<tr class="line"><td class="line-num">${lineNum}</td><td class="gutter"></td><td class="code"><pre>${escapedLine}</pre></td></tr>`;
    }

    const allKilled = lineMutants.every((m) => m.status === "Killed");
    const anySurvived = lineMutants.some((m) => m.status === "Survived");
    const gutterClass = anySurvived ? "survived" : allKilled ? "killed" : "mixed";
    const mutantCount = lineMutants.length;

    const tooltipContent = lineMutants
      .map((m) => {
        const icon = m.status === "Killed" ? "✅" : m.status === "Survived" ? "❌" : "⏱️";
        const killers =
          m.killedBy.length > 0
            ? ` ← ${m.killedBy.map((k) => k.split("::").slice(1).join("::") || k).join(", ")}`
            : "";
        return `${icon} ${escapeHtml(m.mutatorName)}: ${escapeHtml(m.property)}: ${escapeHtml(m.original)} → ${escapeHtml(m.replacement)}${killers}`;
      })
      .join("\n");

    return `<tr class="line has-mutants ${gutterClass}">
      <td class="line-num">${lineNum}</td>
      <td class="gutter ${gutterClass}" title="${escapeHtml(tooltipContent)}">${mutantCount}</td>
      <td class="code"><pre>${escapedLine}</pre></td>
    </tr>`;
  });

  return `
    <div class="file-report">
      <div class="file-header">
        <h3>${escapeHtml(fileName)}</h3>
        <span class="file-score ${parseFloat(score) >= 80 ? "good" : parseFloat(score) >= 60 ? "warn" : "bad"}">
          ${score}% (${killed}/${total})
        </span>
      </div>
      <table class="source-code">
        <tbody>
          ${renderedLines.join("\n")}
        </tbody>
      </table>
      <div class="mutant-details">
        <h4>Mutations</h4>
        <table class="mutant-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Line</th>
              <th>Mutator</th>
              <th>Selector</th>
              <th>Change</th>
              <th>Killed By</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            ${results
              .map(
                (r) => `
              <tr class="mutant-row ${r.status.toLowerCase()}">
                <td class="status-cell ${r.status.toLowerCase()}">${statusIcon(r.status)} ${r.status}</td>
                <td>${r.location.start.line}</td>
                <td>${escapeHtml(r.mutatorName)}</td>
                <td><code>${escapeHtml(r.selector)}</code></td>
                <td><code>${escapeHtml(r.property)}: ${escapeHtml(r.original)}</code> → <code>${escapeHtml(r.replacement)}</code></td>
                <td>${formatKillers(r.killedBy)}</td>
                <td>${r.duration}ms</td>
              </tr>
            `,
              )
              .join("\n")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderFullReport(
  summary: MutationTestingSummary,
  fileReports: string[],
  coverageSection: string,
): string {
  const { totals } = summary;
  const scoreClass =
    totals.mutationScore >= 80 ? "good" : totals.mutationScore >= 60 ? "warn" : "bad";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CSS Mutation Testing Report</title>
  <style>
    :root {
      --bg: #0d1117;
      --surface: #161b22;
      --border: #30363d;
      --text: #e6edf3;
      --text-muted: #8b949e;
      --green: #3fb950;
      --red: #f85149;
      --yellow: #d29922;
      --blue: #58a6ff;
      --purple: #bc8cff;
      --mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }

    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }

    header {
      text-align: center;
      padding: 3rem 0 2rem;
      border-bottom: 1px solid var(--border);
      margin-bottom: 2rem;
    }

    header h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, var(--blue), var(--purple));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 1rem;
      margin: 2rem 0;
    }

    .summary-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.25rem;
      text-align: center;
    }

    .summary-card .value {
      font-size: 2rem;
      font-weight: bold;
      display: block;
    }

    .summary-card .label {
      font-size: 0.85rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .score-badge {
      display: inline-block;
      font-size: 3rem;
      font-weight: bold;
      padding: 0.5rem 1.5rem;
      border-radius: 12px;
      margin: 1rem 0;
    }

    .score-badge.good { color: var(--green); border: 2px solid var(--green); }
    .score-badge.warn { color: var(--yellow); border: 2px solid var(--yellow); }
    .score-badge.bad { color: var(--red); border: 2px solid var(--red); }

    .file-report {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 2rem;
      overflow: hidden;
    }

    .file-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border);
      background: rgba(255,255,255,0.02);
    }

    .file-header h3 { font-size: 1rem; font-weight: 600; }

    .file-score {
      font-weight: bold;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.85rem;
    }

    .file-score.good { background: rgba(63,185,80,0.15); color: var(--green); }
    .file-score.warn { background: rgba(210,153,34,0.15); color: var(--yellow); }
    .file-score.bad { background: rgba(248,81,73,0.15); color: var(--red); }

    .source-code {
      width: 100%;
      border-collapse: collapse;
      font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
      font-size: 0.85rem;
    }

    .source-code tr:hover { background: rgba(255,255,255,0.03); }

    .source-code .line-num {
      width: 50px;
      text-align: right;
      padding: 0 12px;
      color: var(--text-muted);
      user-select: none;
      border-right: 1px solid var(--border);
    }

    .source-code .gutter {
      width: 32px;
      text-align: center;
      font-size: 0.75rem;
      font-weight: bold;
      cursor: default;
    }

    .source-code .gutter.killed { color: var(--green); background: rgba(63,185,80,0.08); }
    .source-code .gutter.survived { color: var(--red); background: rgba(248,81,73,0.08); }
    .source-code .gutter.mixed { color: var(--yellow); background: rgba(210,153,34,0.08); }

    .source-code .code {
      padding: 0 16px;
      white-space: pre;
    }

    .source-code .code pre {
      margin: 0;
      font: inherit;
    }

    .source-code tr.killed .code { background: rgba(63,185,80,0.04); }
    .source-code tr.survived .code { background: rgba(248,81,73,0.04); }

    .mutant-details {
      padding: 1.5rem;
      border-top: 1px solid var(--border);
    }

    .mutant-details h4 {
      margin-bottom: 1rem;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    .mutant-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }

    .mutant-table th {
      text-align: left;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--border);
      color: var(--text-muted);
      font-weight: 600;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .mutant-table td {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid rgba(48,54,61,0.5);
    }

    .mutant-table code {
      background: rgba(255,255,255,0.06);
      padding: 0.1rem 0.4rem;
      border-radius: 3px;
      font-size: 0.82rem;
    }

    .status-cell.killed { color: var(--green); }
    .status-cell.survived { color: var(--red); }
    .status-cell.timeout { color: var(--yellow); }
    .status-cell.runtimeerror { color: var(--yellow); }
    .status-cell.nocoverage { color: var(--text-muted); }

    .killer-list { display: flex; flex-wrap: wrap; gap: 0.25rem 0.75rem; }
    .killer { display: inline-block; }
    .killer-test { font-weight: 500; }
    .killer-file { display: block; font-size: 0.75em; color: var(--text-muted); }
    .no-killer { color: var(--text-muted); }

    /* ── CSS Coverage (Istanbul-style) ── */
    .coverage-section { margin-top: 2rem; }
    .coverage-section h2 { display: flex; align-items: center; gap: 0.75rem; }

    .cov-tabs { display: flex; gap: 0; margin-bottom: 0; border-bottom: 1px solid var(--border); }
    .cov-tab { background: none; border: none; color: var(--text-muted); padding: 0.6rem 1.2rem; cursor: pointer; font-size: 0.9rem; border-bottom: 2px solid transparent; }
    .cov-tab:hover { color: var(--text); }
    .cov-tab.active { color: var(--blue); border-bottom-color: var(--blue); }

    /* File table (directory listing) */
    .cov-file-table { width: 100%; border-collapse: collapse; }
    .cov-file-table th { text-align: left; padding: 0.6rem 0.75rem; color: var(--text-muted); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); }
    .cov-file-row { cursor: pointer; }
    .cov-file-row:hover { background: var(--surface); }
    .cov-file-row td { padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); }
    .cov-file-name { font-family: var(--mono); font-size: 0.85rem; }

    /* Coverage bar */
    .cov-bar { width: 120px; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; }
    .cov-bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
    .cov-bar-fill.good { background: var(--green); }
    .cov-bar-fill.warn { background: var(--yellow); }
    .cov-bar-fill.bad { background: var(--red); }
    .cov-pct { font-weight: 600; font-size: 0.85rem; }
    .cov-pct.good { color: var(--green); }
    .cov-pct.warn { color: var(--yellow); }
    .cov-pct.bad { color: var(--red); }
    .cov-ratio { color: var(--text-muted); font-size: 0.8rem; }

    /* File source view */
    .cov-file-view { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    .cov-file-header { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); }
    .cov-file-header h3 { font-size: 0.95rem; font-family: var(--mono); }
    .cov-back { background: none; border: 1px solid var(--border); color: var(--text-muted); padding: 0.25rem 0.75rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
    .cov-back:hover { color: var(--text); border-color: var(--text-muted); }

    .cov-source { width: 100%; border-collapse: collapse; font-family: var(--mono); font-size: 0.8rem; }
    .cov-line td { padding: 0; vertical-align: top; }
    .cov-ln { width: 3rem; text-align: right; padding-right: 0.75rem !important; color: var(--text-muted); user-select: none; }
    .cov-marker { width: 1.5rem; text-align: center; font-size: 0.7rem; }
    .cov-src { padding-left: 0.5rem !important; }
    .cov-src pre { margin: 0; white-space: pre-wrap; display: inline; }

    .cov-line.cov-hit { background: rgba(34, 197, 94, 0.08); }
    .cov-line.cov-hit .cov-marker { color: var(--green); }
    .cov-line.cov-miss { background: rgba(239, 68, 68, 0.08); }
    .cov-line.cov-miss .cov-marker { color: var(--red); }
    .cov-line.cov-partial { background: rgba(210, 153, 34, 0.08); }
    .cov-line.cov-partial .cov-marker { color: var(--yellow); }

    .cov-annotation { display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem; padding: 0.15rem 0 0.25rem; }
    .cov-pill { padding: 0.1rem 0.4rem; border-radius: 3px; font-size: 0.7rem; }
    .cov-pill.covered { background: rgba(34, 197, 94, 0.15); color: var(--green); }
    .cov-pill.uncovered { background: rgba(239, 68, 68, 0.15); color: var(--red); }
    .cov-tests-label { color: var(--text-muted); font-size: 0.65rem; margin-left: 0.5rem; }
    .cov-test-badge { padding: 0.1rem 0.4rem; border-radius: 3px; font-size: 0.65rem; background: rgba(88, 166, 255, 0.12); color: var(--blue); }
    .cov-no-tests { font-size: 0.65rem; color: var(--text-muted); font-style: italic; }

    /* Tests tab */
    .cov-test-table { width: 100%; border-collapse: collapse; }
    .cov-test-table th { text-align: left; padding: 0.6rem 0.75rem; color: var(--text-muted); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); }
    .cov-test-row td { padding: 0.5rem 0.75rem; border-bottom: none; }
    .cov-test-file { font-family: var(--mono); font-size: 0.8rem; color: var(--text-muted); }
    .cov-test-name { font-weight: 500; font-size: 0.85rem; }
    .cov-test-detail td { padding: 0.15rem 0.75rem 0.6rem; border-bottom: 1px solid var(--border); }
    .cov-test-detail .cov-pill { font-size: 0.7rem; }

    footer {
      text-align: center;
      padding: 2rem 0;
      color: var(--text-muted);
      font-size: 0.85rem;
      border-top: 1px solid var(--border);
      margin-top: 2rem;
    }

    footer a { color: var(--blue); text-decoration: none; }
    footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>CSS Mutation Testing Report</h1>
      <p style="color: var(--text-muted)">Generated ${new Date(summary.timestamp).toLocaleString()} &mdash; ${(summary.duration / 1000).toFixed(1)}s</p>
      <div class="score-badge ${scoreClass}">${totals.mutationScore.toFixed(1)}%</div>
    </header>

    <div class="summary-grid">
      <div class="summary-card">
        <span class="value">${totals.mutants}</span>
        <span class="label">Total Mutants</span>
      </div>
      <div class="summary-card">
        <span class="value" style="color: var(--green)">${totals.killed}</span>
        <span class="label">Killed</span>
      </div>
      <div class="summary-card">
        <span class="value" style="color: var(--red)">${totals.survived}</span>
        <span class="label">Survived</span>
      </div>
      <div class="summary-card">
        <span class="value" style="color: var(--yellow)">${totals.timeout}</span>
        <span class="label">Timeout</span>
      </div>
      <div class="summary-card">
        <span class="value" style="color: var(--text-muted)">${totals.noCoverage}</span>
        <span class="label">No Coverage</span>
      </div>
      <div class="summary-card">
        <span class="value">${Object.keys(summary.files).length}</span>
        <span class="label">Files</span>
      </div>
    </div>

    ${fileReports.join("\n")}

    ${coverageSection}

    <footer>
      <p>Generated by <a href="https://github.com/WjcmeAFJb/css-mutator">css-mutator</a></p>
    </footer>
  </div>
</body>
</html>`;
}

function statusIcon(status: MutantStatus): string {
  switch (status) {
    case "Killed":
      return "&#x2705;";
    case "Survived":
      return "&#x274C;";
    case "Timeout":
      return "&#x23F1;";
    case "RuntimeError":
      return "&#x1F4A5;";
    case "NoCoverage":
      return "&#x2796;";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function formatKillers(killedBy: string[]): string {
  if (killedBy.length === 0) return "<span class=\"no-killer\">—</span>";
  const items = killedBy.map((k) => {
    const parts = k.split("::");
    const file = escapeHtml(parts[0] ?? k);
    const testName = parts.length > 1 ? parts.slice(1).join("::") : "";
    if (testName) {
      return `<span class="killer"><span class="killer-test">${escapeHtml(testName)}</span><span class="killer-file">${file}</span></span>`;
    }
    return `<span class="killer">${file}</span>`;
  });
  return `<div class="killer-list">${items.join("")}</div>`;
}

function renderCoverageSection(coverage: CssCoverageReport): string {
  const { perTestFile, aggregate } = coverage;
  if (perTestFile.length === 0) return "";

  const usedCount = aggregate.filter((r) => r.used).length;
  const totalCount = aggregate.length;
  const pct = totalCount > 0 ? ((usedCount / totalCount) * 100).toFixed(1) : "100";

  // Group aggregate rules by CSS file (full path → rules)
  const byFile = new Map<string, typeof aggregate>();
  for (const rule of aggregate) {
    const list = byFile.get(rule.cssFile) ?? [];
    list.push(rule);
    byFile.set(rule.cssFile, list);
  }

  // Build per-rule → test mapping: for each rule key, which tests cover it?
  const ruleTests = new Map<string, string[]>();
  for (const tf of perTestFile) {
    for (const tc of tf.perTestCase ?? []) {
      for (const r of tc.rules) {
        if (!r.used) continue;
        const key = `${r.cssFile}:${r.line}:${r.selector}`;
        const tests = ruleTests.get(key) ?? [];
        tests.push(tc.testName);
        ruleTests.set(key, tests);
      }
    }
  }

  // ── File tree (Istanbul-style directory listing) ───────────
  const fileRows = [...byFile]
    .map(([fullPath, rules]) => {
      const shortPath = fullPath.split("/").slice(-2).join("/");
      const fUsed = rules.filter((r) => r.used).length;
      const fTotal = rules.length;
      const fPct = fTotal > 0 ? ((fUsed / fTotal) * 100).toFixed(1) : "100";
      const cls = parseFloat(fPct) >= 80 ? "good" : parseFloat(fPct) >= 60 ? "warn" : "bad";
      const fileId = shortPath.replace(/[^a-zA-Z0-9]/g, "-");
      return `<tr class="cov-file-row" onclick="showCssFile('${fileId}')">
        <td class="cov-file-name">${escapeHtml(shortPath)}</td>
        <td><div class="cov-bar"><div class="cov-bar-fill ${cls}" style="width:${fPct}%"></div></div></td>
        <td class="cov-pct ${cls}">${fPct}%</td>
        <td class="cov-ratio">${fUsed}/${fTotal}</td>
      </tr>`;
    })
    .join("\n");

  // ── Per-file source views (hidden, shown on click) ─────────
  const fileViews = [...byFile]
    .map(([fullPath, rules]) => {
      const shortPath = fullPath.split("/").slice(-2).join("/");
      const fileId = shortPath.replace(/[^a-zA-Z0-9]/g, "-");
      let source: string;
      try {
        source = readFileSync(fullPath, "utf-8");
      } catch {
        source = "/* Could not read file */";
      }
      const lines = source.split("\n");

      // Build line → rules mapping
      const lineRules = new Map<number, Array<{ selector: string; used: boolean; tests: string[] }>>();
      for (const r of rules) {
        const key = `${r.cssFile}:${r.line}:${r.selector}`;
        const tests = ruleTests.get(key) ?? [];
        const lr = lineRules.get(r.line) ?? [];
        lr.push({ selector: r.selector, used: r.used, tests });
        lineRules.set(r.line, lr);
      }

      const sourceLines = lines
        .map((line, i) => {
          const lineNum = i + 1;
          const lr = lineRules.get(lineNum);
          const covClass = lr
            ? lr.every((r) => r.used)
              ? "cov-hit"
              : lr.some((r) => r.used)
                ? "cov-partial"
                : "cov-miss"
            : "";
          // Build annotation for covered lines
          let annotation = "";
          if (lr) {
            const testNames = lr.flatMap((r) => r.tests);
            const uniqueTests = [...new Set(testNames)];
            const testBadges = uniqueTests
              .map((t) => `<span class="cov-test-badge">${escapeHtml(t)}</span>`)
              .join(" ");
            annotation = uniqueTests.length > 0
              ? `<div class="cov-annotation">${testBadges}</div>`
              : `<div class="cov-annotation"><span class="cov-no-tests">no tests</span></div>`;
          }
          return `<tr class="cov-line ${covClass}">
            <td class="cov-ln">${lineNum}</td>
            <td class="cov-marker">${lr ? (lr.every((r) => r.used) ? "&#x2714;" : lr.some((r) => r.used) ? "&#x25CB;" : "&#x2718;") : ""}</td>
            <td class="cov-src"><pre>${escapeHtml(line)}</pre>${annotation}</td>
          </tr>`;
        })
        .join("\n");

      return `<div class="cov-file-view" id="cov-${fileId}" style="display:none">
        <div class="cov-file-header">
          <button class="cov-back" onclick="showFileList()">&#x2190; Back</button>
          <h3>${escapeHtml(shortPath)}</h3>
        </div>
        <table class="cov-source">${sourceLines}</table>
      </div>`;
    })
    .join("\n");

  // ── Per-test-case list ─────────────────────────────────────
  const testRows = perTestFile
    .flatMap((tf) =>
      (tf.perTestCase ?? []).map((tc) => {
        const tcUsed = tc.rules.filter((r) => r.used).length;
        const tcTotal = tc.rules.length;
        const tcPct = tcTotal > 0 ? ((tcUsed / tcTotal) * 100).toFixed(1) : "0";
        const cls = parseFloat(tcPct) >= 80 ? "good" : parseFloat(tcPct) >= 60 ? "warn" : "bad";
        const pills = tc.rules
          .map(
            (r) =>
              `<span class="cov-pill ${r.used ? "covered" : "uncovered"}">${escapeHtml(r.selector)}</span>`,
          )
          .join(" ");
        return `<tr class="cov-test-row">
          <td class="cov-test-file">${escapeHtml(tf.testFile)}</td>
          <td class="cov-test-name">${escapeHtml(tc.testName)}</td>
          <td><div class="cov-bar"><div class="cov-bar-fill ${cls}" style="width:${tcPct}%"></div></div></td>
          <td class="cov-pct ${cls}">${tcPct}%</td>
        </tr>
        <tr class="cov-test-detail"><td colspan="4">${pills}</td></tr>`;
      }),
    )
    .join("\n");

  return `
    <div class="coverage-section" id="css-coverage">
      <h2>CSS Coverage <span class="score-badge ${parseFloat(pct) >= 80 ? "good" : parseFloat(pct) >= 60 ? "warn" : "bad"}">${pct}%</span></h2>
      <p style="color: var(--text-muted); margin-bottom: 1rem">${usedCount} of ${totalCount} CSS rules matched DOM elements (CDP CSS.startRuleUsageTracking)</p>

      <div class="cov-tabs">
        <button class="cov-tab active" onclick="showCovTab('files')">Files</button>
        <button class="cov-tab" onclick="showCovTab('tests')">Tests</button>
      </div>

      <div class="cov-panel" id="cov-files-panel">
        <div id="cov-file-list">
          <table class="cov-file-table">
            <thead><tr><th>File</th><th>Coverage</th><th></th><th>Selectors</th></tr></thead>
            <tbody>${fileRows}</tbody>
          </table>
        </div>
        ${fileViews}
      </div>

      <div class="cov-panel" id="cov-tests-panel" style="display:none">
        <table class="cov-test-table">
          <thead><tr><th>Test File</th><th>Test Case</th><th>Coverage</th><th></th></tr></thead>
          <tbody>${testRows}</tbody>
        </table>
      </div>
    </div>

    <script>
    function showCovTab(tab) {
      document.querySelectorAll('.cov-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.cov-panel').forEach(p => p.style.display = 'none');
      event.target.classList.add('active');
      document.getElementById('cov-' + tab + '-panel').style.display = '';
      if (tab === 'files') showFileList();
    }
    function showCssFile(fileId) {
      document.getElementById('cov-file-list').style.display = 'none';
      document.querySelectorAll('.cov-file-view').forEach(v => v.style.display = 'none');
      document.getElementById('cov-' + fileId).style.display = '';
    }
    function showFileList() {
      document.querySelectorAll('.cov-file-view').forEach(v => v.style.display = 'none');
      document.getElementById('cov-file-list').style.display = '';
    }
    </script>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
