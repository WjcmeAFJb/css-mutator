import type { CssMutatorOperator } from "../types.ts";

/**
 * Base class for CSS mutator operators.
 * Provides common functionality and a consistent interface.
 */
export abstract class BaseCssMutator implements CssMutatorOperator {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly targetProperties: string[];

  abstract mutate(property: string, value: string): string[];

  /**
   * Check if this mutator handles the given property.
   */
  handles(property: string): boolean {
    return this.targetProperties.includes(property);
  }
}
