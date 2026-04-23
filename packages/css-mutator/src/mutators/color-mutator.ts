import { BaseCssMutator } from "./base-mutator.ts";

const NAMED_COLOR_SWAPS: Record<string, string[]> = {
  red: ["blue", "transparent"],
  blue: ["red", "transparent"],
  green: ["red", "transparent"],
  black: ["white", "transparent"],
  white: ["black", "transparent"],
  yellow: ["blue", "transparent"],
  orange: ["blue", "transparent"],
  purple: ["green", "transparent"],
  pink: ["green", "transparent"],
  gray: ["black", "white"],
  grey: ["black", "white"],
  transparent: ["black"],
  inherit: ["transparent"],
  currentColor: ["transparent"],
  currentcolor: ["transparent"],
};

const HEX_PATTERN = /^#([0-9a-fA-F]{3,8})$/;
const RGB_PATTERN = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/;
const HSL_PATTERN = /^hsla?\(\s*(\d+)/;

export class ColorMutator extends BaseCssMutator {
  readonly name = "ColorMutator";
  readonly description = "Mutates CSS color values (named colors, hex, rgb, hsl)";
  readonly targetProperties = [
    "color",
    "background-color",
    "background",
    "border-color",
    "border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color",
    "outline-color",
    "text-decoration-color",
    "fill",
    "stroke",
    "box-shadow",
    "text-shadow",
    "caret-color",
    "column-rule-color",
    "accent-color",
  ];

  mutate(property: string, value: string): string[] {
    const results: string[] = [];

    // Check for named colors
    const lowerValue = value.toLowerCase().trim();
    for (const [color, swaps] of Object.entries(NAMED_COLOR_SWAPS)) {
      if (lowerValue === color) {
        results.push(...swaps);
        return results;
      }
    }

    // Hex colors
    const hexMatch = value.match(HEX_PATTERN);
    if (hexMatch) {
      results.push(invertHex(value));
      results.push("transparent");
      return results;
    }

    // RGB/RGBA
    const rgbMatch = value.match(RGB_PATTERN);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]!, 10);
      const g = parseInt(rgbMatch[2]!, 10);
      const b = parseInt(rgbMatch[3]!, 10);
      // Invert the color
      results.push(value.replace(RGB_PATTERN, `rgba(${255 - r}, ${255 - g}, ${255 - b}`));
      results.push("transparent");
      return results;
    }

    // HSL/HSLA — shift hue by 180 degrees
    const hslMatch = value.match(HSL_PATTERN);
    if (hslMatch) {
      const hue = parseInt(hslMatch[1]!, 10);
      const newHue = (hue + 180) % 360;
      results.push(value.replace(HSL_PATTERN, `hsla(${newHue}`));
      return results;
    }

    // For background shorthand with colors mixed with other values
    if (property === "background" || property === "box-shadow" || property === "text-shadow") {
      // Use non-anchored pattern to find hex within compound values
      const hexInCompound = /#[0-9a-fA-F]{3,8}/;
      const withTransparent = value.replace(hexInCompound, "transparent");
      if (withTransparent !== value) {
        results.push(withTransparent);
      }
    }

    return results;
  }
}

function invertHex(hex: string): string {
  const clean = hex.replace("#", "");
  let r: number, g: number, b: number;

  if (clean.length === 3) {
    r = parseInt(clean[0]! + clean[0]!, 16);
    g = parseInt(clean[1]! + clean[1]!, 16);
    b = parseInt(clean[2]! + clean[2]!, 16);
  } else {
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
  }

  const invR = (255 - r).toString(16).padStart(2, "0");
  const invG = (255 - g).toString(16).padStart(2, "0");
  const invB = (255 - b).toString(16).padStart(2, "0");

  return `#${invR}${invG}${invB}`;
}
