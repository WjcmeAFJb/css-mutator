# What is CSS Mutation Testing?

**CSS mutation testing** measures the effectiveness of your visual tests by systematically introducing small changes (mutations) to your CSS and checking whether your tests detect them.

## The Problem

Traditional code coverage tells you which CSS rules are _loaded_, but not whether your tests actually verify their _visual effect_. Consider:

```css
.modal-overlay {
  position: fixed;
  z-index: 10; /* Is this tested? */
  background: rgba(0, 0, 0, 0.5);
  opacity: 1;
}
```

Your tests might render the modal and assert it exists, but do they verify that:

- The z-index is high enough to appear above other content?
- The background has the right opacity?
- The overlay actually covers the viewport?

**CSS mutation testing answers these questions** by changing each property and checking if your tests fail.

## How It Works

1. **Scan**: Parse your CSS files and identify mutation opportunities
2. **Mutate**: For each mutation, create a modified version of the CSS
3. **Test**: Run your visual tests against the mutated CSS
4. **Report**: Show which mutations were caught (killed) vs. missed (survived)

```
Original:    .overlay { z-index: 10; opacity: 1; }
                              │              │
Mutation 1:  z-index: -1   ──┘              │    → Tests fail? ✅ Killed
Mutation 2:  z-index: 9999  ─┘              │    → Tests pass? ❌ Survived
Mutation 3:  opacity: 0     ────────────────┘    → Tests fail? ✅ Killed
```

## Mutation Score

Your **mutation score** is the percentage of mutations caught by your tests:

```
Mutation Score = (Killed Mutants / Total Mutants) × 100%
```

A higher score means your visual tests are more thorough. Surviving mutants point to CSS properties that need better test coverage.

## When to Use It

CSS mutation testing is most valuable for:

- **Design systems** with strict visual contracts
- **E-commerce** where layout bugs cost revenue
- **Accessibility** where color contrast matters
- **Component libraries** shipped to many consumers
- **Any project** with visual regression tests that wants to verify those tests are actually catching CSS bugs

## Next Steps

- [Getting Started](/guide/getting-started) — install and run your first CSS mutation test
- [How It Works](/guide/how-it-works) — deep dive into the mutation pipeline
- [Mutation Operators](/guide/mutators) — all 12 built-in mutation types
