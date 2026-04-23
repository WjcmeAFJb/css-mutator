# CLI Options

The `css-mutate` CLI provides a quick way to run CSS mutation testing from the command line.

## Usage

```bash
npx css-mutate [options]
```

## Options

| Flag                         | Short | Description                                    | Default                |
| ---------------------------- | ----- | ---------------------------------------------- | ---------------------- |
| `--files <patterns>`         | `-f`  | Comma-separated glob patterns for CSS files    | `src/**/*.css`         |
| `--vitest-config <path>`     |       | Path to vitest config file                     | auto-detected          |
| `--timeout <ms>`             | `-t`  | Timeout per mutant test run                    | `30000`                |
| `--concurrency <n>`          | `-c`  | Number of concurrent test runs                 | `1`                    |
| `--report-dir <path>`        |       | Output directory for reports                   | `reports/css-mutation` |
| `--reporters <types>`        |       | Comma-separated reporters: html, json, console | `console,html,json`    |
| `--mutators <names>`         |       | Comma-separated mutator names to include       | all                    |
| `--exclude-mutators <names>` |       | Comma-separated mutator names to exclude       | none                   |
| `--exclude-selectors <sel>`  |       | Comma-separated selectors to exclude           | none                   |
| `--cwd <path>`               |       | Working directory                              | `.`                    |
| `--dry-run`                  |       | List mutations without running tests           |                        |
| `--list-mutators`            |       | List all available mutator operators           |                        |
| `--help`                     | `-h`  | Show help message                              |                        |

## Examples

### Basic Usage

```bash
# Run with defaults (scans src/**/*.css)
npx css-mutate

# Target CSS module files
npx css-mutate --files "src/**/*.module.css"

# Multiple file patterns
npx css-mutate --files "src/components/**/*.css,src/styles/**/*.css"
```

### Dry Run

Preview mutations without running tests:

```bash
npx css-mutate --dry-run --files "src/styles/button.module.css"
```

Output:

```
Found 24 potential CSS mutations:

  [ColorMutator] .button { color: white → black }
  [ColorMutator] .button { background-color: #667eea → #9981ff }
  [SpacingMutator] .button { padding: 12px → 0px }
  [BorderMutator] .button { border-radius: 8px → 0 }
  ...

Total: 24 mutants
```

### Targeted Testing

```bash
# Only test color and opacity mutations
npx css-mutate --mutators ColorMutator,OpacityMutator

# Skip layout mutations
npx css-mutate --exclude-mutators FlexMutator,GridMutator

# Skip vendor prefix selectors
npx css-mutate --exclude-selectors "@keyframes,::before,::after"
```

### Custom Vitest Config

```bash
# Use a specific vitest config for browser mode
npx css-mutate --vitest-config vitest.browser.config.ts

# With a custom timeout
npx css-mutate --vitest-config vitest.browser.config.ts --timeout 60000
```

### Report Output

```bash
# Only console output (fast, no file I/O)
npx css-mutate --reporters console

# JSON output for CI integration
npx css-mutate --reporters json --report-dir coverage/css

# All reporters
npx css-mutate --reporters console,html,json
```

## Exit Codes

| Code | Meaning                                       |
| ---- | --------------------------------------------- |
| `0`  | All mutants were killed (100% mutation score) |
| `1`  | Some mutants survived                         |
