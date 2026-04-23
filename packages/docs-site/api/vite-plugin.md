# Vite Plugin API

## `cssMutationVitePlugin(options)`

Creates a Vite plugin that intercepts CSS transform and applies mutations.

```ts
import { cssMutationVitePlugin } from "css-mutator/vite-plugin";
```

### Options

```ts
interface CssMutationVitePluginOptions {
  /** All CSS mutants for this run. */
  mutants: CssMutant[];
  /** State directory (default: .css-mutator-tmp). */
  stateDir?: string;
}
```

### Usage

```ts
import { defineConfig } from "vite";
import { cssMutationVitePlugin } from "css-mutator/vite-plugin";

export default defineConfig({
  plugins: [
    cssMutationVitePlugin({
      mutants: generatedMutants,
      stateDir: "/tmp/my-project/css-mutator",
    }),
  ],
});
```

## `setActiveMutant(id, stateDir?)`

Sets the active mutant ID for the Vite plugin to apply.

```ts
import { setActiveMutant } from "css-mutator/vite-plugin";

// Activate a mutation
setActiveMutant("css-42");

// Clear (serve original CSS)
setActiveMutant(null);

// Custom state directory
setActiveMutant("css-42", "/tmp/my-project/css-mutator");
```

### Parameters

| Parameter  | Type             | Description                             |
| ---------- | ---------------- | --------------------------------------- |
| `id`       | `string \| null` | Mutant ID to activate, or null to clear |
| `stateDir` | `string`         | Directory for state file (optional)     |
