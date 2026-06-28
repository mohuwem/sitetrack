import { chromium } from "playwright";
import fs from "fs";

const BASE = "http://localhost:5173";
const MGR_EMAIL = `uimgr_${Date.now()}@sitetrack.test`;
const MGR_PASS = "Test1234!";

async function screenshot(page, name) {
  const dir = "test-screenshots";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: false });
  console.log(`  [screenshot] ${dir}/${name}.png`);
}

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  try {
    // 1. Landing page
    console.log("\n1. Landing page");
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await screenshot(page, "01-landing");
    console.log("   title:", await page.title());

    // 2. Sign-up (manager)
    console.log("\n2. Manager sign-up");
    await page.goto(`${BASE}/signup`);
    await page.waitForLoadState("networkidle");
    await screenshot(page, "02-signup");

    // Fill first name (placeholder "First name")
    await page.fill('input[placeholder="First name"]', "UI");
    await page.fill('input[placeholder="Last name"]', "Tester");
    await page.fill('input[type="email"]', MGR_EMAIL);
    await page.fill('input[placeholder*="password" i]', MGR_PASS);

    // Check the terms checkbox
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible()) {
      await checkbox.check();
    } else {
      // Might be a custom checkbox — click the wrapper
      await page.locator('label, span', { hasText: /agree/i }).first().click();
    }

    await screenshot(page, "03-signup-filled");

    // Submit — button text is "Create account"
    await page.click('button:has-text("Create account")');
    await page.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });
    console.log("   Signed up and landed on dashboard:", page.url());
    await page.waitForLoadState("networkidle");
    await screenshot(page, "04-dashboard");

    // 3. Tasks
    console.log("\n3. Tasks page");
    await page.click('a[href="/tasks"]');
    await page.waitForURL(`${BASE}/tasks`);
    await page.waitForLoadState("networkidle");
    await screenshot(page, "05-tasks");

    // Try to create a task
    const addTaskBtn = page.locator('button', { hasText: /add task|new task|\+ task/i }).first();
    if (await addTaskBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addTaskBtn.click();
      await page.waitForTimeout(600);
      await screenshot(page, "06-task-modal");

      const titleInput = page.locator('input[placeholder*="title" i], input[name="title"]').first();
      if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await titleInput.fill("Foundation pour — Block A");
      }
      const saveBtn = page.locator('button', { hasText: /save|create|add/i }).last();
      if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(800);
      }
      await screenshot(page, "07-task-after-create");
    } else {
      console.log("   No visible 'Add Task' button, skipping creation");
    }

    // 4. Projects
    console.log("\n4. Projects page");
    await page.click('a[href="/projects"]');
    await page.waitForURL(`${BASE}/projects`);
    await page.waitForLoadState("networkidle");
    await screenshot(page, "08-projects");

    // 5. Workers
    console.log("\n5. Workers page");
    await page.click('a[href="/workers"]');
    await page.waitForURL(`${BASE}/workers`);
    await page.waitForLoadState("networkidle");
    await screenshot(page, "09-workers");

    // 6. Calendar
    console.log("\n6. Calendar page");
    await page.click('a[href="/calendar"]');
    await page.waitForURL(`${BASE}/calendar`);
    await page.waitForLoadState("networkidle");
    await screenshot(page, "10-calendar");

    // 7. Reports
    console.log("\n7. Reports page");
    await page.click('a[href="/reports"]');
    await page.waitForURL(`${BASE}/reports`);
    await page.waitForLoadState("networkidle");
    await screenshot(page, "11-reports");

    // 8. Analytics
    console.log("\n8. Analytics page");
    await page.click('a[href="/analytics"]');
    await page.waitForURL(`${BASE}/analytics`);
    await page.waitForLoadState("networkidle");
    await screenshot(page, "12-analytics");

    // 9. Settings
    console.log("\n9. Settings page");
    await page.click('a[href="/settings"]');
    await page.waitForURL(`${BASE}/settings`);
    await page.waitForLoadState("networkidle");
    await screenshot(page, "13-settings");

    console.log("\n=== All pages visited successfully ===");
    console.log(`Screenshots saved to: test-screenshots/`);

  } catch (err) {
    console.error("\nERROR:", err.message);
    await screenshot(page, "error-state").catch(() => {});
    process.exitCode = 1;
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

run();
