import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT = resolve(__dirname, "../../reports/e2e/index.html");
const OUT = resolve(__dirname, "../../reports/e2e");

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1400, height: 900 },
  deviceScaleFactor: 2,
});
await page.goto(`file://${REPORT}`);
await page.waitForLoadState("networkidle");

await page.screenshot({
  path: resolve(OUT, "e2e-report-overview.png"),
  clip: { x: 0, y: 0, width: 1400, height: 900 },
});
console.log("e2e-report-overview.png");

await page.screenshot({
  path: resolve(OUT, "e2e-report-full.png"),
  fullPage: true,
});
console.log("e2e-report-full.png");

await browser.close();
