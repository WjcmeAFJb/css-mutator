# CSS Coverage Model

CSS Mutator provides a coverage model that shows which CSS rules are tested at the property level, similar to line coverage for JavaScript.

## What Is CSS Coverage?

Traditional CSS coverage (like what Chrome DevTools shows) tells you which rules are **applied** — i.e., which selectors match elements in the DOM. But "applied" doesn't mean "tested."

CSS mutation coverage answers a different question: **if this property changed, would a test notice?**

```css
/* Applied: ✅  Tested (mutation killed): ❌ */
.overlay {
  z-index: 10; /* No test checks this value */
}
```

## Coverage Levels

### Property-Level Coverage

Each CSS declaration is either covered or not:

- **Covered**: At least one mutation of this property was killed by a test
- **Uncovered**: All mutations of this property survived

### Selector-Level Coverage

A selector's coverage is the percentage of its covered properties:

```css
.card {
  display: flex; /* ✅ Covered — DisplayMutator killed */
  background: white; /* ✅ Covered — ColorMutator killed */
  border: 1px solid #eee; /* ❌ Uncovered — survived */
  padding: 16px; /* ✅ Covered — SpacingMutator killed */
}
/* Selector coverage: 75% (3/4 properties) */
```

### File-Level Coverage

A file's coverage is the percentage of killed mutants:

```
Mutation Score = Killed / Total × 100%
```

## Reading the HTML Report

The HTML report annotates your CSS source with coverage markers:

### Gutter Colors

| Color  | Meaning                                    |
| ------ | ------------------------------------------ |
| Green  | All mutants on this line were killed       |
| Red    | At least one mutant on this line survived  |
| Yellow | Mixed results (some killed, some survived) |
| (none) | No mutants generated for this line         |

### Gutter Numbers

The number in the gutter shows how many mutants exist on that line. Hover for details.

### Mutation Table

Below each file's source, a detailed table shows:

- **Status**: Killed/Survived/Timeout with icon
- **Line**: Source line number
- **Mutator**: Which operator generated it
- **Selector**: The CSS selector context
- **Change**: Original → replacement value
- **Time**: How long the test run took

## Interpreting Results

### High Score (>80%)

Your visual tests are thorough. Most CSS changes are detected. Focus on the few surviving mutants.

### Medium Score (60-80%)

Decent coverage but gaps exist. Look for patterns in surviving mutants:

- All spacing mutations surviving? Add padding/margin assertions.
- Color mutations surviving? Add color contrast checks.

### Low Score (<60%)

Your visual tests are not catching many CSS changes. Common causes:

- Tests only check `toBeVisible()` without style assertions
- Missing tests for responsive/layout properties
- No tests for z-index, opacity, or overflow behavior

## Improving Coverage

For each surviving mutant, ask: **"Should my tests catch this?"**

### Yes → Write a test

```css
/* Surviving mutant: padding: 16px → 0px */
.card {
  padding: 16px;
}
```

```tsx
// Add a screenshot test for this component
test("card screenshot", async () => {
  render(
    <div data-testid="card" style={{ width: 280, padding: 8 }}>
      <Card title="Pro" price="$19" />
    </div>,
  );
  expect(await commands.screenshotElement("card")).toMatchSnapshot();
});
```

### No → Exclude it

Some mutations are not meaningful (e.g., changing a decorative shadow). Exclude them:

```bash
css-mutate --exclude-selectors ".decorative-*,::before,::after"
```

## Comparison with JavaScript Coverage

| Aspect          | JS Line Coverage         | CSS Mutation Coverage         |
| --------------- | ------------------------ | ----------------------------- |
| Measures        | Lines executed           | Properties tested             |
| Tool            | V8/Istanbul              | CSS Mutator                   |
| Granularity     | Line/branch              | Property/value                |
| False positives | High (executed ≠ tested) | Low (mutation must be caught) |
| Speed           | Fast (single run)        | Slow (one run per mutant)     |
| Accuracy        | Which code ran           | Which styles are verified     |
