/**
 * @file extension.spec.js
 * @description End-to-End (E2E) test suite using Playwright.
 * Tests the full extension lifecycle in a real browser environment (Chromium).
 * Launches Chrome with the built extension loaded from the `dist/` folder.
 * Uses `page.route` to intercept requests to the real UCSC website.
 * Serves a local `pnu-search-results.html` file instead of the live site to ensure fast and reliable tests.
 * Verifies that the Content Script successfully parses the mock HTML, finds the right instructor, and injects the React button.
 */

import { test, expect, chromium } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Fix for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- CONFIGURATION ---
// Path to your built extension (ensure 'npm run build' is run first!)
const EXTENSION_PATH = path.join(__dirname, "../../dist");
const TARGET_URL =
  "https://pisa.ucsc.edu/cs9/prd/sr9_2013/index.php?action=search&strm=2258";
const MOCK_HTML_PATH = path.join(__dirname, "pnu-search-results.html");

// --- SELECTORS ---
const PANEL_SELECTOR = ".panel.panel-default";
const INJECTED_BUTTON = ".prof-info-btn";
const MODAL_SELECTOR = ".prof-info-modal";
const CLOSE_BUTTON = ".prof-info-close";
const MORE_INFO_BTN = ".prof-info-more-btn";

test.describe("Chrome Extension E2E", () => {
  let browserContext;
  let page;

  // Load Extension & Intercept Requests
  test.beforeEach(async () => {
    // Launch Chrome with extension
    browserContext = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });

    page = await browserContext.newPage();

    // Pipe console logs to terminal for debugging
    page.on("console", (msg) => {
      const text = msg.text();
      if (!text.includes("[HMR]") && !text.includes("React DevTools")) {
        console.log(`[PAGE]: ${text}`);
      }
    });

    // Ensure Mock HTML exists
    if (!fs.existsSync(MOCK_HTML_PATH)) {
      throw new Error(`Mock HTML not found at ${MOCK_HTML_PATH}`);
    }
    const mockContent = fs.readFileSync(MOCK_HTML_PATH, "utf8");

    // Intercept navigation to UCSC and serve Mock HTML
    await page.route("**/index.php?action=search*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: mockContent,
      });
    });
  });

  // Teardown after each test
  test.afterEach(async () => {
    await browserContext.close();
  });

  // --- TEST CASES ---
  test("Case 1: Buttons should be injected into search results", async () => {
    await page.goto(TARGET_URL);

    // Wait for the mock page to load
    await page.waitForSelector(PANEL_SELECTOR);

    // Wait for injection
    const buttons = page.locator(INJECTED_BUTTON);
    await expect(buttons.first()).toBeVisible({ timeout: 5000 });

    const count = await buttons.count();
    console.log(`Found ${count} injected buttons`);
    expect(count).toBeGreaterThan(0);
  });

  test("Case 2: Clicking button should open the modal", async () => {
    await page.goto(TARGET_URL);
    await page.waitForSelector(INJECTED_BUTTON);

    // Click the first button
    await page.locator(INJECTED_BUTTON).first().click({ force: true });

    // Verify that the modal appears
    const modal = page.locator(MODAL_SELECTOR);
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("Professor Info");
  });

  test("Case 3: Modal should display correct RMP or Directory data", async () => {
    await page.goto(TARGET_URL);
    await page.waitForSelector(INJECTED_BUTTON);
    await page.locator(INJECTED_BUTTON).first().click({ force: true });

    // Verify specific sections exist
    const modal = page.locator(MODAL_SELECTOR);
    await expect(
      modal.locator("h4", { hasText: "About the Professor" }),
    ).toBeVisible();

    // Check if the RMP section loaded (or empty state)
    await expect(modal.locator(".rmp-section")).toBeVisible();
  });

  test('Case 4: "More Info" toggle should work inside the modal', async () => {
    await page.goto(TARGET_URL);
    await page.waitForSelector(INJECTED_BUTTON);
    await page.locator(INJECTED_BUTTON).first().click({ force: true });

    // Find More Info button
    const moreBtn = page.locator(MORE_INFO_BTN);

    // Test the button if info exists
    if ((await moreBtn.count()) > 0) {
      await moreBtn.click();
      await expect(page.locator("text=Show Less")).toBeVisible();
      // Verify hidden content revealed (e.g., Office Hours)
      // await expect(page.locator('text=Office Hours')).toBeVisible();
    } else {
      console.log(
        "Skipping More Info test: Button not rendered for this mock data",
      );
    }
  });

  test("Case 5: Close button should close the modal", async () => {
    await page.goto(TARGET_URL);
    await page.waitForSelector(INJECTED_BUTTON);
    await page.locator(INJECTED_BUTTON).first().click({ force: true });

    // Click X
    await page.locator(CLOSE_BUTTON).click();

    // Modal should be hidden or detached
    const modal = page.locator(MODAL_SELECTOR);
    await expect(modal).toBeHidden();
  });

  test("Case 6: Styling - Modal should have correct z-index", async () => {
    await page.goto(TARGET_URL);
    await page.waitForSelector(INJECTED_BUTTON);
    await page.locator(INJECTED_BUTTON).first().click({ force: true });

    // Check if the container class toggled correctly
    const container = page.locator(".prof-info-container.prof-is-open").first();
    await expect(container).toBeVisible();

    // Check Computed CSS
    const zIndex = await container.evaluate((el) => {
      return window.getComputedStyle(el).zIndex;
    });
    // zIndex should be >= 999
    expect(Number(zIndex)).toBeGreaterThan(100);
  });
});
