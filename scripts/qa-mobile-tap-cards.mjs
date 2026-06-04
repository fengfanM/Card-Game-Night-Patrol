#!/usr/bin/env node

import { createRequire } from "node:module";
import { existsSync } from "node:fs";

const DEFAULT_URL = "http://127.0.0.1:5173/";
const DEFAULT_CHROMIUM_EXECUTABLE =
  "/Users/bytedance/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const BUNDLED_PLAYWRIGHT_ROOT =
  "/Users/bytedance/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright-core@1.60.0/node_modules";

const HELP = `Usage: node scripts/qa-mobile-tap-cards.mjs [url]

Runs Night-Patrol card interaction smoke tests.

Arguments:
  url                         Target URL. Defaults to ${DEFAULT_URL}

Options:
  --url <url>                 Target URL.
  --help, -h                  Show this help.

Environment:
  PLAYWRIGHT_CHROMIUM_EXECUTABLE
                              Chromium executable path. Defaults to ${DEFAULT_CHROMIUM_EXECUTABLE}
`;

function parseArgs(argv) {
  const args = [...argv];
  let url = DEFAULT_URL;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") return { help: true, url };
    if (arg === "--url") {
      const value = args[index + 1];
      if (!value) throw new Error("--url requires a value");
      url = value;
      index += 1;
      continue;
    }
    if (arg.startsWith("--url=")) {
      url = arg.slice("--url=".length);
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
    url = arg;
  }

  return { help: false, url };
}

function loadPlaywrightCore() {
  const require = createRequire(import.meta.url);
  const paths = [process.cwd(), BUNDLED_PLAYWRIGHT_ROOT];
  const resolved = require.resolve("playwright-core", { paths });
  return require(resolved);
}

function chromiumExecutablePath() {
  return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || DEFAULT_CHROMIUM_EXECUTABLE;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForAppReady(page) {
  await page.goto(page.qaTargetUrl, { waitUntil: "domcontentloaded" });
  await page.locator(".title-view, .route-view, .combat-view").first().waitFor({ state: "visible", timeout: 20_000 });
}

async function startFirstCombat(page) {
  await waitForAppReady(page);

  const startButton = page.getByRole("button", { name: /开始夜巡/ });
  if (await startButton.count()) {
    await startButton.first().click();
  }

  await page.locator(".route-view").waitFor({ state: "visible", timeout: 20_000 });

  const firstNode = page.locator(".node-choice-grid .node-card, .map-node.available").first();
  await firstNode.waitFor({ state: "visible", timeout: 10_000 });
  await firstNode.click();

  await page.locator(".combat-view").waitFor({ state: "visible", timeout: 20_000 });
  await page.locator(".hand-fan .game-card").first().waitFor({ state: "visible", timeout: 20_000 });
}

function parseCurrentValue(text) {
  const match = String(text || "").match(/(\d+)\s*(?:\/|$)/);
  if (!match) throw new Error(`Could not parse numeric value from "${text}"`);
  return Number(match[1]);
}

async function enemyHp(page) {
  return parseCurrentValue(await page.locator(".enemy-panel .health-strip strong").first().innerText());
}

async function playerEnergy(page) {
  return parseCurrentValue(await page.locator(".energy-orb strong").first().innerText());
}

async function findPlayableAttackCard(page) {
  for (let turn = 0; turn < 3; turn += 1) {
    const attackCards = page.locator(".hand-fan .game-card.card-attack:not(:disabled)");
    if ((await attackCards.count()) > 0) return attackCards.first();

    const endTurn = page.locator(".end-turn");
    assert(await endTurn.count(), "No playable attack card and no end-turn button is available");
    await endTurn.click();
    await page.locator(".hand-fan .game-card").first().waitFor({ state: "visible", timeout: 10_000 });
  }

  throw new Error("No playable attack card appeared within three turns");
}

async function measureMobileScrollAndOverlap(page) {
  return page.locator(".hand-fan").evaluate((hand) => {
    const before = hand.scrollLeft;
    hand.scrollLeft = 300;
    const after = hand.scrollLeft;
    const cards = [...hand.querySelectorAll(".game-card")].map((card) => card.getBoundingClientRect());
    const overlaps = [];

    for (let index = 1; index < cards.length; index += 1) {
      const previous = cards[index - 1];
      const current = cards[index];
      overlaps.push(Math.max(0, Math.min(previous.right, current.right) - Math.max(previous.left, current.left)));
    }

    return {
      before,
      after,
      maxOverlap: overlaps.length ? Math.max(...overlaps) : 0,
      cardCount: cards.length,
    };
  });
}

async function runMobileTap(browser, url) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  page.qaTargetUrl = url;

  try {
    await startFirstCombat(page);

    const beforeHp = await enemyHp(page);
    const beforeEnergy = await playerEnergy(page);
    const attackCard = await findPlayableAttackCard(page);
    await attackCard.scrollIntoViewIfNeeded();
    await attackCard.click();

    await page.waitForFunction(
      ({ hp, energy }) => {
        const parse = (selector) => {
          const text = document.querySelector(selector)?.textContent || "";
          const match = text.match(/(\d+)\s*(?:\/|$)/);
          return match ? Number(match[1]) : NaN;
        };
        return parse(".enemy-panel .health-strip strong") < hp || parse(".energy-orb strong") < energy;
      },
      { hp: beforeHp, energy: beforeEnergy },
      { timeout: 3_000 },
    );

    return {
      beforeHp,
      afterHp: await enemyHp(page),
      beforeEnergy,
      afterEnergy: await playerEnergy(page),
    };
  } finally {
    await context.close();
  }
}

