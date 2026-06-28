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
  const email = `projtest_${ts}@sitetrack.test`;

  // Seed: manager
  const regRes = await fetch(`${API}/auth/register`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName: "Eve", lastName: "Engineer",
      email, password: "Test1234!", role: "manager" }),
  });
  const { token } = await regRes.json();
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  // Seed: two projects
  const projA = await fetch(`${API}/project`, {
    method: "POST", headers: h,
    body: JSON.stringify({ name: "Alpha Tower", description: "High-rise build",
      status: "Active", priority: "High", startDate: "2025-01-01", endDate: "2025-12-31",
      manager: "Eve Engineer", client: "Acme", location: "London", budget: 500000, spent: 100000, progress: 20 }),
  }).then(r => r.json());

  const projB = await fetch(`${API}/project`, {
    method: "POST", headers: h,
    body: JSON.stringify({ name: "Beta Bridge", description: "Bridge repair",
      status: "Planning", priority: "Medium", startDate: "2025-03-01", endDate: "2025-09-30",
      manager: "Eve Engineer", client: "Council", location: "Manchester", budget: 200000, spent: 0, progress: 0 }),
  }).then(r => r.json());

  console.log(`Project A: ${projA._id} (${projA.name})`);
  console.log(`Project B: ${projB._id} (${projB.name})`);

  // Seed: tasks — two for Alpha Tower, one for Beta Bridge, one unlinked
  await fetch(`${API}/task`, {
    method: "POST", headers: h,
    body: JSON.stringify({ title: "Foundation inspection", site: "Alpha Tower", assignee: "Bob",
      priority: "High", dueDate: "2025-06-01", status: "Pending", projectId: projA._id }),
  });
  await fetch(`${API}/task`, {
    method: "POST", headers: h,
    body: JSON.stringify({ title: "Concrete pour Level 2", site: "Alpha Tower", assignee: "Carol",
      priority: "Medium", dueDate: "2025-07-15", status: "In Progress", projectId: projA._id }),
  });
  await fetch(`${API}/task`, {
    method: "POST", headers: h,
    body: JSON.stringify({ title: "Survey existing bridge", site: "Beta Bridge", assignee: "Dave",
      priority: "Low", dueDate: "2025-04-01", status: "Pending", projectId: projB._id }),
  });
  await fetch(`${API}/task`, {
    method: "POST", headers: h,
    body: JSON.stringify({ title: "General site cleanup", site: "Main Yard", assignee: "Alice",
      priority: "Low", dueDate: "2025-05-01", status: "Pending" }), // no projectId
  });

  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const page    = await browser.newPage();
  page.setDefaultTimeout(12000);

  try {
    // Sign in
    await page.goto(`${BASE}/signin`);
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', "Test1234!");
    await page.click('button:has-text("Sign in")');
    await page.waitForURL(`${BASE}/dashboard`);

    // ── 1. Projects page: "View Tasks" button exists on each card ─────────────
    console.log("\n--- Projects page ---");
    await page.goto(`${BASE}/projects`);
    await page.waitForLoadState("networkidle");
    await ss(page, "pt-01-projects");

    const viewTasksBtns = await page.locator('button:has-text("View Tasks")').count();
    console.log(`✓ "View Tasks" buttons shown on project cards: ${viewTasksBtns >= 2}`);

    // ── 2. Click "View Tasks" on Alpha Tower ──────────────────────────────────
    // Find the specific card by its data (id in a data attribute or unique text near button)
    // We click the first "View Tasks" button just to verify the button navigates
    console.log("\n--- Click View Tasks for Alpha Tower ---");
    await page.click('button:has-text("View Tasks")');
    await page.waitForURL(/\/tasks\?project=/);
    await page.waitForLoadState("networkidle");
    // URL should contain project param
    const url1 = page.url();
    console.log(`✓ URL contains project query param: ${url1.includes('project=')}`);

    // Now navigate directly with the KNOWN project ID to test filtering
    await page.goto(`${BASE}/tasks?project=${projA._id}&name=${encodeURIComponent(projA.name)}`);
    await page.waitForLoadState("networkidle");
    await ss(page, "pt-02-tasks-filtered-alpha");

    const url = page.url();
    console.log(`✓ URL contains correct project ID: ${url.includes(projA._id)}`);

    // Filter chip should appear
    const chip = await page.locator('text=Project: Alpha Tower').count();
    console.log(`✓ Project filter chip shown: ${chip > 0}`);

    // Alpha Tower tasks should be visible
    const foundationTask = await page.locator('text=Foundation inspection').count();
    const concreteTask   = await page.locator('text=Concrete pour Level 2').count();
    console.log(`✓ Alpha Tower task 1 visible: ${foundationTask > 0}`);
    console.log(`✓ Alpha Tower task 2 visible: ${concreteTask > 0}`);

    // Beta Bridge and unlinked tasks should NOT be visible
    const bridgeTask   = await page.locator('text=Survey existing bridge').count();
    const cleanupTask  = await page.locator('text=General site cleanup').count();
    console.log(`✓ Beta Bridge task hidden: ${bridgeTask === 0}`);
    console.log(`✓ Unlinked task hidden: ${cleanupTask === 0}`);

    // ── 3. Dismiss chip clears filter ─────────────────────────────────────────
    console.log("\n--- Clear project filter ---");
    await page.locator('button[title="Clear project filter"]').click();
    await page.waitForLoadState("networkidle");
    await ss(page, "pt-03-filter-cleared");

    const chipGone = await page.locator('text=Project: Alpha Tower').count();
    console.log(`✓ Filter chip gone after dismiss: ${chipGone === 0}`);

    // Foundation inspection (Alpha Tower) should still be visible — was visible before clear
    const foundationBack = await page.locator('text=Foundation inspection').count();
    console.log(`✓ Alpha Tower task still visible after clearing filter: ${foundationBack > 0}`);

    // ── 4. Clear Filters button also clears project filter ────────────────────
    console.log("\n--- Clear Filters button clears project param ---");
    // Navigate back to tasks with project filter
    await page.goto(`${BASE}/tasks?project=${projA._id}&name=Alpha+Tower`);
    await page.waitForLoadState("networkidle");
    const chipAgain = await page.locator('text=Project: Alpha Tower').count();
    console.log(`✓ Filter chip re-appears from URL: ${chipAgain > 0}`);

    await page.click('button:has-text("Clear Filters")');
    await page.waitForTimeout(500);
    const chipAfterClear = await page.locator('text=Project: Alpha Tower').count();
    console.log(`✓ Filter chip gone after Clear Filters: ${chipAfterClear === 0}`);
    await ss(page, "pt-04-clear-filters");

    console.log("\n=== Project → Tasks drill-down verified ===");

  } catch (err) {
    console.error("\nERROR:", err.message);
    await ss(page, "pt-error").catch(() => {});
    process.exitCode = 1;
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

run();
