---
layout: home

hero:
  name: CSS Mutator
  text: Mutation Testing for Your Stylesheets
  tagline: Find untested CSS. Catch visual bugs before your users do.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/WjcmeAFJb/css-mutator
  image:
    src: /hero-illustration.svg
    alt: CSS Mutator

features:
  - icon: "\U0001F9EC"
    title: 12 Mutation Operators
    details: Comprehensive CSS mutations covering colors, sizes, layout, typography, spacing, borders, flexbox, grid, visibility, opacity, z-index, and position.
  - icon: "\U0001F4F8"
    title: Visual Regression Ready
    details: Built for Vitest browser mode with Playwright. Catches visual bugs that unit tests miss through computed style assertions and screenshot comparisons.
  - icon: "\u26A1"
    title: Vite-Native Integration
    details: A Vite plugin intercepts CSS at the transform level. Works transparently with CSS modules, PostCSS, and any CSS preprocessor that Vite supports.
  - icon: "\U0001F4CA"
    title: CSS Coverage Reports
    details: See mutation coverage on your CSS source files — just like JavaScript. Know exactly which selectors and properties need more visual tests.
  - icon: "\U0001F50C"
    title: Incremental Cache
    details: Re-runs skip mutants whose CSS and test files haven't changed. Hashes include the full test-import chain so touching a test invalidates only its mutants.
  - icon: "\U0001F6E0\uFE0F"
    title: CLI & Programmatic API
    details: Use the css-mutate CLI for quick runs or import the API for custom integration into your build pipeline.
---
