import { BaseCssMutator } from "./base-mutator.ts";

const VISIBILITY_SWAPS: Record<string, string[]> = {
  visible: ["hidden"],
  hidden: ["visible"],
  collapse: ["visible"],
};

const OVERFLOW_SWAPS: Record<string, string[]> = {
  visible: ["hidden", "scroll"],
  hidden: ["visible"],
  scroll: ["hidden", "visible"],
  auto: ["hidden", "visible"],
  clip: ["visible"],
};

const POINTER_SWAPS: Record<string, string[]> = {
  auto: ["none"],
  none: ["auto"],
};

export class VisibilityMutator extends BaseCssMutator {
  readonly name = "VisibilityMutator";
  readonly description = "Mutates CSS visibility, overflow, and pointer-events";
  readonly targetProperties = [
    "visibility",
    "overflow",
    "overflow-x",
    "overflow-y",
    "pointer-events",
    "clip-path",
    "backface-visibility",
  ];

  mutate(property: string, value: string): string[] {
    const trimmed = value.trim().toLowerCase();

    switch (property) {
      case "visibility":
      case "backface-visibility":
        return VISIBILITY_SWAPS[trimmed] ?? [];

      case "overflow":
      case "overflow-x":
      case "overflow-y":
        return OVERFLOW_SWAPS[trimmed] ?? [];

      case "pointer-events":
        return POINTER_SWAPS[trimmed] ?? [];

      case "clip-path":
        if (trimmed === "none") return ["circle(0%)"];
        return ["none"];

      default:
        return [];
    }
  }
}
