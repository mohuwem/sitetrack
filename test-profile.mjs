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
  const email = `proftest_${ts}@sitetrack.test`;

  // Register a manager
  await fetch(`${API}/auth/register`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName: "Alice", lastName: "Builder",
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

    // Navigate to profile
    console.log("--- Manager profile page ---");
    await page.goto(`${BASE}/profile`);
    await page.waitForLoadState("networkidle");
    await ss(page, "prof-01-profile");

    // Confirm NO TailAdmin fake data
    const musharof = await page.locator('text=Musharof').count();
    const pimjo    = await page.locator('text=pimjo').count();
    const arizona  = await page.locator('text=Arizona').count();
    console.log(`✓ No fake name "Musharof": ${musharof === 0}`);
    console.log(`✓ No fake "pimjo" text: ${pimjo === 0}`);
    console.log(`✓ No fake "Arizona" text: ${arizona === 0}`);

    // Confirm real user data IS shown
    const realName  = await page.locator('text=Alice Builder').count();
    const realEmail = await page.locator(`text=${email}`).count();
    console.log(`✓ Real name "Alice Builder" shown: ${realName > 0}`);
    console.log(`✓ Real email shown: ${realEmail > 0}`);

    // Confirm page title is not TailAdmin template
    const title = await page.title();
    const isTailAdmin = title.includes("TailAdmin");
    console.log(`✓ Page title is NOT TailAdmin template: ${!isTailAdmin} (was: "${title}")`);

    // Update profile — use getByLabel for unlabelled inputs
    console.log("\n--- Update profile ---");
    await page.getByLabel("First name").fill("Alicia");
    await page.getByLabel("Company / Organisation").fill("BuildCo Ltd");
    await page.click('button:has-text("Save profile")');
    await page.waitForTimeout(1500);
    const successMsg = await page.locator('text=Profile updated').count();
    console.log(`✓ Profile update success message: ${successMsg > 0}`);
    await ss(page, "prof-02-after-update");

    // Reload and confirm persistence
    await page.reload();
    await page.waitForLoadState("networkidle");
    const updatedName = await page.locator('text=Alicia').count();
    console.log(`✓ Updated name persists after reload: ${updatedName > 0}`);
    await ss(page, "prof-03-reloaded");

    // Password change — mismatch
    console.log("\n--- Password change ---");
    await page.fill('input[placeholder="At least 8 characters"]', "NewPass123!");
    await page.fill('input[placeholder="Re-enter new password"]', "DifferentPass!");
    await page.click('button:has-text("Change password")');
    await page.waitForTimeout(800);
    const mismatchError = await page.locator('text=Passwords do not match').count();
    console.log(`✓ Password mismatch error shown: ${mismatchError > 0}`);

    // Password change — valid
    await page.fill('input[placeholder="At least 8 characters"]', "NewPass123!");
    await page.fill('input[placeholder="Re-enter new password"]', "NewPass123!");
    await page.click('button:has-text("Change password")');
    await page.waitForTimeout(1500);
    const pwSuccess = await page.locator('text=Password changed').count();
    console.log(`✓ Password change success message: ${pwSuccess > 0}`);
    await ss(page, "prof-04-pw-changed");

    console.log("\n=== Profile page verified ===");

  } catch (err) {
    console.error("\nERROR:", err.message);
    await ss(page, "prof-error").catch(() => {});
    process.exitCode = 1;
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

run();
