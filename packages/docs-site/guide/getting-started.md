# Getting Started

## Prerequisites

- Node.js 20+
- A Vite project with CSS files
- Vitest with browser mode configured (for visual regression testing)

## Installation

Install directly from a GitHub release tarball (no npm registry needed):

```bash
pnpm add https://github.com/WjcmeAFJb/css-mutator/releases/download/v0.1.0/css-mutator-0.1.0.tgz
# or npm install ..., or yarn add ...
```

Pick the version you want from the
[Releases page](https://github.com/WjcmeAFJb/css-mutator/releases) — each
release lists the exact install command for that tarball.

## Quick Start

### 1. Run a Dry Run

See what mutations would be generated without running tests:

```bash
npx css-mutate --dry-run --files "src/**/*.css"
```

### 2. Configure Vitest Browser Mode

If you don't already have visual tests, set up Vitest browser mode:

```bash
npm install -D @vitest/browser playwright
npx playwright install chromium
```

Create `vitest.browser.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/visual/**/*.test.{ts,tsx}"],
    browser: {
      enabled: true,
      provider: "playwright",
      instances: [{ browser: "chromium" }],
    },
  },
});
```

### 3. Write Screenshot Tests

Render individual components and compare screenshots against baselines:

```tsx
import { test, expect } from "vitest";
import { render } from "vitest-browser-react";
import { commands } from "@vitest/browser/context";
import { Button } from "../src/components/Button";

test("button screenshot", async () => {
  render(
    <div data-testid="button" style={{ width: 200, padding: 8 }}>
      <Button>Click me</Button>
    </div>,
  );
  const screenshot = await commands.screenshotElement("button");
  expect(screenshot).toMatchSnapshot();
});
```

### 4. Run CSS Mutation Testing

```bash
npx css-mutate \
  --files "src/**/*.module.css" \
  --vitest-config vitest.browser.config.ts
```

### 5. Review the Report

Open `reports/css-mutation/index.html` to see:

- Overall mutation score
- Per-file mutation coverage (shown on your CSS source)
- Surviving mutants that need additional tests

## Next Steps

- [CLI Options](/guide/cli) — full list of command-line flags
- [Mutation Operators](/guide/mutators) — understand what gets mutated
- [Writing Visual Tests](/guide/writing-tests) — patterns for effective visual tests
