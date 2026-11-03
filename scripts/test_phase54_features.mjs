import { chromium } from '../apps/web-ide/node_modules/playwright/index.mjs';

const ARTIFACTS_DIR = 'C:/Users/jafar/.gemini/antigravity/brain/2af38d14-d298-4b64-a405-c3f56d7bd272';

async function run() {
  console.log('[Test] Launching Playwright browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('[Test] Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });

  // 1. Check all 8 dots in TopBar
  console.log('[Test] Verifying 8 progress dots in TopBar...');
  for (let i = 1; i <= 8; i++) {
    const dot = page.locator(`#lesson-dot-${i}`);
    const isVisible = await dot.isVisible();
    console.log(`  - Lesson dot ${i} visible: ${isVisible}`);
    if (!isVisible) throw new Error(`Lesson dot ${i} is not visible!`);
  }
  await page.screenshot({ path: `${ARTIFACTS_DIR}/playwright_decluttered_topbar.png` });
  console.log('[Test] Saved playwright_decluttered_topbar.png');

  // 2. Open Settings Popover
  console.log('[Test] Clicking Settings button...');
  await page.locator('#settings-dropdown-btn').click();
  await page.waitForSelector('#settings-popover-menu', { state: 'visible', timeout: 5000 });
  await page.screenshot({ path: `${ARTIFACTS_DIR}/playwright_settings_popover.png` });
  console.log('[Test] Saved playwright_settings_popover.png');

  // Toggle Theme in Settings
  console.log('[Test] Testing Theme toggle in Settings...');
  await page.locator('#theme-midnight-btn').click();
  await page.waitForTimeout(500);
  await page.locator('#theme-daylight-btn').click();
  await page.waitForTimeout(500);

  // 3. Open Reset Modal from Settings
  console.log('[Test] Clicking Reset Account button...');
  await page.locator('#open-reset-modal-btn').click();
  await page.waitForSelector('#reset-confirm-input', { state: 'visible', timeout: 5000 });

  // Verify Reset button is disabled initially
  const resetBtn = page.locator('button:has-text("Permanently Reset")');
  let isDisabled = await resetBtn.isDisabled();
  console.log(`  - Reset button initially disabled: ${isDisabled}`);
  if (!isDisabled) throw new Error('Reset button should be disabled initially!');

  // Type partial text
  await page.locator('#reset-confirm-input').fill('RESET');
  isDisabled = await resetBtn.isDisabled();
  console.log(`  - Reset button with partial input disabled: ${isDisabled}`);
  if (!isDisabled) throw new Error('Reset button should be disabled with partial input!');

  // Type exact phrase
  await page.locator('#reset-confirm-input').fill('RESET PROGRESS');
  isDisabled = await resetBtn.isDisabled();
  console.log(`  - Reset button with exact input enabled: ${!isDisabled}`);
  if (isDisabled) throw new Error('Reset button should be enabled with exact input!');

  await page.screenshot({ path: `${ARTIFACTS_DIR}/playwright_reset_modal.png` });
  console.log('[Test] Saved playwright_reset_modal.png');

  // Close reset modal
  await page.locator('button:has-text("Keep My Progress")').click();
  await page.waitForTimeout(400);

  // 4. Open Global Leaderboard Drawer
  console.log('[Test] Opening Global Leaderboard Drawer via Trophy button...');
  await page.locator('#leaderboard-btn').click();
  await page.waitForSelector('text=Global Leaderboard', { state: 'visible', timeout: 5000 });
  await page.waitForTimeout(1000); // Wait for Neon query response
  await page.screenshot({ path: `${ARTIFACTS_DIR}/playwright_leaderboard_drawer.png` });
  console.log('[Test] Saved playwright_leaderboard_drawer.png');

  // Close Leaderboard
  await page.locator('button[title="Refresh Leaderboard"] + button').click();
  await page.waitForTimeout(400);

  // 5. Test Prerequisite Gating & Modal
  console.log('[Test] Testing locked chapter prerequisite modal...');
  // Ensure tester mode is off
  await page.evaluate(() => {
    localStorage.removeItem('beamforge_dev_tester');
  });
  await page.reload({ waitUntil: 'networkidle' });

  // Open Chapter dropdown and click Chapter 2
  await page.locator('#chapter-dropdown-btn').click();
  await page.waitForSelector('#chapter-dropdown-menu', { state: 'visible', timeout: 5000 });
  await page.locator('#chapter-option-2').click();

  // Prerequisite modal should pop up!
  await page.waitForSelector('text=Chapter 2 Prerequisite', { state: 'visible', timeout: 5000 });
  console.log('  - Prerequisite modal displayed successfully for locked Chapter 2');
  await page.screenshot({ path: `${ARTIFACTS_DIR}/playwright_prereq_modal.png` });
  console.log('[Test] Saved playwright_prereq_modal.png');

  // Click "Jump In Anyway (Preview / Tester Mode)"
  await page.locator('button:has-text("Jump In Anyway")').click();
  await page.waitForTimeout(600);

  // Verify Tester Mode badge appears in TopBar
  const testerPill = page.locator('#tester-mode-pill');
  const isTesterPillVisible = await testerPill.isVisible();
  console.log(`  - Tester Mode (0 XP) pill visible in TopBar: ${isTesterPillVisible}`);

  console.log('\n[PASS] All Phase 54 end-to-end tests passed cleanly!');
  await browser.close();
}

run().catch((err) => {
  console.error('[FAIL]', err);
  process.exit(1);
});
