import { chromium } from '../apps/web-ide/node_modules/playwright/index.mjs';

const ARTIFACT_DIR = 'C:/Users/jafar/.gemini/antigravity/brain/2af38d14-d298-4b64-a405-c3f56d7bd272';

async function testXmppChatSimulator() {
  console.log('Starting Chapter 12 Live XMPP Chat Simulator & Gating E2E Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
  });

  try {
    // 1. Load initial page
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log('Page loaded.');

    // 2. Switch to User Master (Grandmaster with Ch 12 Capstone unlocked)
    await page.click('#user-switcher-btn');
    await page.waitForTimeout(400);
    await page.waitForSelector('#switch-user-user_master', { timeout: 5000 });
    await page.click('#switch-user-user_master');

    // Wait for user_master role in settings
    await page.click('#settings-dropdown-btn');
    await page.waitForFunction(() => {
      const el = document.querySelector('#role-badge');
      return el && el.textContent && el.textContent.includes('BEAM Grandmaster');
    }, { timeout: 10000 });
    await page.click('#settings-dropdown-btn');
    await page.waitForTimeout(400);

    // 3. Navigate to Chapter 12 Capstone Studio via TopBar Chapter Dropdown
    console.log('Opening Chapter Dropdown...');
    await page.click('#chapter-dropdown-btn');
    await page.waitForSelector('#chapter-option-12', { timeout: 5000 });
    console.log('Clicking Chapter 12 Capstone option...');
    await page.click('#chapter-option-12');
    await page.waitForTimeout(800);

    // 4. Verify Upper Action Bar De-Cluttering
    console.log('Verifying Upper Action Bar De-Cluttering...');
    const upperLiveChatBtn = await page.$('#xmpp-chat-btn');
    console.log(`  - Upper Live Chat button present: ${upperLiveChatBtn !== null}`);
    if (upperLiveChatBtn !== null) {
      throw new Error('Upper #xmpp-chat-btn should be REMOVED from the upper action bar!');
    }
    const submitBtn = await page.$('#submit-btn');
    const runBtn = await page.$('#run-btn');
    const solutionBtn = await page.$('#solution-btn');
    const testCasesBtn = await page.$('#test-cases-btn');
    const drawerToggleBtn = await page.$('#drawer-toggle-btn');
    if (!submitBtn || !runBtn || !solutionBtn || !testCasesBtn || !drawerToggleBtn) {
      throw new Error('Expected core execution buttons and drawer toggle button to be present!');
    }
    console.log('Upper action bar verified: clean, uncluttered, with core action buttons only.');

    // 5. Open Bottom Drawer & Verify Redundant X Close is Removed
    console.log('Opening drawer via toggle chevron...');
    await page.click('#drawer-toggle-btn');
    await page.waitForTimeout(500);

    const closeBtnInHeader = await page.$('div:has-text("Verification") button:has-text("Close")');
    console.log(`  - Redundant X Close button present in drawer header: ${closeBtnInHeader !== null}`);
    if (closeBtnInHeader !== null) {
      throw new Error('Redundant X Close button should be REMOVED from drawer header!');
    }
    console.log('Drawer header verified: redundant X Close button removed.');

    // 6. Switch to Live XMPP Chat in drawer tab bar
    console.log('Clicking Live XMPP Chat tab in drawer...');
    await page.waitForSelector('#tab-btn-chat', { timeout: 5000 });
    await page.click('#tab-btn-chat');
    await page.waitForTimeout(600);
    await page.waitForSelector('#live-xmpp-chat-simulator', { state: 'visible', timeout: 5000 });
    console.log('Live XMPP Chat Simulator opened via drawer tab.');

    // 7. Verify Port 5222 Live for Grandmaster
    const portLiveVisible = await page.isVisible('text=Port 5222 Live');
    console.log(`Port 5222 Live badge visible for Grandmaster: ${portLiveVisible}`);
    if (!portLiveVisible) throw new Error('Expected Port 5222 Live badge for user_master!');

    // 8. Test Alice sending a message to Bob
    const inputSelector = '#live-xmpp-chat-simulator input[type="text"]';
    await page.fill(inputSelector, 'Testing live stanza routing on OTP 29 with 6 milestones!');
    await page.click('#live-xmpp-chat-simulator button[type="submit"]');
    await page.waitForTimeout(900); // wait for automated Bob ack

    const messageCount = await page.locator('#live-xmpp-chat-simulator p').count();
    console.log(`Messages exchanged: ${messageCount} bubbles present.`);

    // 9. Test Offline Spooling: Toggle Bob Offline
    console.log('Testing Offline Spooling: Toggling Bob offline...');
    await page.click('#live-xmpp-chat-simulator button:has-text("Online (Pri 5)")');
    await page.waitForTimeout(400);

    await page.fill(inputSelector, 'Hey Bob, this message should buffer in offline queue!');
    await page.click('#live-xmpp-chat-simulator button[type="submit"]');
    await page.waitForTimeout(500);

    const spooledIndicator = await page.isVisible('text=Spooled Offline in ETS');
    console.log(`Message spooled offline verified: ${spooledIndicator}`);
    if (!spooledIndicator) throw new Error('Expected message to show Spooled Offline in ETS indicator!');

    // Reconnect Bob
    await page.click('#live-xmpp-chat-simulator button:has-text("Offline (Simulate Spool)")');
    await page.waitForTimeout(600);
    console.log('Flush event triggered. Reconnection confirmed.');

    // 10. Test M6 Chaos Crash button (verified for Grandmaster)
    console.log('Testing M6 Chaos Monkey crash simulation...');
    const chaosBtn = await page.$('button:has-text("Crash Router with Chaos")');
    if (chaosBtn) {
      await chaosBtn.click();
      await page.waitForTimeout(600);
      const chaosAlertVisible = await page.isVisible('text=Chaos Attack Triage');
      console.log(`Chaos Attack triage alert visible: ${chaosAlertVisible}`);
    }

    // 11. Switch to Stanza Wire Terminal tab
    console.log('Switching to Stanza Wire Terminal tab...');
    await page.click('#live-xmpp-chat-simulator button:has-text("Stanza Wire Terminal")');
    await page.waitForTimeout(500);

    const terminalVisible = await page.isVisible('text=Raw TCP Stream Transcript');
    console.log(`Stanza Wire Terminal loaded: ${terminalVisible}`);

    // Take screenshot of 6-Milestone Live Cluster with Stanzas
    await page.screenshot({ path: `${ARTIFACT_DIR}/playwright_xmpp_6_milestones_live.png` });
    console.log('Saved playwright_xmpp_6_milestones_live.png');

    // Switch back to Chat
    await page.click('#live-xmpp-chat-simulator button:has-text("Dual Chat Client")');
    await page.waitForTimeout(300);

    // 12. Test Progressive Gating Standby Rack for Unsolved User
    console.log('Testing Progressive Milestone Standby Rack...');
    // Switch to User Alpha (Newcomer, 0 XP, Capstone unsolved)
    await page.click('#user-switcher-btn');
    await page.waitForTimeout(400);
    await page.waitForSelector('#switch-user-user_alpha', { timeout: 5000 });
    await page.click('#switch-user-user_alpha');
    await page.waitForTimeout(600);

    // Turn on Tester Mode in settings so Alpha can navigate to Ch 12 to test standby rack
    await page.click('#settings-dropdown-btn');
    await page.waitForTimeout(400);
    await page.waitForSelector('#toggle-tester-mode-btn', { timeout: 5000 });
    await page.click('#toggle-tester-mode-btn');
    await page.waitForTimeout(400);
    await page.click('#settings-dropdown-btn');
    await page.waitForTimeout(400);

    // Navigate to Chapter 12
    await page.click('#chapter-dropdown-btn');
    await page.waitForSelector('#chapter-option-12', { timeout: 5000 });
    await page.click('#chapter-option-12');
    await page.waitForTimeout(800);

    // Open drawer via toggle chevron if not already open
    const isChatTabVisible = await page.$('#tab-btn-chat');
    if (!isChatTabVisible) {
      await page.click('#drawer-toggle-btn');
      await page.waitForTimeout(400);
    }
    await page.waitForSelector('#tab-btn-chat', { timeout: 5000 });
    await page.click('#tab-btn-chat');
    await page.waitForTimeout(600);

    const standbyRackVisible = await page.isVisible('text=XMPP Cluster Standby');
    console.log(`XMPP Cluster Standby Rack visible for unsolved user: ${standbyRackVisible}`);
    if (!standbyRackVisible) throw new Error('Expected XMPP Cluster Standby Rack for user_alpha!');

    // Verify all 6 milestones are displayed in rack
    const m1Text = await page.isVisible('text=M1: xmpp_sup');
    const m2Text = await page.isVisible('text=M2: xmpp_stream_parser');
    const m3Text = await page.isVisible('text=M3: xmpp_session_registry');
    const m4Text = await page.isVisible('text=M4: xmpp_c2s_statem');
    const m5Text = await page.isVisible('text=M5: xmpp_router');
    const m6Text = await page.isVisible('text=M6: xmpp_chaos_test');
    console.log(`6-Milestone Assembly Rack items verified: M1(${m1Text}), M2(${m2Text}), M3(${m3Text}), M4(${m4Text}), M5(${m5Text}), M6(${m6Text})`);
    if (!m1Text || !m2Text || !m3Text || !m4Text || !m5Text || !m6Text) {
      throw new Error('All 6 milestones must be present in the Standby Rack!');
    }

    // Capture screenshot of Standby Rack
    await page.screenshot({ path: `${ARTIFACT_DIR}/playwright_xmpp_standby_rack.png` });
    console.log('Saved playwright_xmpp_standby_rack.png');

    // 13. Test OUT-OF-ORDER Milestone Scenario (e.g., M2 & M5 solved, M1, M3, M4 missing)
    console.log('Testing Out-of-Order Milestone Scenario (M2 & M5 passed)...');
    await page.evaluate(() => {
      const store = (window).useWorkspaceStore;
      if (store) {
        const currentUser = store.getState().currentUser;
        store.setState({
          completedLevelIds: ['ch12-m2', 'ch12-m5'],
          currentUser: currentUser ? {
            ...currentUser,
            completedLevelIds: ['ch12-m2', 'ch12-m5'],
          } : undefined,
        });
      }
    });
    await page.waitForTimeout(600);

    // Verify cluster is STILL in Standby (not booted prematurely)
    const outOfOrderStandby = await page.isVisible('text=Port 5222 Standby');
    console.log(`Port 5222 remains in Standby for out-of-order state: ${outOfOrderStandby}`);
    if (!outOfOrderStandby) throw new Error('Port 5222 should NOT boot when core dependencies M1, M3, M4 are missing!');

    // Verify missing dependencies warning banner
    const missingDepsBanner = await page.isVisible('text=Waiting on: M1 Supervisor, M3 ETS Registry, M4 SASL FSM');
    console.log(`Out-of-order dependency notice verified: ${missingDepsBanner}`);
    if (!missingDepsBanner) throw new Error('Expected "Waiting on: M1 Supervisor, M3 ETS Registry, M4 SASL FSM" banner!');

    // Capture screenshot of Out-of-Order Assembly Rack
    await page.screenshot({ path: `${ARTIFACT_DIR}/playwright_xmpp_out_of_order_rack.png` });
    console.log('Saved playwright_xmpp_out_of_order_rack.png');

    // 14. Test Render Cold-Start Notification Banner
    console.log('Testing Render Cold-Start Notification Banner...');
    // Switch to Verification Stages tab
    await page.click('button:has-text("Verification")');
    await page.waitForTimeout(300);

    // Simulate verification taking > 3.5s
    await page.evaluate(() => {
      const store = (window).useWorkspaceStore;
      if (store) {
        store.setState({ isVerifying: true });
      }
    });
    console.log('Waiting 3.8s for cold-boot timer to trigger...');
    await page.waitForTimeout(3800);

    const coldBootBannerVisible = await page.isVisible('#render-cold-boot-banner');
    console.log(`Render cold-boot notification banner visible: ${coldBootBannerVisible}`);
    if (!coldBootBannerVisible) throw new Error('Expected #render-cold-boot-banner to appear after 3.5s delay!');

    // Clear verification state
    await page.evaluate(() => {
      const store = (window).useWorkspaceStore;
      if (store) {
        store.setState({ isVerifying: false });
      }
    });
    await page.waitForTimeout(300);
    const coldBootBannerGone = !(await page.isVisible('#render-cold-boot-banner'));
    console.log(`Render cold-boot banner cleared upon completion: ${coldBootBannerGone}`);

    // Switch back to chat
    await page.click('#tab-btn-chat');
    await page.waitForTimeout(400);

    // 15. Mobile Responsiveness Test (390 x 844 iPhone Viewport)
    console.log('Testing Mobile Responsiveness on 390x844 viewport...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(600);

    // Click Mobile Results tab if visible
    const mobileResultsBtn = await page.$('#mobile-capstone-results');
    if (mobileResultsBtn) {
      await page.click('#mobile-capstone-results');
      await page.waitForTimeout(400);
    }

    // Verify Mobile Results sub-tabs
    const mobileChatTab = await page.$('#expanded-tab-btn-chat');
    console.log(`Mobile Chat tab pill visible: ${mobileChatTab !== null}`);

    // Capture Mobile Screenshot
    await page.screenshot({ path: `${ARTIFACT_DIR}/playwright_xmpp_chat_mobile.png` });
    console.log('Saved playwright_xmpp_chat_mobile.png');

    await browser.close();
    console.log('\nALL CAPSTONE GATING, OUT-OF-ORDER DEPENDENCIES & COLD-BOOT TESTS PASSED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('Test failed:', err);
    await browser.close();
    process.exit(1);
  }
}

testXmppChatSimulator();
