import { chromium } from '../apps/web-ide/node_modules/playwright/index.mjs';

const ARTIFACTS_DIR = 'C:/Users/jafar/.gemini/antigravity/brain/2af38d14-d298-4b64-a405-c3f56d7bd272';

async function run() {
  console.log('[Test] Launching Playwright browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();

  console.log('[Test] Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });

  // 1. Switch to user_beta (Intermediate with 1450 XP and Ch 1-5 completed)
  console.log('[Test] Switching to user_beta...');
  await page.locator('#user-switcher-btn').click();
  await page.waitForSelector('#user-switcher-menu', { state: 'visible', timeout: 5000 });
  await page.locator('#user-switcher-menu button:has-text("Beta Learner")').click();
  await page.waitForTimeout(1000);

  // 2. Click the Role badge inside Settings to directly open Badges & Trophies Shelf
  console.log('[Test] Clicking Role Badge inside Settings to open Badges Drawer...');
  await page.locator('#settings-dropdown-btn').click();
  await page.waitForSelector('#role-badge', { state: 'visible', timeout: 5000 });
  await page.locator('#role-badge').click();
  await page.waitForSelector('text=Badges & Trophies', { state: 'visible', timeout: 5000 });
  await page.waitForTimeout(600);

  // Take screenshot of Badges Shelf
  await page.screenshot({ path: `${ARTIFACTS_DIR}/playwright_badges_shelf.png` });
  console.log('[Test] Saved playwright_badges_shelf.png');

  // 3. Test Filter Pills
  console.log('[Test] Testing Badges Filter Pills...');
  await page.locator('#badge-filter-unlocked').click();
  await page.waitForTimeout(300);
  const unlockedCards = await page.locator('button[id^="badge-card-"]').count();
  console.log(`  - Unlocked badges count: ${unlockedCards}`);
  if (unlockedCards === 0) throw new Error('Expected user_beta to have unlocked badges!');

  await page.locator('#badge-filter-all').click();
  await page.waitForTimeout(300);

  // 4. Click an Unlocked Badge to open LeetCode-Style Shareable Modal
  console.log('[Test] Clicking unlocked badge "Functional Pioneer"...');
  await page.locator('#badge-card-badge_ch01').click();
  await page.waitForSelector('#copy-badge-btn', { state: 'visible', timeout: 5000 });

  await page.screenshot({ path: `${ARTIFACTS_DIR}/playwright_badge_modal_unlocked.png` });
  console.log('[Test] Saved playwright_badge_modal_unlocked.png');

  // Test Copy Share Card
  console.log('[Test] Clicking Share Badge (Copy Card)...');
  await page.locator('#copy-badge-btn').click();
  await page.waitForSelector('text=Copied Card!', { state: 'visible', timeout: 5000 });
  console.log('  - Copy action confirmed with "Copied Card!" visual feedback');

  // Close modal
  await page.locator('button:has-text("Done")').click();
  await page.waitForTimeout(400);

  // 5. Click a Locked Badge
  console.log('[Test] Clicking locked badge "BEAM Grandmaster" (Ch 12 Capstone)...');
  await page.locator('#badge-card-badge_ch12').click();
  await page.waitForSelector('button:has-text("Back to Exercises")', { state: 'visible', timeout: 5000 });

  await page.screenshot({ path: `${ARTIFACTS_DIR}/playwright_badge_modal_locked.png` });
  console.log('[Test] Saved playwright_badge_modal_locked.png');

  // Close locked modal
  await page.locator('button:has-text("Back to Exercises")').click();
  await page.waitForTimeout(400);

  // 6. Switch to Rankings Tab inside the same drawer
  console.log('[Test] Switching to Rankings Tab in Drawer...');
  await page.locator('#drawer-tab-rankings').click();
  await page.waitForSelector('text=Global Leaderboard', { state: 'visible', timeout: 5000 });
  console.log('  - Switched seamlessly between Badges and Rankings tabs');

  // Close Drawer
  await page.locator('button[title="Refresh Leaderboard"] + button').click();
  await page.waitForTimeout(400);

  console.log('\n[PASS] All Phase 55 Badges & Trophies tests passed cleanly!');
  await browser.close();
}

run().catch((err) => {
  console.error('[FAIL]', err);
  process.exit(1);
});
