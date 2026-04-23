# Vite Plugin

The CSS Mutator Vite plugin intercepts CSS file loading during test runs and
applies mutations in-memory.

::: info
The Vite plugin is used by **process mode** (`--no-server-mode`). In the
default **server mode**, the orchestrator writes mutations directly to disk
and pushes them to the browser via HMR — no plugin needed. See
[How It Works](./how-it-works) for the full story.
:::

## Setup

Add the plugin to your `vitest.browser.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import { cssMutationVitePlugin } from "css-mutator/vite-plugin";

export default defineConfig({
  plugins: [
    cssMutationVitePlugin({
      mutants: [], // Populated at runtime by the orchestrator
    }),
  ],
  test: {
    browser: {
      enabled: true,
      provider: "playwright",
      instances: [{ browser: "chromium" }],
    },
  },
});
```

::: tip
When using the CLI (`css-mutate`), the Vite plugin is automatically configured. You only need to set it up manually for custom integrations.
:::

## How It Works

1. The orchestrator generates all CSS mutants and passes them to the plugin
2. Before each test run, the orchestrator writes the active mutant ID to a state file
3. When Vite processes a CSS file, the plugin checks for an active mutant
4. If the file matches, the plugin applies the mutation to the CSS in-memory
5. The mutated CSS is served to the browser

```
Orchestrator  ──writes──▶  .css-mutator-tmp/active-mutant.json
                                        │
Vite Plugin   ──reads───────────────────┘
     │
     ▼
CSS transform: original CSS → mutated CSS (if active mutant matches)
```

## Options

```ts
interface CssMutationVitePluginOptions {
  /** All CSS mutants generated for this run. */
  mutants: CssMutant[];
  /** Directory for state files (default: .css-mutator-tmp). */
  stateDir?: string;
}
```

## State Management

The plugin uses file-based state to communicate between the orchestrator process and the Vite dev server:

```ts
import { setActiveMutant } from "css-mutator/vite-plugin";

// Activate a specific mutant
setActiveMutant("css-42");

// Deactivate (serve original CSS)
setActiveMutant(null);
```

## Compatibility

The Vite plugin works with:

- CSS files (`.css`)
- CSS Modules (`.module.css`)
- PostCSS-processed files
- Any CSS that Vite processes through its transform pipeline

It does **not** intercept:

- CSS-in-JS (styled-components, emotion) — these are JavaScript, not CSS files
- Inline styles in JSX
- External stylesheets loaded via `<link>` tags
