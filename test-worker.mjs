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
  const workerEmail = `worker_${ts}@sitetrack.test`;
  const mgrEmail    = `mgr_w_${ts}@sitetrack.test`;

  // ── 1. Register manager and seed data ─────────────────────────────────────
  const mgrRes = await fetch(`${API}/auth/register`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName: "Site", lastName: "Manager", email: mgrEmail,
      password: "Test1234!", role: "manager" }),
  });
  const { token: mgrToken } = await mgrRes.json();
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${mgrToken}` };

  // Create a Worker record BEFORE the worker signs up (so auto-link fires)
  const workerRes = await fetch(`${API}/worker`, {
    method: "POST", headers: h,
    body: JSON.stringify({ name: "Test Worker", email: workerEmail, trade: "Concrete",
      status: "Active", employeeId: "W999", phone: "07700000000",
      address: "1 Site Road", assignedProject: "Alpha Tower", startDate: "2026-01-01",
      skills: ["Formwork", "Steel Fixing"] }),
  });
  const workerRecord = await workerRes.json();
  console.log(`Worker record created: ${workerRecord._id} (${workerRecord.name})`);

  // Assign a task to this worker
  await fetch(`${API}/task`, {
    method: "POST", headers: h,
    body: JSON.stringify({ title: "Pour Foundation Slab B", site: "Alpha Tower",
      assignee: "Test Worker", assigneeId: workerRecord._id,
      priority: "High", dueDate: "2026-07-01", status: "Pending" }),
  });
  console.log("Task assigned to worker");

  // ── 2. Test worker PORTAL ──────────────────────────────────────────────────
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const page    = await browser.newPage();
  page.setDefaultTimeout(15000);

  try {
    // 2a. Worker sign-up
    console.log("\n--- Worker sign-up ---");
    await page.goto(`${BASE}/worker/signup`);
    await page.waitForLoadState("networkidle");
    await ss(page, "w-01-signup");

    await page.fill('input[placeholder="First name"]', "Test");
    await page.fill('input[placeholder="Last name"]', "Worker");
    await page.fill('input[placeholder="your@email.com"]', workerEmail);
    await page.fill('input[type="password"]', "Test1234!");
    const cb = page.locator('input[type="checkbox"]').first();
    if (await cb.isVisible()) await cb.check();
    await page.click('button:has-text("Create worker account")');
    await page.waitForURL(`${BASE}/worker-dashboard`, { timeout: 12000 });
    console.log("✓ Worker signed up and redirected to worker portal");
    await page.waitForLoadState("networkidle");
    await ss(page, "w-02-dashboard");

    // 2b. Check no "not linked" banner (auto-link should have fired)
    const notLinkedBanner = await page.locator('text=Account not linked').count();
    console.log(`  Not-linked banner visible: ${notLinkedBanner > 0} (expect false)`);

    // 2c. Assigned task should be visible — wait up to 5s for tasks to load
    await page.waitForSelector('text=Pour Foundation Slab B', { timeout: 5000 }).catch(() => {});
    const taskVisible = await page.locator('text=Pour Foundation Slab B').count();
    console.log(`✓ Task visible on dashboard: ${taskVisible > 0} (expect true)`);

    // 2d. My Tasks page
    console.log("\n--- Worker Tasks ---");
    await page.click('a[href="/worker/tasks"]');
    await page.waitForURL(`${BASE}/worker/tasks`);
    await page.waitForLoadState("networkidle");
    await ss(page, "w-03-tasks");
    const taskOnTasksPage = await page.locator('text="Pour Foundation Slab B"').count();
    console.log(`✓ Task visible on tasks page: ${taskOnTasksPage > 0}`);

    // 2e. Update task status — find the status-update button (rounded-lg), not the filter tab (rounded-full)
    const inProgressBtn = page.locator('button.rounded-lg:has-text("In Progress")').first();
    if (await inProgressBtn.isVisible()) {
      await inProgressBtn.click();
      // Wait for the status badge span to update
      await page.waitForTimeout(1500);
      // The badge is a span (not a button) that shows the task's current status
      const badge = await page.locator('span.rounded-full:has-text("In Progress")').count();
      console.log(`✓ Status updated to In Progress: ${badge > 0}`);
    } else {
      console.log("  In Progress status button not visible — skipping status update");
    }
    await ss(page, "w-04-task-updated");

    // 2f. Attendance page
    console.log("\n--- Worker Attendance ---");
    await page.click('a[href="/worker/attendance"]');
    await page.waitForURL(`${BASE}/worker/attendance`);
    await page.waitForLoadState("networkidle");
    await ss(page, "w-05-attendance");
    const checkInBtn = page.locator('button:has-text("Check In Now")');
    const alreadyIn  = await page.locator('text=Checked in at').count();
    console.log(`  Already checked in today: ${alreadyIn > 0}`);

    if (!alreadyIn && await checkInBtn.isVisible()) {
      await checkInBtn.click();
      await page.waitForTimeout(1500);
      const confirmed = await page.locator('text=Checked in at').count();
      console.log(`✓ Check-in confirmed: ${confirmed > 0}`);
      await ss(page, "w-06-checked-in");

      // Check out
      const checkOutBtn = page.locator('button:has-text("Check Out")').first();
      if (await checkOutBtn.isVisible()) {
        await checkOutBtn.click();
        await page.waitForTimeout(1500);
        const checkedOut = await page.locator('text=Checked out at').count();
        console.log(`✓ Check-out confirmed: ${checkedOut > 0}`);
        await ss(page, "w-07-checked-out");
      }
    }

    // 2g. Profile page
    console.log("\n--- Worker Profile ---");
    await page.click('a[href="/worker/profile"]');
    await page.waitForURL(`${BASE}/worker/profile`);
    await page.waitForLoadState("networkidle");
    await ss(page, "w-08-profile");
    const tradeVisible = await page.locator('text="Concrete"').count();
    const empIdVisible = await page.locator('text="W999"').count();
    console.log(`✓ Trade visible on profile: ${tradeVisible > 0}`);
    console.log(`✓ Employee ID visible on profile: ${empIdVisible > 0}`);

    // 2h. Test the NOT-LINKED scenario with a fresh worker account
    console.log("\n--- Not-linked worker scenario ---");
    await page.goto(`${BASE}/worker/signup`);
    await page.waitForLoadState("networkidle");
    const unlinkedEmail = `unlinked_${ts}@sitetrack.test`;
    await page.fill('input[placeholder="First name"]', "Unlinked");
    await page.fill('input[placeholder="Last name"]', "Worker");
    await page.fill('input[placeholder="your@email.com"]', unlinkedEmail);
    await page.fill('input[type="password"]', "Test1234!");
    const cb2 = page.locator('input[type="checkbox"]').first();
    if (await cb2.isVisible()) await cb2.check();
    await page.click('button:has-text("Create worker account")');
    await page.waitForURL(`${BASE}/worker-dashboard`, { timeout: 12000 });
    await page.waitForLoadState("networkidle");
    await ss(page, "w-09-unlinked-dashboard");
    const banner = await page.locator('text=Account not linked').count();
    console.log(`✓ Not-linked banner on dashboard: ${banner > 0} (expect true)`);

    await page.click('a[href="/worker/tasks"]');
    await page.waitForURL(`${BASE}/worker/tasks`);
    await page.waitForLoadState("networkidle");
    await ss(page, "w-10-unlinked-tasks");
    const tasksBanner = await page.locator('text=Account not linked').count();
    console.log(`✓ Not-linked banner on tasks page: ${tasksBanner > 0} (expect true)`);

    console.log("\n=== Worker portal verified ===");

  } catch (err) {
    console.error("\nERROR:", err.message);
    await ss(page, "w-error").catch(() => {});
    process.exitCode = 1;
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

run();
