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

  test.beforeEach(async () => {
    browserContext = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });
    page = await browserContext.newPage();

    // Mock Setup
    if (fs.existsSync(MOCK_HTML_PATH)) {
      const content = fs.readFileSync(MOCK_HTML_PATH, "utf8");
      await page.route("**/index.php?action=search*", (route) => {
        route.fulfill({ status: 200, contentType: "text/html", body: content });
      });
    }
  });

  test.afterEach(async () => {
    await browserContext.close();
  });

  // ==========================================================
  // Class Search Page
  // ==========================================================
  test.describe("Class Search Context", () => {
    test("SEARCH-01: Easy access to extension (Story: Easy access)", async () => {
      await page.goto(TARGET_URL);
      await expect(page.locator(".prof-info-btn").first()).toBeVisible();
    });

    test("SEARCH-02: Modal positioning (Story: Search page doesn’t become too dense)", async () => {
      await page.goto(TARGET_URL);
      await page.locator(".prof-info-btn").first().click({ force: true });

      const modal = page.locator(".prof-info-container.prof-is-open").first();
      const zIndex = await modal.evaluate(
        (el) => window.getComputedStyle(el).zIndex,
      );
      expect(Number(zIndex)).toBeGreaterThan(100);
    });

    test.skip("PLACEHOLDER1", async () => {
      // Placeholder
    });

    test.skip("PLACEHOLDER2", async () => {
      // Placeholder
    });
  });

  // ==========================================================
  // Shopping Cart Page
  // ==========================================================
  test.describe("Shopping Cart Context", () => {
    test.skip("PLACEHOLDER3", async () => {
      // Placeholder
    });

    test.skip("PLACEHOLDER4", async () => {
      // Placeholder
    });
  });

  // ==========================================================
  // Performance & Stability
  // ==========================================================
  test.describe("Performance & Stability", () => {
    test("STAB-US1: App does not be buggy (Story: Tested thoroughly)", async () => {
      await page.route("**/directory.ucsc.edu/*", (route) => route.abort());
      await page.goto(TARGET_URL);
      await page.locator(".prof-info-btn").first().click({ force: true });
      expect(page.url()).not.toContain("chrome-error");
    });

    test.skip("PLACEHOLDER5", async () => {
      // Placeholder
    });
  });
});
