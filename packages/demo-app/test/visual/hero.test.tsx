import { expect, test, afterEach } from "vitest";
import { page } from "@vitest/browser/context";
import React from "react";
import { renderComponent } from "./setup.ts";
import { HeroSection } from "../../src/components/HeroSection.tsx";

let cleanup: (() => void) | undefined;

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
});

test("hero section renders with title and CTA", async () => {
  const result = renderComponent(React.createElement(HeroSection, { onAction: () => {} }));
  cleanup = result.cleanup;

  await expect.element(page.getByText("CSS Mutation Testing")).toBeVisible();
  await expect.element(page.getByText("Get Started")).toBeVisible();
  // The subtitle with opacity: 0.4 bug — visual diff would catch faded text
  await expect.element(page.getByText(/Find untested visual styles/)).toBeVisible();
});
