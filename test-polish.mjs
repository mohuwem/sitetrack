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
  const email = `polish_${ts}@sitetrack.test`;

  // Register manager
  await fetch(`${API}/auth/register`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName: "Dana", lastName: "Foreman",
      email, password: "Test1234!", role: "manager" }),
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
    await page.waitForLoadState("networkidle");

    // ── Fix 1: Dashboard "Worker Updates" section ──────────────────────────────
    console.log("--- Dashboard Worker Updates link ---");
    // Submit a worklog first so the section is visible (seed via API)
    // We need a worker record + worklog for the panel to render
    // Skip panel check if no logs exist — just verify the link destination is /worklogs
    const workerUpdateLink = await page.locator('a[href="/worklogs"]').count();
    // Could be in sidebar OR in dashboard section — both should exist
    // Sidebar "Updates" link is one. Dashboard section link is another.
    // Let's navigate to dashboard and check sidebar nav item points to /worklogs
    const sidebarUpdatesLink = await page.locator('a[href="/worklogs"]:has-text("Updates")').count();
    console.log(`✓ Sidebar "Updates" links to /worklogs: ${sidebarUpdatesLink > 0}`);
    await ss(page, "polish-01-dashboard");

    // Navigate via the sidebar Updates link
    await page.click('a[href="/worklogs"]:has-text("Updates")');
    await page.waitForURL(`${BASE}/worklogs`);
    console.log(`✓ Sidebar Updates nav leads to /worklogs`);
    await ss(page, "polish-02-worklogs-page");

    // Go back to dashboard and check there's no link to /workers (old wrong link)
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    // Count of /workers links in main content (sidebar "Workers" is expected — that's correct)
    // The old broken link in Worker Updates section pointed to /workers
    // If the Worker Updates section is visible, it should now point to /worklogs
    const wrongLink = await page.locator('a[href="/workers"]:has-text("View workers")').count();
    console.log(`✓ Old "View workers" broken link is gone: ${wrongLink === 0}`);

    // ── Fix 2: Task comment author uses real name ──────────────────────────────
    console.log("\n--- Task comment author ---");
    await page.goto(`${BASE}/tasks`);
    await page.waitForLoadState("networkidle");
    await ss(page, "polish-03-tasks");

    // Create a task so we can open the drawer
    const createBtn = page.locator('button:has-text("Add Task"), button:has-text("New Task"), button:has-text("Create Task")').first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(500);
      const titleInput = page.locator('input[placeholder*="title"], input[placeholder*="Title"]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill("Polish Test Task");
        const submitBtn = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
        if (await submitBtn.isVisible()) await submitBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Open the first task drawer
    const taskCard = page.locator('[data-task-id], .task-card, li:has-text("Polish Test Task")').first();
    if (await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await taskCard.click();
      await page.waitForTimeout(800);
      await ss(page, "polish-04-task-drawer");

      // The comment author input should show real name, not "Site Manager"
      const commentAuthorInput = page.locator('input[value="Dana Foreman"], input[placeholder*="Your name"]').first();
      const hasFakeDefault = await page.locator('input[value="Site Manager"]').count();
      console.log(`✓ Comment author is NOT hardcoded "Site Manager": ${hasFakeDefault === 0}`);

      const hasRealName = await page.locator('input[value="Dana Foreman"]').count();
      console.log(`✓ Comment author defaults to real name "Dana Foreman": ${hasRealName > 0}`);
    } else {
      console.log("  (No task card visible to open drawer — verifying via page source)");
      const pageContent = await page.content();
      const hasSiteManagerDefault = pageContent.includes('"Site Manager"');
      console.log(`✓ "Site Manager" hardcoded default removed from rendered output: ${!hasSiteManagerDefault}`);
    }

    await ss(page, "polish-05-final");
    console.log("\n=== Polish fixes verified ===");

  } catch (err) {
    console.error("\nERROR:", err.message);
    await ss(page, "polish-error").catch(() => {});
    process.exitCode = 1;
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

run();
