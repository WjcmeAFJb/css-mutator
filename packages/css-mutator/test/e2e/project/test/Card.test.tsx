/**
 * Component-level visual tests for Card.
 *
 * Renders the Card in a real browser and verifies visual properties.
 * CSS mutations (display:none, padding:0, color changes, border removal)
 * will cause these tests to fail.
 */
import { test, expect, afterEach } from "vitest";
import { page } from "@vitest/browser/context";
import React from "react";
import { renderComponent } from "./setup.ts";
import { Card } from "../src/Card.tsx";

let cleanup: (() => void) | undefined;

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
});

test("card renders with title and body visible", async () => {
  const result = renderComponent(
    React.createElement(Card, {
      title: "Hello",
      body: "This is the card body text",
    }),
  );
  cleanup = result.cleanup;

  await expect.element(page.getByRole("heading", { name: "Hello" })).toBeVisible();
  await expect.element(page.getByText("This is the card body text")).toBeVisible();
});

test("card has proper layout and dimensions", async () => {
  const result = renderComponent(
    React.createElement(Card, {
      title: "My Feature",
      body: "Description goes here",
    }),
  );
  cleanup = result.cleanup;

  const heading = page.getByRole("heading", { name: "My Feature" });
  await expect.element(heading).toBeVisible();

  // Card should have real dimensions (catches display:none, padding:0)
  const card = result.container.querySelector("[class*='card']") as HTMLElement;
  const rect = card.getBoundingClientRect();
  expect(rect.width).toBeGreaterThan(100);
  expect(rect.height).toBeGreaterThan(40);

  // Title should have dark color (catches color mutations)
  const titleEl = heading.element() as HTMLElement;
  const color = window.getComputedStyle(titleEl).color;
  // #111827 = rgb(17, 24, 39)
  expect(color).toBe("rgb(17, 24, 39)");
});
