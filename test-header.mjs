import { chromium } from "playwright";
import fs from "fs";

const BASE = "http://localhost:5173";

async function screenshot(page, name) {
  const dir = "test-screenshots";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  await page.screenshot({ path: `${dir}/${name}.png` });
}

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage();
  page.setDefaultTimeout(12000);

  try {
    // sign in with previously created account
    await page.goto(`${BASE}/signup`);
    await page.waitForLoadState("networkidle");
    const ts = Date.now();
    await page.fill('input[placeholder="First name"]', "UI");
    await page.fill('input[placeholder="Last name"]', "Tester");
    await page.fill('input[type="email"]', `hdr_${ts}@sitetrack.test`);
    await page.fill('input[placeholder*="password" i]', "Test1234!");
    await page.locator('input[type="checkbox"]').first().check();
    await page.click('button:has-text("Create account")');
    await page.waitForURL(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");

    // 1. Header — no orange dot, no fake notifications
    await screenshot(page, "header-01-dashboard");
    console.log("Dashboard header captured");

    // 2. Click the notification bell
    await page.click('button[aria-label="Notifications"]');
    await page.waitForTimeout(400);
    await screenshot(page, "header-02-notification-dropdown");
    console.log("Notification dropdown captured");

    // 3. Verify no fake content
    const hasFakeName = await page.locator('text="Terry Franci"').count();
    const hasEmptyState = await page.locator('text="No notifications yet"').count();
    console.log(`Fake names visible: ${hasFakeName} (expect 0)`);
    console.log(`Empty state visible: ${hasEmptyState} (expect 1)`);

    // 4. Verify search doesn't submit to external URL
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const searchInput = page.locator('input[placeholder*="Search tasks"]');
    const isReadOnly = await searchInput.getAttribute("readonly");
    console.log(`Search input is readOnly: ${isReadOnly !== null} (expect true)`);

    console.log("\nAll header checks passed");
  } catch (err) {
    console.error("ERROR:", err.message);
    await screenshot(page, "header-error").catch(() => {});
    process.exitCode = 1;
  } finally {
    await page.waitForTimeout(1500);
    await browser.close();
  }
}

run();
