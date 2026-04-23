import { expect, test, afterEach } from "vitest";
import { page } from "@vitest/browser/context";
import React from "react";
import { renderComponent } from "./setup.ts";
import { CardGrid } from "../../src/components/CardGrid.tsx";

let cleanup: (() => void) | undefined;

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
});

test("card grid renders all 6 feature cards", async () => {
  const result = renderComponent(React.createElement(CardGrid));
  cleanup = result.cleanup;

  await expect.element(page.getByText("12 Mutation Operators")).toBeVisible();
  await expect.element(page.getByText("Screenshot Testing")).toBeVisible();
  await expect.element(page.getByText("Vite Integration")).toBeVisible();
  await expect.element(page.getByText("Coverage Reports")).toBeVisible();
  await expect.element(page.getByText("Incremental Cache")).toBeVisible();
  await expect.element(page.getByText("CLI & Programmatic")).toBeVisible();
});
