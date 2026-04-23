# API Reference

The `css-mutator` package exports everything you need to integrate CSS mutation testing into your workflow.

## Entry Points

| Import Path               | Description                                       |
| ------------------------- | ------------------------------------------------- |
| `css-mutator`             | Main package — types, mutators, parser, generator |
| `css-mutator/vite-plugin` | Vite plugin for CSS interception                  |

## Quick Reference

### Run mutation testing programmatically

```ts
import { runCssMutationTesting } from "css-mutator";

const summary = await runCssMutationTesting({
  files: ["src/**/*.module.css"],
  vitestConfig: "vitest.browser.config.ts",
  reporters: ["html", "json", "console"],
});

console.log(`Score: ${summary.totals.mutationScore}%`);
```

### Generate mutants without running tests

```ts
import { generateCssMutants } from "css-mutator";

const mutants = await generateCssMutants({
  files: ["src/**/*.css"],
  cwd: process.cwd(),
});

for (const m of mutants) {
  console.log(
    `${m.mutatorName}: ${m.selector} { ${m.property}: ${m.original} → ${m.replacement} }`,
  );
}
```

### Parse CSS and inspect declarations

```ts
import { parseCss, applyCssMutation } from "css-mutator";

const result = parseCss(".btn { color: red; }", "button.css");
for (const decl of result.declarations) {
  console.log(`${decl.selector} { ${decl.property}: ${decl.value} }`);
}

// Apply a mutation
const mutated = applyCssMutation(result.source, result.declarations[0].range, "blue");
// → '.btn { color: blue; }'
```

### Use individual mutators

```ts
import { ColorMutator, DisplayMutator } from "css-mutator";

const color = new ColorMutator();
console.log(color.mutate("color", "#ff0000")); // ['#00ffff', 'transparent']

const display = new DisplayMutator();
console.log(display.mutate("display", "flex")); // ['block', 'none']
```

## Sections

- [Mutator Operators](/api/mutators) — individual operator API
- [Vite Plugin](/api/vite-plugin) — plugin options and state management
- [Orchestrator](/api/orchestrator) — running mutation tests
- [Reporter](/api/reporter) — generating reports
- [Types](/api/types) — TypeScript type definitions
