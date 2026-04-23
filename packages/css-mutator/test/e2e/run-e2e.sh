#!/usr/bin/env bash
# E2E test: simulates a full developer workflow.
#
# 1. Build + pack the css-mutator package
# 2. Docker: install from tarball, install deps, run tests
# 3. Docker: run css-mutate CLI — test each mutant, produce report
# 4. Copy reports out, verify content
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
PKG_DIR="$REPO_ROOT/packages/css-mutator"
REPORT_DIR="$PKG_DIR/reports/e2e"

echo ""
echo "================================================================"
echo "  CSS Mutator — E2E Integration Test"
echo "================================================================"
echo ""

# ── Step 1: Build + pack ──────────────────────────────────────────
echo "[1/5] Building and packing css-mutator..."
cd "$PKG_DIR"
npx tsc 2>/dev/null || true
npm pack --pack-destination . 2>/dev/null
# npm pack creates stryker-mutator-css-mutator-*.tgz, rename for simplicity
mv stryker-mutator-css-mutator-*.tgz css-mutator.tgz 2>/dev/null || true
echo "      Done."

# ── Step 2: Docker build ──────────────────────────────────────────
echo "[2/5] Building Docker image..."
cd "$REPO_ROOT"
docker build -t css-mutator-e2e -f packages/css-mutator/test/e2e/Dockerfile . 2>&1 | tail -3
echo "      Done."

# Clean up tarball
rm -f "$PKG_DIR/css-mutator.tgz"

# ── Step 3: Run baseline tests ────────────────────────────────────
echo "[3/5] Running baseline tests in container..."
docker run --rm css-mutator-e2e sh -c "npm test" 2>&1 | tail -8
echo "      Baseline tests pass."

# ── Step 4: Run CSS mutation testing ──────────────────────────────
echo "[4/5] Running CSS mutation testing in container..."
CONTAINER_ID=$(docker create css-mutator-e2e sh -c "npm run test:mutate:css 2>&1; exit 0")
docker start -a "$CONTAINER_ID" 2>&1 | tee /tmp/css-e2e-output.txt

# Copy reports out
mkdir -p "$REPORT_DIR"
docker cp "$CONTAINER_ID:/build/demo/reports/css-mutation/." "$REPORT_DIR/" 2>/dev/null || true
docker rm "$CONTAINER_ID" > /dev/null 2>&1

echo ""
echo "      Mutation testing complete."

# ── Step 5: Verify output ─────────────────────────────────────────
echo "[5/5] Verifying results..."
OUTPUT=$(cat /tmp/css-e2e-output.txt)
PASS=true

check() {
  local pattern="$1" label="$2"
  if echo "$OUTPUT" | grep -q "$pattern"; then
    echo "      PASS: $label"
  else
    echo "      FAIL: $label"
    PASS=false
  fi
}

check "Scanning CSS files" "Mutation scan ran"
check "Import tracking:.*CSS file" "Import tracking active"
check "Testing.*mutants" "Mutants were tested"
check "KILLED" "Some mutants killed"
check "Mutation Score" "Score reported"

if [ -f "$REPORT_DIR/index.html" ]; then
  echo "      PASS: HTML report generated ($(wc -c < "$REPORT_DIR/index.html") bytes)"
else
  echo "      FAIL: No HTML report"
  PASS=false
fi

if [ -f "$REPORT_DIR/mutation-report.json" ]; then
  MUTANT_COUNT=$(node -e "
    const d=JSON.parse(require('fs').readFileSync('$REPORT_DIR/mutation-report.json','utf8'));
    const files = Object.keys(d.files);
    let total = 0;
    for (const f of files) total += d.files[f].mutants.length;
    console.log(total);
  " 2>/dev/null)
  echo "      PASS: JSON report generated ($MUTANT_COUNT mutants across files)"

  # Verify coveredBy is populated (import tracking worked)
  COVERED=$(node -e "
    const d=JSON.parse(require('fs').readFileSync('$REPORT_DIR/mutation-report.json','utf8'));
    let covered = 0;
    for (const f of Object.values(d.files))
      for (const m of f.mutants)
        if (m.coveredBy && m.coveredBy.length > 0) covered++;
    console.log(covered);
  " 2>/dev/null)
  if [ -n "$COVERED" ] && [ "$COVERED" -gt 0 ]; then
    echo "      PASS: coveredBy populated for $COVERED mutants (import tracking)"
  else
    echo "      FAIL: coveredBy not populated"
    PASS=false
  fi
else
  echo "      FAIL: No JSON report"
  PASS=false
fi

# Cleanup
rm -f /tmp/css-e2e-output.txt
docker rmi css-mutator-e2e > /dev/null 2>&1 || true

echo ""
echo "================================================================"
if [ "$PASS" = true ]; then
  echo "  ALL E2E TESTS PASSED"
else
  echo "  SOME E2E TESTS FAILED"
fi
echo "================================================================"
echo "  Reports: $REPORT_DIR"
echo ""

$PASS
