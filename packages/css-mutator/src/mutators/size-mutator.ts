import { BaseCssMutator } from "./base-mutator.ts";

const SIZE_PATTERN = /^(-?\d+(?:\.\d+)?)(px|rem|em|vh|vw|vmin|vmax|%|ch|ex|cm|mm|in|pt|pc)$/;
const KEYWORD_SWAPS: Record<string, string[]> = {
  auto: ["0px", "100%"],
  "fit-content": ["auto", "0px"],
  "min-content": ["max-content", "0px"],
  "max-content": ["min-content", "0px"],
};

export class SizeMutator extends BaseCssMutator {
  readonly name = "SizeMutator";
  readonly description = "Mutates CSS size values (width, height, min/max dimensions)";
  readonly targetProperties = [
    "width",
    "height",
    "min-width",
    "min-height",
    "max-width",
    "max-height",
    "inline-size",
    "block-size",
    "min-inline-size",
    "min-block-size",
    "max-inline-size",
    "max-block-size",
  ];

  mutate(_property: string, value: string): string[] {
    const trimmed = value.trim().toLowerCase();

    // Keyword values
    if (KEYWORD_SWAPS[trimmed]) {
      return KEYWORD_SWAPS[trimmed];
    }

    // Numeric values
    const match = trimmed.match(SIZE_PATTERN);
    if (match) {
      const num = parseFloat(match[1]!);
      const unit = match[2]!;

      const results: string[] = [];

      // Always try zero
      if (num !== 0) {
        results.push(`0${unit}`);
      }

      // Double it
      if (num > 0) {
        results.push(`${num * 2}${unit}`);
      }

      // Halve it
      if (num > 1) {
        results.push(`${Math.round(num / 2)}${unit}`);
      }

      // Negative (if not already)
      if (num > 0) {
        results.push(`-${num}${unit}`);
      }

      return results;
    }

    return [];
  }
}
