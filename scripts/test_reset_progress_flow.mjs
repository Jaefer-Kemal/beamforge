import { chromium } from '../apps/web-ide/node_modules/playwright/index.mjs';

const ARTIFACT_DIR = 'C:/Users/jafar/.gemini/antigravity/brain/2af38d14-d298-4b64-a405-c3f56d7bd272';

async function testResetProgressFlow() {
  console.log('Testing Reset Progress Modal & State Wipe Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Load initial page
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log('Page loaded.');

    // 2. Switch to User Beta (Ada Lovelace: 1450 XP, 38 completed lessons)
    await page.evaluate(async () => {
      const store = (window).useWorkspaceStore;
      if (store) {
        await store.getState().switchUser('user_beta');
      }
    });
    await page.waitForTimeout(600);

    // Verify initial user state before reset
    const preResetState = await page.evaluate(() => {
      const store = (window).useWorkspaceStore;
      if (!store) return null;
      const state = store.getState();
      return {
        userId: state.currentUser?.id,
        userName: state.currentUser?.name,
        totalXp: state.totalXp,
        completedCount: state.completedLevelIds.length,
      };
    });
    console.log('Pre-reset state:', preResetState);
    if (preResetState.totalXp !== 1450 || preResetState.completedCount !== 38) {
      throw new Error(`Expected pre-reset Ada Lovelace to have 1450 XP and 38 completed lessons, got: ${JSON.stringify(preResetState)}`);
    }

    // 3. Open Settings popover and click Reset Account & Progress
    await page.click('#settings-dropdown-btn');
    await page.waitForTimeout(400);
    await page.waitForSelector('#open-reset-modal-btn', { timeout: 5000 });
    await page.click('#open-reset-modal-btn');
    await page.waitForTimeout(500);

    // Verify Reset Modal is open
    const modalVisible = await page.isVisible('text=Reset Account & Wipe Progress?');
    console.log('Reset Confirmation Modal visible:', modalVisible);
    if (!modalVisible) throw new Error('Reset Confirmation Modal failed to open!');

    // Verify Target Profile in modal matches current user
    const targetProfileText = await page.textContent('text=Target Profile:');
    console.log('Modal target profile text:', targetProfileText);
    if (!targetProfileText || !targetProfileText.includes('Beta Learner')) {
      throw new Error(`Expected modal to target Beta Learner, but got: ${targetProfileText}`);
    }

    // Type confirmation phrase
    await page.fill('#reset-confirm-input', 'RESET PROGRESS');
    await page.waitForTimeout(300);

    // Take screenshot of Safety Modal
    await page.screenshot({ path: `${ARTIFACT_DIR}/playwright_reset_modal_verified.png` });
    console.log('Saved playwright_reset_modal_verified.png');

    // Click confirm button
    await page.click('#confirm-reset-btn');
    await page.waitForTimeout(1000);

    // 4. Verify post-reset state in store
    const postResetState = await page.evaluate(() => {
      const store = (window).useWorkspaceStore;
      if (!store) return null;
      const state = store.getState();
      return {
        userId: state.currentUser?.id,
        userName: state.currentUser?.name,
        totalXp: state.totalXp,
        role: state.currentUser?.role,
        level: state.currentUser?.level,
        completedCount: state.completedLevelIds.length,
        unlockedSolutions: state.unlockedSolutionLessonIds.length,
        activeExercise: state.activeExerciseId,
      };
    });
    console.log('Post-reset state:', postResetState);

    if (postResetState.totalXp !== 0) {
      throw new Error(`Expected totalXp to be 0, got ${postResetState.totalXp}`);
    }
    if (postResetState.completedCount !== 0) {
      throw new Error(`Expected completedCount to be 0, got ${postResetState.completedCount}`);
    }
    if (postResetState.unlockedSolutions !== 0) {
      throw new Error(`Expected unlockedSolutions to be 0, got ${postResetState.unlockedSolutions}`);
    }
    if (postResetState.role !== 'BEAM Initiate') {
      throw new Error(`Expected role to be 'BEAM Initiate', got ${postResetState.role}`);
    }
    if (postResetState.level !== 1) {
      throw new Error(`Expected level to be 1, got ${postResetState.level}`);
    }
    if (postResetState.activeExercise !== 'ch01-l01') {
      throw new Error(`Expected activeExercise to be ch01-l01, got ${postResetState.activeExercise}`);
    }

    // 5. Verify all badges are locked (0 of 14 Unlocked)
    await page.click('#settings-dropdown-btn');
    await page.waitForTimeout(400);
    await page.click('#role-badge');
    await page.waitForTimeout(600);

    const postResetBadgesText = await page.evaluate(() => {
      const el = document.body.innerText;
      const match = el.match(/(\d+)\s+of\s+14\s+Unlocked/i);
      return match ? match[0] : null;
    });
    console.log('Badges unlocked indicator on shelf:', postResetBadgesText);
    if (!postResetBadgesText || !postResetBadgesText.includes('0 of 14')) {
      throw new Error(`Expected "0 of 14 Unlocked" on shelf, got: ${postResetBadgesText}`);
    }

    // Capture screenshot of post-reset empty badge shelf
    await page.screenshot({ path: `${ARTIFACT_DIR}/playwright_reset_verified_shelf.png` });
    console.log('Saved playwright_reset_verified_shelf.png');

    // 6. Re-seed database preset for user_beta so test run is idempotent
    await page.evaluate(() => {
      localStorage.clear();
    });
    const { execSync } = await import('child_process');
    execSync('node scripts/seed_neon.mjs', { stdio: 'inherit' });

    await browser.close();
    console.log('\nRESET PROGRESS E2E VERIFICATION PASSED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('Test failed:', err);
    await browser.close();
    process.exit(1);
  }
}

testResetProgressFlow();
