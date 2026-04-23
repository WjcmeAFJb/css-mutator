# CSS Mutator

CSS mutation testing for Vite + Vitest. Systematically mutates CSS properties
and verifies that your screenshot / visual tests actually detect the changes —
if they don't, your visual test coverage has a hole.

See [`CLAUDE.md`](./CLAUDE.md) for the architecture deep-dive, or the
[docs site](https://wjcmeafjb.github.io/css-mutator/) for user-facing docs.

## Installation

Releases are published as **prebuilt tarballs** attached to GitHub Releases —
no npm registry required. Install directly by URL.

Pick the version (tag) you want from the
[Releases page](https://github.com/WjcmeAFJb/css-mutator/releases):

**pnpm:**

```sh
pnpm add https://github.com/WjcmeAFJb/css-mutator/releases/download/v0.1.0/css-mutator-0.1.0.tgz
```

**npm:**

```sh
npm install https://github.com/WjcmeAFJb/css-mutator/releases/download/v0.1.0/css-mutator-0.1.0.tgz
```

**yarn:**

```sh
yarn add https://github.com/WjcmeAFJb/css-mutator/releases/download/v0.1.0/css-mutator-0.1.0.tgz
```

Each release page also contains a copy-paste ready install snippet with the
correct URL baked in.

### Why a tarball URL instead of a registry?

- Zero registry setup — works in any CI environment that can reach GitHub.
- Deterministic: the URL pins to an exact tag/artifact, not a tag-moveable
  package version.
- Works fine with `pnpm-lock.yaml` / `package-lock.json` — the lockfile records
  the tarball's integrity hash.

## Usage

```sh
# Dry run — list all mutants without testing
npx css-mutate --dry-run --files "src/**/*.module.css"

# Full mutation run
npx css-mutate --files "src/**/*.module.css"
```

See the [docs site](https://wjcmeafjb.github.io/css-mutator/) for the full
guide, CLI options, and API reference.

## Monorepo layout

```
packages/
  css-mutator/   # the library (published as css-mutator tarball)
  demo-app/      # demo Vite+React app with intentional CSS bugs and visual tests
  docs-site/     # VitePress documentation site (deployed to GitHub Pages)
```

## Releasing

Releases are automated via [`.github/workflows/release.yml`](./.github/workflows/release.yml).

```sh
# Bump the version in packages/css-mutator/package.json, commit, then:
git tag v0.1.0
git push origin v0.1.0
```

The workflow builds the package, runs `pnpm pack`, and attaches the resulting
`.tgz` to a GitHub Release with install instructions pre-filled.

## Docs

The VitePress site in `packages/docs-site/` is automatically built and
published to GitHub Pages by [`.github/workflows/docs.yml`](./.github/workflows/docs.yml)
on every push to `main` that touches the docs.

## License

Licensed under the [LGPL-3.0-or-later](./LICENSE). This is an independent
project and is not affiliated with any other mutation-testing tool.