async function runMobileScroll(browser, url) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  page.qaTargetUrl = url;

  try {
    await startFirstCombat(page);
    const measurement = await measureMobileScrollAndOverlap(page);

    assert(measurement.after > measurement.before, `Expected .hand-fan scrollLeft to increase, got ${measurement.before} -> ${measurement.after}`);
    assert(measurement.maxOverlap === 0, `Expected adjacent mobile cards not to overlap, got ${measurement.maxOverlap}px`);

    return measurement;
  } finally {
    await context.close();
  }
}

async function runDesktopDrag(browser, url) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.qaTargetUrl = url;

  try {
    await startFirstCombat(page);

    await page.locator("canvas").first().waitFor({ state: "attached", timeout: 20_000 });

    const firstHandCardPosition = await page.locator(".hand-fan .game-card").first().evaluate((card) => getComputedStyle(card).position);
    assert(firstHandCardPosition === "absolute", `Expected desktop first hand card to be absolute, got ${firstHandCardPosition}`);

    const beforeHp = await enemyHp(page);
    const attackCard = await findPlayableAttackCard(page);
    const box = await attackCard.boundingBox();
    assert(box, "Playable attack card has no bounding box");

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(1080, 420, { steps: 12 });
    await page.mouse.up();

    await page.waitForFunction(
      (hp) => {
        const text = document.querySelector(".enemy-panel .health-strip strong")?.textContent || "";
        const match = text.match(/(\d+)\s*(?:\/|$)/);
        return match ? Number(match[1]) < hp : false;
      },
      beforeHp,
      { timeout: 5_000 },
    );

    return {
      canvas: true,
      firstHandCardPosition,
      beforeHp,
      afterHp: await enemyHp(page),
    };
  } finally {
    await context.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(HELP);
    return;
  }

  const executablePath = chromiumExecutablePath();
  assert(existsSync(executablePath), `Chromium executable does not exist: ${executablePath}`);

  const { chromium } = loadPlaywrightCore();
  const browser = await chromium.launch({ executablePath, headless: true });

  try {
    const mobileTap = await runMobileTap(browser, args.url);
    const mobileScroll = await runMobileScroll(browser, args.url);
    const desktopDrag = await runDesktopDrag(browser, args.url);
    process.stdout.write(JSON.stringify({ mobileTap, mobileScroll, desktopDrag }));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
