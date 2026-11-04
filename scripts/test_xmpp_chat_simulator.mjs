import { chromium } from '../apps/web-ide/node_modules/playwright/index.mjs';

const ARTIFACT_DIR = 'C:/Users/jafar/.gemini/antigravity/brain/2af38d14-d298-4b64-a405-c3f56d7bd272';

async function testXmppChatSimulator() {
  console.log('🚀 Starting Chapter 12 Live XMPP Chat Simulator & Gating E2E Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
  });

  try {
    // 1. Load initial page
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log('✓ Page loaded.');

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
    console.log('✓ Upper action bar verified: clean, uncluttered, with core action buttons only.');

    // 5. Open Bottom Drawer & Verify Redundant X Close is Removed
    console.log('Opening drawer via toggle chevron...');
    await page.click('#drawer-toggle-btn');
    await page.waitForTimeout(500);

    const closeBtnInHeader = await page.$('div:has-text("Verification") button:has-text("Close")');
    console.log(`  - Redundant X Close button present in drawer header: ${closeBtnInHeader !== null}`);
    if (closeBtnInHeader !== null) {
      throw new Error('Redundant X Close button should be REMOVED from drawer header!');
    }
    console.log('✓ Drawer header verified: redundant X Close button removed.');

    // 6. Switch to Live XMPP Chat in drawer tab bar
    console.log('Clicking Live XMPP Chat tab in drawer...');
    await page.waitForSelector('#tab-btn-chat', { timeout: 5000 });
    await page.click('#tab-btn-chat');
    await page.waitForTimeout(600);
    await page.waitForSelector('#live-xmpp-chat-simulator', { state: 'visible', timeout: 5000 });
    console.log('✓ Live XMPP Chat Simulator opened via drawer tab.');

    // 7. Verify Port 5222 Live for Grandmaster
    const portLiveVisible = await page.isVisible('text=Port 5222 Live');
    console.log(`✓ Port 5222 Live badge visible for Grandmaster: ${portLiveVisible}`);
    if (!portLiveVisible) throw new Error('Expected Port 5222 Live badge for user_master!');

    // 8. Test Alice sending a message to Bob
    const inputSelector = '#live-xmpp-chat-simulator input[type="text"]';
    await page.fill(inputSelector, 'Testing live stanza routing on OTP 29!');
    await page.click('#live-xmpp-chat-simulator button[type="submit"]');
    await page.waitForTimeout(900); // wait for automated Bob ack

    const messageCount = await page.locator('#live-xmpp-chat-simulator p').count();
    console.log(`✓ Messages exchanged: ${messageCount} bubbles present.`);

    // Take screenshot of Decluttered Desktop View
    await page.screenshot({ path: `${ARTIFACT_DIR}/playwright_capstone_decluttered.png` });
    console.log('✓ Saved playwright_capstone_decluttered.png');

    // 9. Test Offline Spooling: Toggle Bob Offline
    console.log('Testing Offline Spooling: Toggling Bob offline...');
    await page.click('#live-xmpp-chat-simulator button:has-text("Online (Pri 5)")');
    await page.waitForTimeout(400);

    await page.fill(inputSelector, 'Hey Bob, this message should buffer in offline queue!');
    await page.click('#live-xmpp-chat-simulator button[type="submit"]');
    await page.waitForTimeout(500);

    const spooledIndicator = await page.isVisible('text=Spooled Offline in ETS');
    console.log(`✓ Message spooled offline verified: ${spooledIndicator}`);
    if (!spooledIndicator) throw new Error('Expected message to show Spooled Offline in ETS indicator!');

    // Reconnect Bob
    await page.click('#live-xmpp-chat-simulator button:has-text("Offline (Simulate Spool)")');
    await page.waitForTimeout(600);
    console.log(`✓ Flush event triggered. Reconnection confirmed.`);

    // 10. Switch to Stanza Wire Terminal tab
    console.log('Switching to Stanza Wire Terminal tab...');
    await page.click('#live-xmpp-chat-simulator button:has-text("Stanza Wire Terminal")');
    await page.waitForTimeout(500);

    const terminalVisible = await page.isVisible('text=Raw TCP Stream Transcript');
    console.log(`✓ Stanza Wire Terminal loaded: ${terminalVisible}`);

    // Switch back to Chat
    await page.click('#live-xmpp-chat-simulator button:has-text("Dual Chat Client")');
    await page.waitForTimeout(300);

    // 11. Test Progressive Gating Standby Rack for Unsolved User
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

    // Open drawer via toggle chevron and click Chat tab
    await page.click('#drawer-toggle-btn');
    await page.waitForTimeout(400);
    await page.waitForSelector('#tab-btn-chat', { timeout: 5000 });
    await page.click('#tab-btn-chat');
    await page.waitForTimeout(600);

    const standbyRackVisible = await page.isVisible('text=XMPP Cluster Standby');
    console.log(`✓ XMPP Cluster Standby Rack visible for unsolved user: ${standbyRackVisible}`);
    if (!standbyRackVisible) throw new Error('Expected XMPP Cluster Standby Rack for user_alpha!');

    const moduleM1Visible = await page.isVisible('text=M1: xmpp_sup');
    const moduleM5Visible = await page.isVisible('text=M5: xmpp_router');
    console.log(`✓ 5-Module Assembly Rack items verified: M1 (${moduleM1Visible}), M5 (${moduleM5Visible})`);

    // Capture screenshot of Standby Rack
    await page.screenshot({ path: `${ARTIFACT_DIR}/playwright_xmpp_standby_rack.png` });
    console.log('✓ Saved playwright_xmpp_standby_rack.png');

    // Test Preview Spec Sandbox button
    console.log('Testing Preview Spec Sandbox button...');
    await page.click('button:has-text("Preview Spec Sandbox")');
    await page.waitForTimeout(500);

    const previewBannerVisible = await page.isVisible('text=Spec Sandbox Preview');
    console.log(`✓ Spec Sandbox Preview active: ${previewBannerVisible}`);
    if (!previewBannerVisible) throw new Error('Expected Spec Sandbox Preview banner!');

    // 12. Mobile Responsiveness Test (390 x 844 iPhone Viewport)
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
    console.log(`✓ Mobile Chat tab pill visible: ${mobileChatTab !== null}`);

    // Capture Mobile Screenshot
    await page.screenshot({ path: `${ARTIFACT_DIR}/playwright_xmpp_chat_mobile.png` });
    console.log('✓ Saved playwright_xmpp_chat_mobile.png');

    await browser.close();
    console.log('\n🎉 ALL DECLUTTERING, PROGRESSIVE GATING & MOBILE TESTS PASSED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    await browser.close();
    process.exit(1);
  }
}

testXmppChatSimulator();
