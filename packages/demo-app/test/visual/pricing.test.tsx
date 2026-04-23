import { expect, test, afterEach } from "vitest";
import { page } from "@vitest/browser/context";
import React from "react";
import { renderComponent } from "./setup.ts";
import { PricingTable } from "../../src/components/PricingTable.tsx";

let cleanup: (() => void) | undefined;

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
});

test("pricing table renders all three plans", async () => {
  const result = renderComponent(React.createElement(PricingTable));
  cleanup = result.cleanup;

  await expect.element(page.getByText("Starter")).toBeVisible();
  await expect.element(page.getByText("Pro")).toBeVisible();
  await expect.element(page.getByText("Enterprise")).toBeVisible();
  await expect.element(page.getByText("Most Popular")).toBeVisible();
  await expect.element(page.getByText("Free")).toBeVisible();
});
