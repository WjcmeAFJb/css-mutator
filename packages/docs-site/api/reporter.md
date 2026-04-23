# Reporter API

## `generateHtmlReport(summary, outputPath)`

Generates an HTML report with annotated CSS source files.

```ts
import { generateHtmlReport } from "css-mutator";

await generateHtmlReport(summary, "reports/css-mutation/index.html");
```

The HTML report features:

- Dark theme with syntax-highlighted CSS
- Per-line mutation gutter (green/red/yellow)
- Hover tooltips with mutation details
- Mutation detail table per file
- Summary cards with totals

## `generateJsonReport(summary, outputPath)`

Generates a JSON report compatible with mutation-testing-report-schema v2.

```ts
import { generateJsonReport } from "css-mutator";

generateJsonReport(summary, "reports/css-mutation/mutation-report.json");
```

The JSON follows the standard schema:

```json
{
  "$schema": "https://git.io/mutation-testing-schema",
  "schemaVersion": "2",
  "files": { ... }
}
```

## `printConsoleReport(summary)`

Prints a formatted summary to stdout.

```ts
import { printConsoleReport } from "css-mutator";

printConsoleReport(summary);
```

Output includes:

- Overall mutation score
- Killed/survived/timeout counts
- Per-file breakdown
- Surviving mutants with line numbers and descriptions
