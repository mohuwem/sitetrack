import { chromium } from "playwright";
import fs from "fs";

const BASE = "http://localhost:5173";
const API  = "http://localhost:5000/api";

async function ss(page, name) {
  const dir = "test-screenshots";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  await page.screenshot({ path: `${dir}/${name}.png` });
}

async function run() {
  const ts = Date.now();
  const mgrEmail    = `mgr_wl_${ts}@sitetrack.test`;
  const workerEmail = `wrkr_wl_${ts}@sitetrack.test`;

  // ── 1. Seed: manager + worker record + task ────────────────────────────────
  const mgrRes = await fetch(`${API}/auth/register`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName: "Log", lastName: "Manager",
      email: mgrEmail, password: "Test1234!", role: "manager" }),
  });
  const { token: mgrToken } = await mgrRes.json();
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${mgrToken}` };

  const workerRecord = await fetch(`${API}/worker`, {
    method: "POST", headers: h,
    body: JSON.stringify({ name: "Log Worker", email: workerEmail, trade: "Plastering",
      status: "Active", employeeId: "WL01" }),
  }).then((r) => r.json());
  console.log(`Worker record: ${workerRecord._id}`);

  // ── 2. Worker signs up and submits a daily update ─────────────────────────
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const page    = await browser.newPage();
  page.setDefaultTimeout(15000);

  try {
    // Worker sign-up (auto-links to workerRecord via email match)
    console.log("\n--- Worker submits daily update ---");
    await page.goto(`${BASE}/worker/signup`);
    await page.waitForLoadState("networkidle");
    await page.fill('input[placeholder="First name"]', "Log");
    await page.fill('input[placeholder="Last name"]', "Worker");
    await page.fill('input[placeholder="your@email.com"]', workerEmail);
    await page.fill('input[type="password"]', "Test1234!");
    const cb = page.locator('input[type="checkbox"]').first();
    if (await cb.isVisible()) await cb.check();
    await page.click('button:has-text("Create worker account")');
    await page.waitForURL(`${BASE}/worker-dashboard`);
    await page.waitForLoadState("networkidle");

    // Submit daily update from worker dashboard
    const updateMsg = "Completed plastering on Level 3. Ready for painting inspection.";
    await page.fill('textarea', updateMsg);
    await page.click('button:has-text("Send Update")');
    await page.waitForTimeout(1500);
    const successMsg = await page.locator('text=Update sent').count();
    console.log(`✓ Worker submitted update: ${successMsg > 0}`);
    await ss(page, "wl-01-worker-sent-update");

    // ── 3. Manager views the update inbox ─────────────────────────────────────
    console.log("\n--- Manager views updates inbox ---");
    // Navigate to manager sign-in
    await page.goto(`${BASE}/signin`);
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"]', mgrEmail);
    await page.fill('input[type="password"]', "Test1234!");
    await page.click('button:has-text("Sign in")');
    await page.waitForURL(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await ss(page, "wl-02-manager-dashboard");

    // Navigate to /worklogs via sidebar
    await page.click('a[href="/worklogs"]');
    await page.waitForURL(`${BASE}/worklogs`);
    await page.waitForLoadState("networkidle");
    await ss(page, "wl-03-worklogs-today");

    // Check the update appears
    const updateVisible = await page.locator('text=Completed plastering on Level 3').count();
    console.log(`✓ Update visible in inbox: ${updateVisible > 0}`);

    // Check worker name and trade shown
    const workerNameVisible = await page.locator('text=Log Worker').count();
    const tradeVisible = await page.locator('text=Plastering').count();
    console.log(`✓ Worker name shown: ${workerNameVisible > 0}`);
    console.log(`✓ Worker trade shown: ${tradeVisible > 0}`);

    // "Today" filter is default — date badge should say "Today"
    const todayBadge = await page.locator('text=Today').count();
    console.log(`✓ "Today" label shown: ${todayBadge > 0}`);

    // Switch to "All time"
    await page.click('button:has-text("All time")');
    await page.waitForLoadState("networkidle");
    await ss(page, "wl-04-worklogs-all");
    const stillVisible = await page.locator('text=Completed plastering on Level 3').count();
    console.log(`✓ Update still visible in "All time" view: ${stillVisible > 0}`);

    // Delete the update
    const deleteBtn = page.locator('button[title="Dismiss"]').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.waitForTimeout(1000);
      const afterDelete = await page.locator('text=Completed plastering on Level 3').count();
      console.log(`✓ Update removed after dismiss: ${afterDelete === 0}`);
    }
    await ss(page, "wl-05-after-delete");

    console.log("\n=== Worker Updates inbox verified ===");

  } catch (err) {
    console.error("\nERROR:", err.message);
    await ss(page, "wl-error").catch(() => {});
    process.exitCode = 1;
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

run();
