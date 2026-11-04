import { chromium } from '../apps/web-ide/node_modules/playwright/index.mjs';

const ARTIFACT_DIR = 'C:/Users/jafar/.gemini/antigravity/brain/2af38d14-d298-4b64-a405-c3f56d7bd272';

async function testUserAwareSubmissions() {
  console.log('Testing User-Aware Code Scoping, Submissions Persistence & Left-Pane Inspector...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await context.newPage();

  try {
    // 1. Load initial page
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log('Page loaded successfully.');

    // Ensure we start with User Alpha on Chapter 1 Lesson 1
    await page.evaluate(async () => {
      const store = (window).useWorkspaceStore;
      if (store) {
        await store.getState().switchUser('user_alpha');
        await store.getState().switchExercise('ch01-l01');
      }
    });
    await page.waitForTimeout(600);

    // ── Test 1: User-Aware Code Draft Isolation ─────────────────────────────
    console.log('\n--- Step 1: Testing User-Aware Code Draft Isolation ---');
    const alphaCode = '% Alpha Custom Draft - Isolated Work\n-module(solution).\n-export([run/0]).\nrun() -> alpha_secret_work.\n';
    await page.evaluate((code) => {
      const store = (window).useWorkspaceStore;
      if (store) {
        const activePath = store.getState().activeFilePath || 'src/solution.erl';
        store.getState().updateFileContent(activePath, code);
      }
    }, alphaCode);
    await page.waitForTimeout(500);

    // Verify localStorage draft for User Alpha exists
    const alphaDraft = await page.evaluate(() => {
      return localStorage.getItem('beamforge_draft_user_alpha_ch01-l01');
    });
    console.log('Alpha draft saved in localStorage:', alphaDraft ? 'YES' : 'NO');
    if (!alphaDraft || !alphaDraft.includes('alpha_secret_work')) {
      throw new Error('Alpha draft was not correctly persisted to localStorage!');
    }

    // Switch to User Beta
    console.log('Switching to User Beta...');
    await page.evaluate(async () => {
      const store = (window).useWorkspaceStore;
      if (store) {
        await store.getState().switchUser('user_beta');
      }
    });
    await page.waitForTimeout(600);

    // Verify User Beta does NOT see Alpha's draft
    const betaEditorCode = await page.evaluate(() => {
      const store = (window).useWorkspaceStore;
      return store?.getState().files.find(f => f.path === store.getState().activeFilePath)?.content || '';
    });
    console.log('Beta editor code contains Alpha work:', betaEditorCode.includes('alpha_secret_work') ? 'YES' : 'NO');
    if (betaEditorCode.includes('alpha_secret_work')) {
      throw new Error('Security Breach! User Beta saw User Alpha uncommitted code draft!');
    }

    // Set Beta custom draft
    const betaCode = '% Beta Custom Draft - Isolated Work\n-module(solution).\n-export([run/0]).\nrun() -> beta_unique_logic.\n';
    await page.evaluate((code) => {
      const store = (window).useWorkspaceStore;
      if (store) {
        const activePath = store.getState().activeFilePath || 'src/solution.erl';
        store.getState().updateFileContent(activePath, code);
      }
    }, betaCode);
    await page.waitForTimeout(500);

    // Switch back to User Alpha
    console.log('Switching back to User Alpha...');
    await page.evaluate(async () => {
      const store = (window).useWorkspaceStore;
      if (store) {
        await store.getState().switchUser('user_alpha');
      }
    });
    await page.waitForTimeout(600);

    // Verify Alpha's draft was restored intact
    const restoredAlphaCode = await page.evaluate(() => {
      const store = (window).useWorkspaceStore;
      return store?.getState().files.find(f => f.path === store.getState().activeFilePath)?.content || '';
    });
    console.log('Restored Alpha editor code contains Alpha work:', restoredAlphaCode.includes('alpha_secret_work') ? 'YES' : 'NO');
    if (!restoredAlphaCode.includes('alpha_secret_work')) {
      throw new Error('Alpha code draft was lost upon switching back!');
    }
    if (restoredAlphaCode.includes('beta_unique_logic')) {
      throw new Error('Bleed contamination! Alpha saw Beta draft code!');
    }

    await page.screenshot({ path: `${ARTIFACT_DIR}/playwright_user_aware_draft_isolation.png` });
    console.log('Draft isolation verified and screenshot saved.');

    // ── Test 2: Left-Pane Submissions Tab & Persistence ─────────────────────
    console.log('\n--- Step 2: Testing Left-Pane Submissions Tab ---');
    // Click on [ Submissions ] tab in Left Pane
    await page.click('#left-tab-submissions');
    await page.waitForTimeout(400);

    // Clear submissions database & cache for user_alpha for pristine test
    await page.evaluate(async () => {
      try {
        await fetch('/api/user-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reset_submissions', userId: 'user_alpha' }),
        });
      } catch {}

      const store = (window).useWorkspaceStore;
      if (store) {
        localStorage.removeItem('beamforge_submissions_user_alpha_ch01-l01');
        await store.getState().fetchSubmissions('ch01-l01');
      }
    });
    await page.waitForTimeout(500);

    // Verify Empty State after fetch completes
    await page.waitForSelector('#empty-submissions-card', { timeout: 8000 });
    const emptyCardVisible = await page.isVisible('#empty-submissions-card');
    console.log('Empty Submissions State visible:', emptyCardVisible ? 'YES' : 'NO');
    if (!emptyCardVisible) {
      throw new Error('Expected empty submissions state when no submissions exist!');
    }

    // Now record two submissions: 1 failed attempt, then 1 passed attempt
    console.log('Recording mock submissions for ch01-l01...');
    await page.evaluate(async () => {
      const store = (window).useWorkspaceStore;
      if (store) {
        const filePath = store.getState().activeFilePath || 'src/beam_intro.erl';
        // Attempt 1: Failed
        await store.getState().recordSubmission({
          userId: 'user_alpha',
          exerciseId: 'ch01-l01',
          status: 'failed',
          score: 40,
          files: { [filePath]: '% Attempt 1: Incomplete implementation\n-module(beam_intro).\n-export([eval/1]).\neval(X) -> X - 1.\n' },
          stagesSummary: [
            { id: 'ast', title: 'AST Rules', status: 'passed' },
            { id: 'visible', title: 'Visible Tests', status: 'failed' },
            { id: 'hidden', title: 'Hidden Tests', status: 'failed' },
          ],
          durationMs: 84,
        });

        // Attempt 2: Passed
        await store.getState().recordSubmission({
          userId: 'user_alpha',
          exerciseId: 'ch01-l01',
          status: 'passed',
          score: 100,
          files: { [filePath]: '% Attempt 2: Accepted golden solution\n-module(beam_intro).\n-export([eval/1]).\neval(X) -> X * 2.\n' },
          stagesSummary: [
            { id: 'ast', title: 'AST Rules', status: 'passed' },
            { id: 'visible', title: 'Visible Tests', status: 'passed' },
            { id: 'hidden', title: 'Hidden Tests', status: 'passed' },
          ],
          durationMs: 42,
        });
      }
    });
    await page.waitForTimeout(600);

    // Verify 2 submissions are listed
    await page.waitForSelector('#submission-item-1', { timeout: 8000 });
    const count = await page.locator('[id^="submission-item-"]').count();
    console.log('Number of submission items listed in Left Pane:', count);
    if (count !== 2) {
      throw new Error(`Expected 2 submission items, got: ${count}`);
    }

    // Verify status badges
    const listText = await page.textContent('#submissions-timeline-list');
    console.log('Submissions list summary contains Accepted & Tests Failed:',
      listText?.includes('Accepted') && listText?.includes('Tests Failed') ? 'YES' : 'NO');
    if (!listText?.includes('Accepted') || !listText?.includes('Tests Failed')) {
      throw new Error(`Submissions list missing status badges! Text was: ${listText}`);
    }

    await page.screenshot({ path: `${ARTIFACT_DIR}/playwright_submissions_left_pane_list.png` });
    console.log('Submissions list screenshot saved.');

    // ── Test 3: Non-Destructive Inspection ─────────────────────────────────
    console.log('\n--- Step 3: Testing Non-Destructive Inspection ---');
    // Set a live in-progress edit in the right-pane editor
    const activeUncommittedWork = '% User Alpha live uncommitted in-progress work\n-module(solution).\nmy_active_uncommitted_fn() -> ok.\n';
    await page.evaluate((code) => {
      const store = (window).useWorkspaceStore;
      if (store) {
        const activePath = store.getState().activeFilePath || 'src/solution.erl';
        store.getState().updateFileContent(activePath, code);
      }
    }, activeUncommittedWork);
    await page.waitForTimeout(300);

    // Click on the Accepted submission (Attempt 2, top item #submission-item-0)
    console.log('Clicking on #submission-item-0 to inspect submission snapshot...');
    await page.click('#submission-item-0');
    await page.waitForTimeout(400);

    // Verify Left Pane detail view is active
    const detailBannerVisible = await page.isVisible('#submission-detail-banner');
    const codeViewerVisible = await page.isVisible('#submission-code-viewer');
    console.log('Detail banner visible in Left Pane:', detailBannerVisible ? 'YES' : 'NO');
    console.log('Read-only code viewer visible in Left Pane:', codeViewerVisible ? 'YES' : 'NO');
    if (!detailBannerVisible || !codeViewerVisible) {
      throw new Error('Inspection view failed to open in Left Pane!');
    }

    // Verify Read-Only code displays the snapshot content
    const viewerText = await page.textContent('#submission-code-viewer');
    console.log('Viewer displays snapshot code (eval(X) -> X * 2):', viewerText?.includes('eval(X) -> X * 2') ? 'YES' : 'NO');
    if (!viewerText?.includes('eval(X) -> X * 2')) {
      throw new Error(`Expected snapshot code in viewer, got: ${viewerText}`);
    }

    // CRITICAL NON-DESTRUCTIVE CHECK: Verify the Right Pane editor was NOT overwritten!
    const rightPaneCode = await page.evaluate(() => {
      const store = (window).useWorkspaceStore;
      return store?.getState().files.find(f => f.path === store.getState().activeFilePath)?.content || '';
    });
    console.log('Right Pane editor still contains uncommitted work:', rightPaneCode.includes('my_active_uncommitted_fn') ? 'YES' : 'NO');
    if (!rightPaneCode.includes('my_active_uncommitted_fn')) {
      throw new Error('DESTRUCTIVE VIOLATION! Right-pane editor draft was overwritten when clicking inspection!');
    }

    // Test Copy button
    await page.click('#copy-submission-code-btn');
    await page.waitForTimeout(200);
    const copiedTextVisible = await page.isVisible('text=Copied');
    console.log('Copy button provides feedback:', copiedTextVisible ? 'YES' : 'NO');

    await page.screenshot({ path: `${ARTIFACT_DIR}/playwright_submissions_read_only_detail.png` });
    console.log('Read-only detail view screenshot saved.');

    // ── Test 4: Guarded Restoration ────────────────────────────────────────
    console.log('\n--- Step 4: Testing Guarded Restoration ---');
    // Click Restore to Editor button
    await page.click('#restore-to-editor-btn');
    await page.waitForTimeout(400);

    // Verify confirmation modal opens
    const restoreModalHeader = await page.isVisible('text=Restore Submission to Editor?');
    console.log('Guarded Restore Confirmation Modal visible:', restoreModalHeader ? 'YES' : 'NO');
    if (!restoreModalHeader) {
      throw new Error('Restore confirmation modal failed to open!');
    }

    await page.screenshot({ path: `${ARTIFACT_DIR}/playwright_restore_confirm_modal.png` });

    // Confirm restore
    await page.click('#confirm-restore-btn');
    await page.waitForTimeout(500);

    // Verify the editor now holds the restored snapshot code
    const postRestoreEditorCode = await page.evaluate(() => {
      const store = (window).useWorkspaceStore;
      return store?.getState().files.find(f => f.path === store.getState().activeFilePath)?.content || '';
    });
    console.log('Post-restore editor contains restored golden logic (eval(X) -> X * 2):',
      postRestoreEditorCode.includes('eval(X) -> X * 2') ? 'YES' : 'NO');
    if (!postRestoreEditorCode.includes('eval(X) -> X * 2')) {
      throw new Error('Editor was not updated with the restored code!');
    }

    // ── Test 5: 1-Click Reset to Starter ───────────────────────────────────
    console.log('\n--- Step 5: Testing 1-Click Reset to Starter Template ---');
    await page.click('#reset-template-btn');
    await page.waitForTimeout(400);

    const resetModalVisible = await page.isVisible('text=Reset to Starter Template?');
    console.log('Reset to Starter Template modal visible:', resetModalVisible ? 'YES' : 'NO');
    if (!resetModalVisible) {
      throw new Error('Reset template confirmation modal failed to open!');
    }

    // Click Reset File button in modal
    await page.click('button:has-text("Reset File")');
    await page.waitForTimeout(500);

    // Verify draft was cleared and editor has starter template
    const postResetEditorCode = await page.evaluate(() => {
      const store = (window).useWorkspaceStore;
      return store?.getState().files.find(f => f.path === store.getState().activeFilePath)?.content || '';
    });
    console.log('Post-reset editor no longer contains custom eval logic:',
      !postResetEditorCode.includes('eval(X) -> X * 2') ? 'YES' : 'NO');
    if (postResetEditorCode.includes('eval(X) -> X * 2')) {
      throw new Error('Reset failed! Editor still contains custom code!');
    }

    const localStorageDraftAfterReset = await page.evaluate(() => {
      return localStorage.getItem('beamforge_draft_user_alpha_ch01-l01');
    });
    console.log('LocalStorage draft purged after reset:', localStorageDraftAfterReset === null ? 'YES' : 'NO');
    if (localStorageDraftAfterReset !== null) {
      throw new Error('LocalStorage draft was not purged after reset!');
    }

    console.log('\nALL 5 TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    await browser.close();
  }
}

testUserAwareSubmissions().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
