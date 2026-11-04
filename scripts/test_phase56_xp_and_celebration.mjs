import { chromium } from '../apps/web-ide/node_modules/playwright/index.mjs';

const ARTIFACT_DIR = 'C:/Users/jafar/.gemini/antigravity/brain/2af38d14-d298-4b64-a405-c3f56d7bd272';

async function run() {
  console.log('🚀 Starting Phase 56 XP, Progression & Celebration E2E Tests...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  try {
    // 1. Load initial page
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log('✓ Page loaded.');

    // 2. Verify Initial User Alpha (Level 1, BEAM Newcomer, 0 XP)
    await page.waitForSelector('#role-badge', { timeout: 5000 });
    const initialRole = await page.textContent('#role-badge');
    console.log(`Initial role badge: "${initialRole?.trim()}"`);
    if (!initialRole?.includes('BEAM Newcomer') || !initialRole?.includes('Lv1')) {
      throw new Error(`Expected Level 1 BEAM Newcomer, got: ${initialRole}`);
    }

    // 3. Switch to User Beta via Dropdown
    await page.click('#user-switcher-btn');
    await page.waitForTimeout(500);
    await page.waitForSelector('#switch-user-user_beta', { timeout: 5000 });
    await page.click('#switch-user-user_beta');
    await page.waitForFunction(() => {
      const el = document.querySelector('#role-badge');
      return el && el.textContent && el.textContent.includes('Concurrency Artisan');
    }, { timeout: 10000 });

    const betaRole = await page.textContent('#role-badge');
    console.log(`Beta role badge: "${betaRole?.trim()}"`);

    // 4. Switch to User Master
    await page.click('#user-switcher-btn');
    await page.waitForTimeout(500);
    await page.waitForSelector('#switch-user-user_master', { timeout: 5000 });
    await page.click('#switch-user-user_master');
    await page.waitForFunction(() => {
      const el = document.querySelector('#role-badge');
      return el && el.textContent && el.textContent.includes('BEAM Grandmaster');
    }, { timeout: 10000 });

    const masterRole = await page.textContent('#role-badge');
    console.log(`Master role badge: "${masterRole?.trim()}"`);

    // Take screenshot of Grandmaster Topbar & Workspace
    await page.screenshot({ path: `${ARTIFACT_DIR}/playwright_xp_grandmaster.png` });
    console.log('✓ Saved playwright_xp_grandmaster.png');

    // Let's click the role-badge to open Trophy shelf and inspect badges
    await page.locator('#role-badge').click();
    await page.waitForSelector('text=Badges & Trophies', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(600);
    console.log('✓ Leaderboard Drawer opened to Badges Shelf.');

    // Inspect first badge card: Functional Pioneer
    await page.locator('#badge-card-badge_ch01').click();
    await page.waitForSelector('#copy-badge-btn', { state: 'visible', timeout: 5000 });

    // Modal should be open
    const modalTitle = await page.textContent('#celebration-badge-title');
    console.log(`Celebration Modal Title: "${modalTitle?.trim()}"`);
    if (!modalTitle?.includes('Functional Pioneer')) {
      throw new Error(`Expected Functional Pioneer, got: ${modalTitle}`);
    }

    // Take screenshot of modal
    await page.screenshot({ path: `${ARTIFACT_DIR}/playwright_celebration_modal_verified.png` });
    console.log('✓ Saved playwright_celebration_modal_verified.png');

    // 6. Test Copy Share Card
    await page.locator('#copy-badge-btn').click();
    await page.waitForSelector('text=Copied Card!', { state: 'visible', timeout: 5000 });
    console.log('✓ Copy action confirmed with "Copied Card!" visual feedback');

    // Close modal
    await page.locator('button:has-text("Done")').click();
    await page.waitForTimeout(400);

    console.log('\n🎉 ALL E2E TESTS PASSED CLEANLY WITH ZERO ERRORS!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
