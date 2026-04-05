/**
 * Automated screenshot capture for AURELION key screens.
 * Uses Puppeteer to navigate to each page and take full-page screenshots.
 *
 * Usage: node scripts/take-screenshots.mjs
 * Output: screenshots/*.png + screenshots.zip in project root
 */

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const BASE = "http://localhost:3000";
const OUT_DIR = path.resolve("screenshots");
const VIEWPORT = { width: 1440, height: 900 };

const pages = [
  { name: "01-homepage", path: "/", desc: "Homepage (logged out)" },
  { name: "02-activities", path: "/activities", desc: "Activity listing" },
  { name: "03-activity-detail", path: "/activities/16", desc: "Activity detail (Jeep Safari)" },
  { name: "04-pricing", path: "/pricing", desc: "Pricing / tier upgrade" },
  { name: "05-login", path: "/auth/login", desc: "Login page" },
  { name: "06-register", path: "/auth/register", desc: "Register page" },
  { name: "07-about", path: "/about", desc: "About page" },
];

// Pages that need auth
const authPages = [
  { name: "08-dashboard", path: "/dashboard", desc: "User dashboard" },
  { name: "09-itinerary-new", path: "/itineraries/new", desc: "Create itinerary" },
];

async function run() {
  // Clean and create output dir
  if (fs.existsSync(OUT_DIR)) fs.rmSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    defaultViewport: VIEWPORT,
  });

  const page = await browser.newPage();

  // Wait helper — waits for network idle + a small extra delay for renders
  async function snap(name, url, desc) {
    console.log(`  Capturing: ${desc} (${url})`);
    await page.goto(`${BASE}${url}`, { waitUntil: "networkidle2", timeout: 15000 });
    // Extra wait for React hydration and lazy-loaded content
    await new Promise((r) => setTimeout(r, 1500));
    const file = path.join(OUT_DIR, `${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`    -> ${name}.png`);
  }

  // --- Public pages (no auth needed) ---
  console.log("\nCapturing public pages...");
  for (const p of pages) {
    await snap(p.name, p.path, p.desc);
  }

  // --- Register a test user and log in for auth pages ---
  console.log("\nRegistering test user for auth pages...");
  const testEmail = `screenshot-${Date.now()}@test.com`;
  try {
    await page.goto(`${BASE}/auth/register`, { waitUntil: "networkidle2", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Fill out registration form
    // Find form inputs by their labels/placeholders
    const nameInput = await page.$('input[name="name"]') || await page.$('input[placeholder*="name" i]') || (await page.$$('input[type="text"]'))[0];
    const emailInput = await page.$('input[name="email"]') || await page.$('input[type="email"]');
    const passwordInput = await page.$('input[name="password"]') || await page.$('input[type="password"]');

    if (nameInput && emailInput && passwordInput) {
      await nameInput.type("Screenshot User");
      await emailInput.type(testEmail);
      await passwordInput.type("testpassword123");

      // Submit the form
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await new Promise((r) => setTimeout(r, 2000));
        console.log("  Registered and logged in as: " + testEmail);
      }
    } else {
      console.log("  Could not find form inputs, trying API registration...");
      // Fallback: register via API and set cookie
      await page.evaluate(async (email) => {
        await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Screenshot User", email, password: "testpassword123" }),
        });
      }, testEmail);
      await new Promise((r) => setTimeout(r, 1000));
      console.log("  Registered via API as: " + testEmail);
    }
  } catch (err) {
    console.log("  Registration failed, continuing without auth:", err.message);
  }

  // --- Auth pages ---
  console.log("\nCapturing authenticated pages...");
  for (const p of authPages) {
    await snap(p.name, p.path, p.desc);
  }

  await browser.close();

  // --- Create ZIP ---
  console.log("\nCreating ZIP archive...");
  const zipPath = path.resolve("screenshots.zip");
  try {
    // Try PowerShell Compress-Archive (Windows)
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    execSync(
      `powershell -Command "Compress-Archive -Path '${OUT_DIR}\\*' -DestinationPath '${zipPath}' -Force"`,
      { stdio: "pipe" }
    );
    console.log(`  -> screenshots.zip (${(fs.statSync(zipPath).size / 1024).toFixed(0)} KB)`);
  } catch {
    console.log("  ZIP creation failed — screenshots are in ./screenshots/ folder");
  }

  // Summary
  const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith(".png"));
  console.log(`\nDone! ${files.length} screenshots captured:`);
  files.forEach((f) => {
    const size = (fs.statSync(path.join(OUT_DIR, f)).size / 1024).toFixed(0);
    console.log(`  ${f} (${size} KB)`);
  });
}

run().catch((err) => {
  console.error("Screenshot script failed:", err);
  process.exit(1);
});
