import { chromium, Browser } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
const envFiles = [".env.local", ".env"];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["\x27]|["\x27]$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const SCREENSHOT_DIR = "/home/ilhammu29/.gemini/antigravity-cli/brain/09fbc8b1-9091-4328-9c26-313cfc6ee195/qa";

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

interface QACheckResult {
  category: string;
  route: string;
  viewport: number;
  scrollWidth: number;
  innerWidth: number;
  status: "PASS" | "FAIL";
  notes?: string;
}

const results: QACheckResult[] = [];

async function getAuthCookie() {
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: linkData } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: "ilhammaulana29000@gmail.com",
  });

  const hashedToken = linkData?.properties?.hashed_token;
  if (!hashedToken) throw new Error("Failed to get magic link token");

  const { data: verifyData } = await anonClient.auth.verifyOtp({
    token_hash: hashedToken,
    type: "magiclink",
  });

  if (!verifyData.session) throw new Error("Failed to verify auth session");

  const sessionRaw = JSON.stringify(verifyData.session);
  return `base64-${Buffer.from(sessionRaw).toString("base64")}`;
}

async function testPageAtViewport(
  browser: Browser,
  category: string,
  route: string,
  width: number,
  cookieValue?: string,
  saveScreenshot = false
) {
  const context = await browser.newContext({
    viewport: { width, height: 850 },
    deviceScaleFactor: 1,
  });

  if (cookieValue) {
    await context.addCookies([
      {
        name: "sb-wbqaazqcizolicowwnwh-auth-token",
        value: cookieValue,
        domain: "localhost",
        path: "/",
      },
    ]);
  }

  const page = await context.newPage();
  try {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(400);

    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
      const innerWidth = window.innerWidth;
      return {
        scrollWidth,
        innerWidth,
        hasOverflow: scrollWidth > innerWidth,
      };
    });

    const isPass = !metrics.hasOverflow;
    results.push({
      category,
      route,
      viewport: width,
      scrollWidth: metrics.scrollWidth,
      innerWidth: metrics.innerWidth,
      status: isPass ? "PASS" : "FAIL",
      notes: isPass ? "Zero overflow" : `Overflow by ${metrics.scrollWidth - metrics.innerWidth}px`,
    });

    console.log(
      `  [${isPass ? "PASS" : "FAIL"}] ${category} (${route}) @ ${width}px: scrollWidth=${metrics.scrollWidth}, innerWidth=${metrics.innerWidth}`
    );

    if (saveScreenshot) {
      const safeName = `${category.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${width}.png`;
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, safeName), fullPage: false });
    }
  } catch (err: any) {
    results.push({
      category,
      route,
      viewport: width,
      scrollWidth: 0,
      innerWidth: width,
      status: "FAIL",
      notes: err.message,
    });
    console.error(`  [FAIL] ${category} @ ${width}px error:`, err.message);
  } finally {
    await context.close();
  }
}

async function runFullVisualQA() {
  console.log("=== OXID Ledger Comprehensive Visual QA & Responsive Audit ===\n");
  const browser = await chromium.launch({ headless: true });

  // 1. Landing Page
  console.log("--- 1. LANDING PAGE (/) ---");
  for (const w of [320, 390, 430, 768, 1440]) {
    await testPageAtViewport(browser, "LANDING", "/", w, undefined, true);
  }

  // 2. Login Page
  console.log("\n--- 2. LOGIN PAGE (/login) ---");
  for (const w of [320, 390, 1440]) {
    await testPageAtViewport(browser, "LOGIN", "/login", w, undefined, true);
  }

  // 3. Signup Page
  console.log("\n--- 3. SIGNUP PAGE (/signup) ---");
  for (const w of [320, 390, 1440]) {
    await testPageAtViewport(browser, "SIGNUP", "/signup", w, undefined, true);
  }

  // 4. Authenticated Setup
  console.log("\n--- 4. Authenticated Pages (Merchant & Admin) ---");
  const cookieValue = await getAuthCookie();

  // Onboarding
  console.log("-> Testing Onboarding (/onboarding)...");
  for (const w of [320, 390, 1440]) {
    await testPageAtViewport(browser, "ONBOARDING", "/onboarding", w, cookieValue, true);
  }

  // Dashboard Overview
  console.log("-> Testing Dashboard Overview (/dashboard)...");
  for (const w of [320, 390, 430, 768, 1024, 1440]) {
    await testPageAtViewport(browser, "DASHBOARD", "/dashboard", w, cookieValue, true);
  }

  // Complete Analytics (10 Charts)
  console.log("-> Testing Complete Analytics (/dashboard/analytics)...");
  for (const w of [320, 390, 430, 768, 1440]) {
    await testPageAtViewport(browser, "ANALYTICS", "/dashboard/analytics", w, cookieValue, true);
  }

  // Admin Overview
  console.log("-> Testing Admin Overview (/admin)...");
  for (const w of [320, 390, 430, 768, 1024, 1440]) {
    await testPageAtViewport(browser, "ADMIN", "/admin", w, cookieValue, true);
  }

  // Reports (P&L, Balance Sheet, Cash Flow)
  console.log("-> Testing Reports (/dashboard/reports/*)...");
  for (const w of [390, 768, 1440]) {
    await testPageAtViewport(browser, "REPORT_PNL", "/dashboard/reports/profit-loss", w, cookieValue, true);
    await testPageAtViewport(browser, "REPORT_BS", "/dashboard/reports/balance-sheet", w, cookieValue, true);
    await testPageAtViewport(browser, "REPORT_CF", "/dashboard/reports/cash-flow", w, cookieValue, true);
  }

  await browser.close();

  console.log("\n========================================================");
  console.log("             VISUAL QA AUDIT SUMMARY REPORT             ");
  console.log("========================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  console.log(`TOTAL AUDITED: ${total} | PASSED: ${passed} | FAILED: ${failed}`);

  if (failed > 0) {
    console.error("\nFAILURES DETECTED:");
    for (const f of results.filter((r) => r.status === "FAIL")) {
      console.error(`- ${f.category} (${f.route}) @ ${f.viewport}px: ${f.notes}`);
    }
    process.exit(1);
  } else {
    console.log("\n>>> ALL PAGES & VIEWPORTS (320px - 1440px) CONFIRMED 100% RESPONSIVE WITH ZERO HORIZONTAL OVERFLOW <<<");
  }
}

runFullVisualQA().catch((err) => {
  console.error("Visual QA failed:", err);
  process.exit(1);
});
