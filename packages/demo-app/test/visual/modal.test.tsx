import { expect, test, afterEach } from "vitest";
import { page } from "@vitest/browser/context";
import React from "react";
import { renderComponent } from "./setup.ts";
import { Modal } from "../../src/components/Modal.tsx";

let cleanup: (() => void) | undefined;

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
});

test("modal renders with dialog content and actions", async () => {
  const result = renderComponent(React.createElement(Modal, { onClose: () => {} }));
  cleanup = result.cleanup;

  await expect.element(page.getByText("Get Started")).toBeVisible();
  await expect.element(page.getByText("Install Now")).toBeVisible();
  await expect.element(page.getByText("Cancel")).toBeVisible();
});
