/**
 * Take screenshots of the CSS mutation HTML report using Playwright.
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_PATH = resolve(__dirname, "../../reports/screenshots/index.html");
const SCREENSHOT_DIR = resolve(__dirname, "../../reports/screenshots");

async function takeScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await page.goto(`file://${REPORT_PATH}`);
  await page.waitForLoadState("networkidle");

  // Screenshot 1: Full report overview (score badge + summary cards)
  await page.screenshot({
    path: resolve(SCREENSHOT_DIR, "report-overview.png"),
    clip: { x: 0, y: 0, width: 1400, height: 700 },
  });
  console.log("Screenshot 1: report-overview.png");

  // Screenshot 2: CSS source with mutation gutter markers
  const sourceTable = page.locator("table.source-code").first();
  if (await sourceTable.isVisible()) {
    await sourceTable.screenshot({
      path: resolve(SCREENSHOT_DIR, "css-source-annotations.png"),
    });
    console.log("Screenshot 2: css-source-annotations.png");
  }

  // Screenshot 3: Mutation details table
  const mutantTable = page.locator("table.mutant-table").first();
  if (await mutantTable.isVisible()) {
    await mutantTable.screenshot({
      path: resolve(SCREENSHOT_DIR, "mutation-details.png"),
    });
    console.log("Screenshot 3: mutation-details.png");
  }

  // Screenshot 4: Full page
  await page.screenshot({
    path: resolve(SCREENSHOT_DIR, "full-report.png"),
    fullPage: true,
  });
  console.log("Screenshot 4: full-report.png");

  await browser.close();
  console.log("\nAll screenshots saved to reports/screenshots/");
}

takeScreenshots().catch(console.error);
