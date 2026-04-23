# Mutation Operators

CSS Mutator includes 12 built-in mutation operators. Each targets specific CSS properties and generates semantically meaningful replacements.

## Overview

| Operator            | Target Properties                                             | Example Mutation           |
| ------------------- | ------------------------------------------------------------- | -------------------------- |
| `ColorMutator`      | `color`, `background-color`, `border-color`, `fill`, `stroke` | `red` → `blue`             |
| `DisplayMutator`    | `display`                                                     | `flex` → `none`            |
| `SizeMutator`       | `width`, `height`, `min-*`, `max-*`                           | `100px` → `0px`            |
| `PositionMutator`   | `position`, `top`, `right`, `bottom`, `left`                  | `absolute` → `static`      |
| `OpacityMutator`    | `opacity`                                                     | `1` → `0`                  |
| `ZIndexMutator`     | `z-index`                                                     | `10` → `-1`                |
| `BorderMutator`     | `border`, `border-radius`, `outline`                          | `1px solid black` → `none` |
| `FontMutator`       | `font-size`, `font-weight`, `text-align`                      | `bold` → `normal`          |
| `SpacingMutator`    | `margin`, `padding`, `gap`                                    | `16px` → `0px`             |
| `VisibilityMutator` | `visibility`, `overflow`, `pointer-events`                    | `visible` → `hidden`       |
| `FlexMutator`       | `flex-direction`, `justify-content`, `align-items`            | `row` → `column`           |
| `GridMutator`       | `grid-template-*`, `grid-auto-flow`                           | `repeat(3, 1fr)` → `1fr`   |

## ColorMutator

Mutates color values across all color properties.

**Handles**: `color`, `background-color`, `background`, `border-color`, `border-*-color`, `outline-color`, `fill`, `stroke`, `text-decoration-color`, `box-shadow`, `text-shadow`, `caret-color`, `accent-color`

**Mutations**:

- Named colors → complementary colors (`red` → `blue`, `black` → `white`)
- Hex colors → inverted (`#ff0000` → `#00ffff`)
- RGB → inverted channels
- HSL → hue shifted by 180 degrees
- Any color → `transparent`

## DisplayMutator

Mutates the `display` property to test layout fundamentals.

**Mutations**:

- `flex` → `block`, `none`
- `grid` → `block`, `none`
- `none` → `block`
- `inline` → `block`, `none`
- `inline-block` → `block`, `none`

## SizeMutator

Mutates dimensional properties.

**Handles**: `width`, `height`, `min-width`, `max-width`, `min-height`, `max-height`

**Mutations**:

- Non-zero values → `0`, doubled value, halved value, negated
- `auto` → `0px`, `100%`
- `min-content` ↔ `max-content`

## PositionMutator

Tests CSS positioning behavior.

**Handles**: `position`, `top`, `right`, `bottom`, `left`, `inset`

**Mutations**:

- `relative` → `static`, `absolute`
- `fixed` → `static`, `absolute`
- `sticky` → `static`, `relative`
- Offset values → `0`, negated

## OpacityMutator

Tests transparency handling.

**Mutations**:

- `1` → `0`, `0.5`
- `0` → `1`
- Partial values → `0`, `1`

## ZIndexMutator

Tests stacking order.

**Mutations**:

- Positive → `-1`, `0`
- Negative → `0`, `9999`
- `auto` → `0`, `-1`, `9999`

## BorderMutator

Tests border rendering and border-radius.

**Handles**: `border`, `border-*`, `border-radius`, `border-*-radius`, `outline`

**Mutations**:

- Shorthand → `none`
- `none` → `1px solid black`
- Border-radius → `0`, `50%`
- Border-style → complementary style, `none`

## FontMutator

Tests typography properties.

**Handles**: `font-size`, `font-weight`, `font-style`, `font-family`, `text-align`, `text-transform`, `text-decoration`, `letter-spacing`, `line-height`, `white-space`

**Mutations**:

- `bold` ↔ `normal`
- Font-size → doubled, halved
- `left` ↔ `right`, `center`
- `uppercase` ↔ `lowercase`
- `italic` ↔ `normal`

## SpacingMutator

Tests margin, padding, and gap.

**Handles**: `margin`, `margin-*`, `padding`, `padding-*`, `gap`, `row-gap`, `column-gap`

**Mutations**:

- Non-zero → `0`
- Margin → negated
- `auto` → `0`
- `0` → `16px`

## VisibilityMutator

Tests element visibility.

**Handles**: `visibility`, `overflow`, `overflow-*`, `pointer-events`, `clip-path`, `backface-visibility`

**Mutations**:

- `visible` ↔ `hidden`
- Overflow → alternative values
- `pointer-events: auto` ↔ `none`
- `clip-path` → `none` / `circle(0%)`

## FlexMutator

Tests flexbox layout.

**Handles**: `flex-direction`, `flex-wrap`, `justify-content`, `align-items`, `align-self`, `align-content`, `flex-grow`, `flex-shrink`, `flex-basis`, `order`

**Mutations**:

- `row` ↔ `column`
- `nowrap` ↔ `wrap`
- `flex-start` ↔ `flex-end`, `center`
- `space-between` → `center`
- `flex-grow: 0` ↔ `1`

## GridMutator

Tests CSS grid layout.

**Handles**: `grid-template-columns`, `grid-template-rows`, `grid-auto-flow`, `grid-column`, `grid-row`, `grid-auto-*`

**Mutations**:

- Multi-column template → single column
- `repeat(3, 1fr)` → `1fr`
- `row` ↔ `column` flow
- Span → reduced span

## Filtering Mutators

Include or exclude specific mutators:

```bash
# Only color mutations
css-mutate --mutators ColorMutator,OpacityMutator

# Exclude grid mutations
css-mutate --exclude-mutators GridMutator
```

Or in configuration:

```ts
cssMutator: {
  mutators: ['ColorMutator', 'DisplayMutator'],
  // or
  excludeMutators: ['GridMutator'],
}
```
