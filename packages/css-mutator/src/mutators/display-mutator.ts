import { BaseCssMutator } from "./base-mutator.ts";

const DISPLAY_SWAPS: Record<string, string[]> = {
  block: ["none", "inline"],
  inline: ["block", "none"],
  "inline-block": ["block", "none"],
  flex: ["block", "none"],
  "inline-flex": ["flex", "none"],
  grid: ["block", "none"],
  "inline-grid": ["grid", "none"],
  none: ["block"],
  table: ["block", "none"],
  "table-row": ["block", "none"],
  "table-cell": ["block", "none"],
  contents: ["none", "block"],
  "list-item": ["block", "none"],
};

export class DisplayMutator extends BaseCssMutator {
  readonly name = "DisplayMutator";
  readonly description = "Mutates CSS display property values";
  readonly targetProperties = ["display"];

  mutate(_property: string, value: string): string[] {
    const trimmed = value.trim().toLowerCase();
    return DISPLAY_SWAPS[trimmed] ?? [];
  }
}
