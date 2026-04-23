# Vitest Browser Mode

CSS mutation testing works best with **Vitest browser mode**, which renders components in a real browser where CSS is actually applied and visible.

## Why Browser Mode?

Unit tests with jsdom don't render CSS. They can check class names, but not whether `display: flex` actually creates a flex layout or `background-color: #4f46e5` is the right shade of indigo. Browser mode runs tests in Chromium (via Playwright), so your components render with real CSS — and screenshots capture exactly what the user would see.

## Setup

```bash
npm install -D vitest @vitest/browser playwright vitest-browser-react
npx playwright install chromium
```

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["test/**/*.test.tsx"],
    browser: {
      enabled: true,
      provider: "playwright",
      instances: [{ browser: "chromium" }],
      commands: {
        async screenshotElement(ctx, testId) {
          const el = ctx.iframe.locator(`[data-testid="${testId}"]`);
          const buffer = await el.screenshot();
          return buffer.toString("base64");
        },
      },
    },
  },
});
```

## Writing Screenshot Tests

Render individual components and compare screenshots against stored baselines:

```tsx
import { test, expect } from "vitest";
import { render } from "vitest-browser-react";
import { commands } from "@vitest/browser/context";
import { Button } from "../src/components/Button";

test("primary button screenshot", async () => {
  render(
    <div data-testid="primary-btn" style={{ width: 200, padding: 8 }}>
      <Button variant="primary">Subscribe</Button>
    </div>,
  );
  const screenshot = await commands.screenshotElement("primary-btn");
  expect(screenshot).toMatchSnapshot();
});
```

On the first run, vitest creates the baseline snapshot. On subsequent runs, it compares — if any CSS property changes (color, padding, font, border, layout), the screenshot changes and the test fails.

## What This Catches

Any CSS mutation that changes the component's visual appearance:

- `display: inline-flex → none` — element disappears
- `background-color: #4f46e5 → transparent` — color changes
- `padding: 10px 20px → 0` — element shrinks
- `border-radius: 8px → 0` — corners change from round to sharp
- `font-weight: 600 → 300` — text becomes lighter

## What This Doesn't Catch

**`:hover`, `:focus`, `:active` states** — these require interaction before the screenshot:

```tsx
test("button hover state", async () => {
  const { getByRole } = render(
    <div data-testid="hover-btn" style={{ width: 200, padding: 8 }}>
      <Button variant="primary">Hover me</Button>
    </div>,
  );
  await getByRole("button", { name: "Hover me" }).hover();
  const screenshot = await commands.screenshotElement("hover-btn");
  expect(screenshot).toMatchSnapshot();
});
```

Without a hover screenshot, mutations to `:hover` styles survive — and the mutation report makes this gap visible.

## Tips

1. **Test components, not pages** — screenshot one component at a time. Faster, more focused, diffs are clearer.
2. **Use a fixed-width wrapper** — wrap the component in a `<div>` with an inline fixed width to ensure deterministic layout across runs.
3. **Update baselines after intentional changes** — `npx vitest run --update` regenerates all snapshots.
4. **Add interaction screenshots** for hover/focus/active states you care about.
