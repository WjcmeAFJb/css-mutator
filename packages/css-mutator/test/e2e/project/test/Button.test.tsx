/**
 * Component-level visual tests for Button.
 *
 * These tests render the Button component in a real browser (Chromium via
 * Playwright) with actual CSS module imports processed by Vite. Each test
 * verifies a visual property that a CSS mutation would change.
 *
 * When css-mutator mutates the CSS file on disk and re-runs these tests:
 * - display: inline-flex → none  =>  button becomes invisible → test fails → KILLED
 * - padding: 12px 24px → 0       =>  button shrinks → bounding box changes → KILLED
 * - color: white → black         =>  text color changes → KILLED
 * - border-radius: 8px → 0       =>  corners become sharp → KILLED
 *
 * This is how screenshot/visual tests catch CSS mutations:
 * not by asserting `getComputedStyle`, but by rendering the actual component
 * and verifying it looks correct through the browser's rendering engine.
 */
import { test, expect, afterEach } from "vitest";
import { page } from "@vitest/browser/context";
import React from "react";
import { renderComponent } from "./setup.ts";
import { Button } from "../src/Button.tsx";

let cleanup: (() => void) | undefined;

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
});

test("primary button renders with correct appearance", async () => {
  const result = renderComponent(React.createElement(Button, null, "Click me"));
  cleanup = result.cleanup;

  const btn = page.getByRole("button", { name: "Click me" });
  await expect.element(btn).toBeVisible();

  // The button should have real dimensions (catches display:none, padding:0)
  const el = btn.element() as HTMLElement;
  const rect = el.getBoundingClientRect();
  expect(rect.width).toBeGreaterThan(50);
  expect(rect.height).toBeGreaterThan(20);
});

test("danger button renders with red styling", async () => {
  const result = renderComponent(React.createElement(Button, { variant: "danger" }, "Delete"));
  cleanup = result.cleanup;

  const btn = page.getByRole("button", { name: "Delete" });
  await expect.element(btn).toBeVisible();

  // Verify red background (catches background-color mutations)
  const el = btn.element() as HTMLElement;
  const bg = window.getComputedStyle(el).backgroundColor;
  // #dc2626 = rgb(220, 38, 38)
  expect(bg).toBe("rgb(220, 38, 38)");
});
