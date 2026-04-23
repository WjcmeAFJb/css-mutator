# Examples

Practical examples of CSS mutation testing in different scenarios.

## Basic: Button Component

### CSS Module

```css
/* button.module.css */
.button {
  display: inline-flex;
  align-items: center;
  padding: 12px 24px;
  background-color: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.button:hover {
  background-color: #5a6fd6;
}
```

### Screenshot Test

```tsx
import { test, expect } from "vitest";
import { render } from "vitest-browser-react";
import { commands } from "@vitest/browser/context";
import { Button } from "../src/Button";

test("button screenshot", async () => {
  render(
    <div data-testid="button" style={{ width: 200, padding: 8 }}>
      <Button>Click me</Button>
    </div>,
  );
  // Captures every visual property: color, padding, font, border, layout
  const screenshot = await commands.screenshotElement("button");
  expect(screenshot).toMatchSnapshot();
});
```

### Running Mutation Tests

```bash
npx css-mutate --files "src/button.module.css" --vitest-config vitest.browser.config.ts
```

### Expected Output

```
🧬 CSS Mutation Testing
==================================================

📋 Scanning CSS files for mutations...
   Found 22 potential mutations in 1 file(s)

🧪 Running baseline tests (no mutations)...
   ✅ Baseline tests pass

🔬 Testing 22 mutants...

   [1/22] ColorMutator: .button { background-color: #667eea → #9981ff }... ✅ KILLED
   [2/22] ColorMutator: .button { background-color: #667eea → transparent }... ✅ KILLED
   [3/22] ColorMutator: .button { color: white → black }... ✅ KILLED
   [4/22] DisplayMutator: .button { display: inline-flex → block }... ✅ KILLED
   [5/22] SpacingMutator: .button { padding: 12px 24px → 0 }... ✅ KILLED
   ...

============================================================
  CSS Mutation Testing Results
============================================================
  Total mutants:    22
  Killed:           22 ✅
  Survived:         0  ❌
  Mutation Score:   100.00%
============================================================
```

## Catching a Z-Index Bug

### The CSS (with bug)

```css
/* modal.module.css */
.navbar {
  z-index: 10;
  position: sticky;
  top: 0;
}
.overlay {
  z-index: 10;
  position: fixed; /* BUG: same as navbar! */
}
```

### The Test That Catches It

```ts
test('modal overlay has higher z-index than navbar', async () => {
  const screen = render(<Page showModal={true} />);

  const overlay = screen.getByTestId('overlay').element() as HTMLElement;
  const navbar = screen.getByRole('navigation').element() as HTMLElement;

  const overlayZ = parseInt(window.getComputedStyle(overlay).zIndex);
  const navbarZ = parseInt(window.getComputedStyle(navbar).zIndex);

  // This test fails because both have z-index: 10
  expect(overlayZ).toBeGreaterThan(navbarZ);
});
```

### What Mutation Testing Reveals

The `ZIndexMutator` generates:

- `z-index: 10` → `-1` (Killed by z-index comparison test)
- `z-index: 10` → `0` (Killed)
- `z-index: 10` → `9999` (**Survived** — reveals the test doesn't check upper bound)

## Catching an Opacity Bug

### The CSS (with bug)

```css
.subtitle {
  opacity: 0.4; /* BUG: too low, text nearly invisible */
}
```

### The Test

```ts
test("subtitle text has sufficient opacity", async () => {
  const el = screen.getByText(/subtitle/);
  const opacity = parseFloat(window.getComputedStyle(el.element()).opacity);
  expect(opacity).toBeGreaterThanOrEqual(0.7);
});
```

This test catches the bug directly — opacity 0.4 fails the `>= 0.7` assertion.

## CI Integration

```yaml
# .github/workflows/css-mutation.yml
name: CSS Mutation Testing

on: [push, pull_request]

jobs:
  css-mutations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
      - run: npx playwright install chromium

      - run: npx css-mutate --files "src/**/*.module.css" --reporters json,console
        env:
          CI: true

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: css-mutation-report
          path: reports/css-mutation/
```
