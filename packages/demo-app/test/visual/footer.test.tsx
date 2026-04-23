import { expect, test, afterEach } from "vitest";
import { page } from "@vitest/browser/context";
import React from "react";
import { renderComponent } from "./setup.ts";
import { Footer } from "../../src/components/Footer.tsx";

let cleanup: (() => void) | undefined;

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
});

test("footer renders with brand and links", async () => {
  const result = renderComponent(React.createElement(Footer));
  cleanup = result.cleanup;

  await expect.element(page.getByText("CSSMutator")).toBeVisible();
  await expect.element(page.getByText("Product")).toBeVisible();
  await expect.element(page.getByText("Docs")).toBeVisible();
  await expect.element(page.getByText("Community")).toBeVisible();
});
