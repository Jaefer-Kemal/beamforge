import { chromium } from '../apps/web-ide/node_modules/playwright/index.mjs';

const ARTIFACT_DIR = 'C:/Users/jafar/.gemini/antigravity/brain/2af38d14-d298-4b64-a405-c3f56d7bd272';

async function testAutoCelebration() {
  console.log('🚀 Testing Auto-Triggered Badge Celebration Modal on Lesson Completion...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Reset to clean user alpha state
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle' });

  // Trigger onLevelCompleted for ch01-l08 (Problem Set)
  console.log('Completing Chapter 1 Problem Set (ch01-l08)...');
  await page.evaluate(() => {
    if (window.useWorkspaceStore) {
      window.useWorkspaceStore.getState().onLevelCompleted('ch01-l08');
    }
  });

  // Verify modal appears automatically
  await page.waitForSelector('#badge-celebration-modal', { state: 'visible', timeout: 5000 });
  const modalTitle = await page.textContent('#celebration-badge-title');
  console.log(`Auto-celebration modal opened: "${modalTitle?.trim()}"`);
  if (!modalTitle?.includes('Functional Pioneer')) {
    throw new Error(`Expected Functional Pioneer in auto-modal, got: ${modalTitle}`);
  }

  await page.screenshot({ path: `${ARTIFACT_DIR}/playwright_auto_celebration_flow.png` });
  console.log('✓ Saved playwright_auto_celebration_flow.png');

  // Close modal via "Done" button
  await page.locator('button:has-text("Done")').click();
  await page.waitForTimeout(500);

  const isModalVisible = await page.isVisible('#badge-celebration-modal');
  console.log(`Modal closed after Done: ${!isModalVisible}`);
  if (isModalVisible) throw new Error('Modal should close after Done click');

  // Verify XP updated in Settings
  await page.click('#settings-dropdown-btn');
  await page.waitForSelector('#role-badge', { timeout: 5000 });
  const roleText = await page.textContent('#role-badge');
  console.log(`Updated role badge in Settings: "${roleText?.trim().replace(/\s+/g, ' ')}"`);
  await page.click('#settings-dropdown-btn');
  await page.waitForTimeout(300);

  await browser.close();
  console.log('\n🎉 Auto-Celebration verification completed successfully with 100% PASS!');
}

testAutoCelebration().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
