#!/usr/bin/env ts-node
/**
 * Interactive Character.AI session initializer.
 *
 * Launches a visible Chromium browser so you can log in manually.
 * Once you are logged in, press Enter in this terminal to save the session.
 *
 * Usage:
 *   npm run auth:character-ai
 */

import { chromium } from "playwright";
import * as fs from "fs/promises";
import * as path from "path";

const AUTH_DIR = path.join(process.cwd(), ".auth");
const STATE_PATH = path.join(AUTH_DIR, "character-ai.json");

function waitForEnter(msg: string): Promise<void> {
  process.stdout.write(msg);
  return new Promise((resolve) => {
    const handler = () => {
      process.stdin.removeListener("data", handler);
      process.stdin.pause();
      resolve();
    };
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.once("data", handler);
  });
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║   Character.AI Session Initializer                  ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  await fs.mkdir(AUTH_DIR, { recursive: true });

  console.log("→ Launching Chromium browser...\n");

  const browser = await chromium.launch({
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--host-resolver-rules=MAP character.ai 104.18.223.226,MAP *.character.ai 104.18.223.226",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  try {
    await page.goto("https://character.ai/", { waitUntil: "networkidle", timeout: 30000 });
  } catch {
    console.log("⚠  Page load timed out — continuing anyway.");
  }

  console.log("────────────────────────────────────────────────────────");
  console.log("  Browser is open. Log in to character.ai now.");
  console.log("  Use Google, Apple, or email-link — whatever is shown.");
  console.log("────────────────────────────────────────────────────────\n");

  await waitForEnter("  When you are fully logged in, press Enter here to save the session...");

  console.log("\n→ Saving session to " + STATE_PATH + " ...");

  try {
    await context.storageState({ path: STATE_PATH });
    const stat = await fs.stat(STATE_PATH);
    console.log("✓ Session saved! (" + stat.size + " bytes)");
    console.log("✓ File: " + STATE_PATH);
    console.log("\n  You can now close the browser and run automation.\n");
  } catch (err) {
    console.error("✗ Failed to save session:", err);
    await browser.close();
    process.exit(1);
  }

  await browser.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

