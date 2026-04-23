# Mutator Operators API

All mutator operators implement the `CssMutatorOperator` interface.

## CssMutatorOperator Interface

```ts
interface CssMutatorOperator {
  /** Unique name for this mutator. */
  readonly name: string;
  /** Human-readable description. */
  readonly description: string;
  /** CSS properties this mutator handles. */
  readonly targetProperties: string[];
  /**
   * Given a property and value, return replacement values.
   * Returns empty array if no mutations apply.
   */
  mutate(property: string, value: string): string[];
}
```

## Factory Functions

### `createAllMutators()`

Returns all 12 built-in mutator instances:

```ts
import { createAllMutators } from "css-mutator";
const mutators = createAllMutators();
// [ColorMutator, DisplayMutator, SizeMutator, ...]
```

### `getMutatorByName(name: string)`

Get a specific mutator by name:

```ts
import { getMutatorByName } from "css-mutator";
const color = getMutatorByName("ColorMutator");
```

### `getMutatorNames()`

List all available mutator names:

```ts
import { getMutatorNames } from "css-mutator";
console.log(getMutatorNames());
// ['ColorMutator', 'DisplayMutator', 'SizeMutator', ...]
```

## Creating Custom Mutators

Extend the `BaseCssMutator` class:

```ts
import { BaseCssMutator } from "css-mutator";

class CursorMutator extends BaseCssMutator {
  readonly name = "CursorMutator";
  readonly description = "Mutates cursor property";
  readonly targetProperties = ["cursor"];

  mutate(property: string, value: string): string[] {
    if (value === "pointer") return ["default", "not-allowed"];
    if (value === "default") return ["pointer"];
    return [];
  }
}
```

The `BaseCssMutator` provides a `handles(property)` method that checks against `targetProperties`, supporting wildcards (e.g., `border-*-color`).
