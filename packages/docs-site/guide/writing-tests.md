# Writing Screenshot Tests

This guide covers how to write screenshot tests that effectively catch CSS mutations.

## The Approach

Render individual components in a real browser, take Playwright screenshots, and compare against stored baselines. When the CSS mutator changes a property on disk, the component renders differently, the screenshot changes, and the test fails.

This is the same workflow as visual regression testing — but instead of catching accidental regressions, you're verifying that your tests _would_ catch them.

## Setup: Screenshot Command

Define a custom vitest browser command that takes Playwright screenshots:

```ts
// vitest.config.ts
browser: {
  commands: {
    async screenshotElement(ctx, testId) {
      const el = ctx.iframe.locator(`[data-testid="${testId}"]`);
      const buffer = await el.screenshot();
      return buffer.toString("base64");
    },
  },
}
```

## Pattern: Component Screenshot

```tsx
import { test, expect } from "vitest";
import { render } from "vitest-browser-react";
import { commands } from "@vitest/browser/context";
import { Card } from "../src/components/Card";

test("card screenshot", async () => {
  render(
    <div data-testid="card" style={{ width: 280, padding: 8 }}>
      <Card title="Pro" price="$19" featured={false}>
        <p>All features included</p>
      </Card>
    </div>,
  );
  const screenshot = await commands.screenshotElement("card");
  expect(screenshot).toMatchSnapshot();
});
```

A single screenshot captures every visual property: colors, fonts, spacing, borders, layout, shadows. Any CSS mutation that changes the rendering will produce a different screenshot.

## Pattern: Variant Screenshots

Test each visual variant of a component:

```tsx
test("primary button", async () => {
  render(
    <div data-testid="primary" style={{ width: 200, padding: 8 }}>
      <Button variant="primary">Subscribe</Button>
    </div>,
  );
  expect(await commands.screenshotElement("primary")).toMatchSnapshot();
});

test("secondary button", async () => {
  render(
    <div data-testid="secondary" style={{ width: 200, padding: 8 }}>
      <Button variant="secondary">Cancel</Button>
    </div>,
  );
  expect(await commands.screenshotElement("secondary")).toMatchSnapshot();
});
```

## Pattern: Interaction Screenshots

For hover, focus, and active states — interact first, then screenshot:

```tsx
test("button hover state", async () => {
  const { getByRole } = render(
    <div data-testid="hover" style={{ width: 200, padding: 8 }}>
      <Button variant="primary">Hover me</Button>
    </div>,
  );
  await getByRole("button").hover();
  expect(await commands.screenshotElement("hover")).toMatchSnapshot();
});
```

Without interaction screenshots, mutations to `:hover`, `:focus`, and `:active` styles will survive. The mutation report makes this gap visible — add interaction tests where the gap matters.

## Pattern: Responsive Variants

Test at different widths to catch breakpoint-related mutations:

```tsx
test("card at mobile width", async () => {
  render(
    <div data-testid="mobile-card" style={{ width: 320, padding: 8 }}>
      <Card title="Pro" price="$19" featured={false}>
        <p>Content</p>
      </Card>
    </div>,
  );
  expect(await commands.screenshotElement("mobile-card")).toMatchSnapshot();
});
```

## Tips

- **One component per screenshot** — faster, focused, diffs are easy to read
- **Fixed-width wrappers** — a wrapping `<div>` with a fixed width ensures deterministic layout
- **Don't screenshot full pages** — screenshot the component, not the whole viewport
- **Update baselines** — `npx vitest run --update` after intentional CSS changes
- **Name tests clearly** — the snapshot file uses the test name, so make it descriptive
