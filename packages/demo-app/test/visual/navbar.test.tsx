import { expect, test, afterEach } from "vitest";
import { page } from "@vitest/browser/context";
import React from "react";
import { renderComponent } from "./setup.ts";
import { Navbar } from "../../src/components/Navbar.tsx";

let cleanup: (() => void) | undefined;

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
});

test("navbar renders with all navigation elements", async () => {
  const result = renderComponent(React.createElement(Navbar));
  cleanup = result.cleanup;

  // Verify all elements are present and visible
  await expect.element(page.getByText("CSSMutator")).toBeVisible();
  await expect.element(page.getByText("Features")).toBeVisible();
  await expect.element(page.getByText("Pricing")).toBeVisible();
  await expect.element(page.getByText("Docs")).toBeVisible();
});
