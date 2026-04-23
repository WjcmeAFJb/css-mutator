export { BaseCssMutator } from "./base-mutator.ts";
export { ColorMutator } from "./color-mutator.ts";
export { DisplayMutator } from "./display-mutator.ts";
export { SizeMutator } from "./size-mutator.ts";
export { PositionMutator } from "./position-mutator.ts";
export { OpacityMutator } from "./opacity-mutator.ts";
export { ZIndexMutator } from "./z-index-mutator.ts";
export { BorderMutator } from "./border-mutator.ts";
export { FontMutator } from "./font-mutator.ts";
export { SpacingMutator } from "./spacing-mutator.ts";
export { VisibilityMutator } from "./visibility-mutator.ts";
export { FlexMutator } from "./flex-mutator.ts";
export { GridMutator } from "./grid-mutator.ts";

import type { CssMutatorOperator } from "../types.ts";
import { ColorMutator } from "./color-mutator.ts";
import { DisplayMutator } from "./display-mutator.ts";
import { SizeMutator } from "./size-mutator.ts";
import { PositionMutator } from "./position-mutator.ts";
import { OpacityMutator } from "./opacity-mutator.ts";
import { ZIndexMutator } from "./z-index-mutator.ts";
import { BorderMutator } from "./border-mutator.ts";
import { FontMutator } from "./font-mutator.ts";
import { SpacingMutator } from "./spacing-mutator.ts";
import { VisibilityMutator } from "./visibility-mutator.ts";
import { FlexMutator } from "./flex-mutator.ts";
import { GridMutator } from "./grid-mutator.ts";

/**
 * Create all built-in CSS mutator operators.
 */
export function createAllMutators(): CssMutatorOperator[] {
  return [
    new ColorMutator(),
    new DisplayMutator(),
    new SizeMutator(),
    new PositionMutator(),
    new OpacityMutator(),
    new ZIndexMutator(),
    new BorderMutator(),
    new FontMutator(),
    new SpacingMutator(),
    new VisibilityMutator(),
    new FlexMutator(),
    new GridMutator(),
  ];
}

/**
 * Get a mutator by name.
 */
export function getMutatorByName(name: string): CssMutatorOperator | undefined {
  return createAllMutators().find((m) => m.name === name);
}

/**
 * Get mutator names.
 */
export function getMutatorNames(): string[] {
  return createAllMutators().map((m) => m.name);
}
