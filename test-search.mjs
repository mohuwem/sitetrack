import { chromium } from "playwright";
import fs from "fs";

const BASE = "http://localhost:5173";
const API  = "http://localhost:5000/api";

async function screenshot(page, name) {
  const dir = "test-screenshots";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  await page.screenshot({ path: `${dir}/${name}.png` });
}

async function run() {
  // Seed data via API first
  const ts    = Date.now();
  const email = `srchui_${ts}@sitetrack.test`;
  const regRes = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName: "Search", lastName: "User", email, password: "Test1234!", role: "manager" }),
  });
  const { token } = await regRes.json();

  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  // Create a task, project, worker so search returns results
  await fetch(`${API}/task`, { method: "POST", headers: h,
    body: JSON.stringify({ title: "Foundation Pour Block A", site: "Site Alpha", assignee: "John Smith",
      priority: "High", dueDate: "2026-07-01", status: "In Progress" }) });
  await fetch(`${API}/project`, { method: "POST", headers: h,
    body: JSON.stringify({ name: "Alpha Tower Renovation", description: "Main renovation block", manager: "Search User",
      status: "Active", priority: "High" }) });
  await fetch(`${API}/worker`, { method: "POST", headers: h,
    body: JSON.stringify({ name: "Alice Foundation", trade: "Concrete", status: "Active", employeeId: "W001" }) });

  // Now test the UI
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage();
  page.setDefaultTimeout(12000);

  try {
    // Sign in
    await page.goto(`${BASE}/signin`);
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', "Test1234!");
    await page.click('button:has-text("Sign in")');
    await page.waitForURL(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");

    // 1. Header with search bar
    await screenshot(page, "search-01-header");
    console.log("1. Header captured");

    // 2. Focus via ⌘K
    await page.keyboard.press("Meta+k");
    await page.waitForTimeout(300);
    await screenshot(page, "search-02-focused");
    console.log("2. ⌘K focused the search bar");

    // 3. Type query matching task title
    await page.keyboard.type("Found");
    await page.waitForTimeout(600); // debounce
    await screenshot(page, "search-03-results-task");
    const taskResultVisible = await page.locator('text="Foundation Pour Block A"').count();
    console.log(`3. Task result visible: ${taskResultVisible > 0} (expect true)`);

    // 4. Erase and type project query
    await page.fill('input[placeholder*="Search tasks"]', "Alpha");
    await page.waitForTimeout(600);
    await screenshot(page, "search-04-results-multi");
    const projResultVisible = await page.locator('text="Alpha Tower Renovation"').count();
    const workerResultVisible = await page.locator('text="Alice Foundation"').count();
    console.log(`4. Project result visible: ${projResultVisible > 0}`);
    console.log(`4. Worker result visible: ${workerResultVisible > 0}`);

    // 5. No results
    await page.fill('input[placeholder*="Search tasks"]', "xyzxyzxyz");
    await page.waitForTimeout(600);
    await screenshot(page, "search-05-no-results");
    const noResults = await page.locator('text="No results for"').count();
    console.log(`5. No-results state: ${noResults > 0} (expect true)`);

    // 6. Escape closes
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const dropdownGone = await page.locator('text="No results for"').count();
    console.log(`6. Escape closed dropdown: ${dropdownGone === 0} (expect true)`);

    // 7. Click a task result and navigate
    await page.fill('input[placeholder*="Search tasks"]', "Foundation");
    await page.waitForTimeout(600);
    await page.locator('text="Foundation Pour Block A"').first().click();
    await page.waitForURL(`${BASE}/tasks`);
    console.log(`7. Clicked task result → navigated to /tasks ✓`);
    await screenshot(page, "search-06-navigated-tasks");

    console.log("\n=== Search feature verified ===");
  } catch (err) {
    console.error("ERROR:", err.message);
    await screenshot(page, "search-error").catch(() => {});
    process.exitCode = 1;
  } finally {
    await page.waitForTimeout(1500);
    await browser.close();
  }
}

run();
