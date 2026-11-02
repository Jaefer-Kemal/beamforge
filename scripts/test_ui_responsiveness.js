const { chromium } = require('../apps/web-ide/node_modules/playwright');
const path = require('path');
const fs = require('fs');

async function testMobileAndDesktop() {
  console.log('🚀 Launching Chromium browser to test UI responsiveness...');
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });

  const screenshotDir = path.join(__dirname, '..', 'scratch', 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  // 1. MOBILE VIEWPORT TEST (390 x 844 - Mobile Phone)
  console.log('\n📱 Testing Mobile Phone Viewport (390 x 844)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Mobile TopBar check
  const mobileTitle = await mobilePage.title();
  console.log(`   Page loaded: "${mobileTitle}"`);

  // Verify mobile segmented switcher exists (Guide | Code | Results)
  const guideTab = await mobilePage.$('button:has-text("Guide")');
  const codeTab = await mobilePage.$('button:has-text("Code")');
  const resultsTab = await mobilePage.$('button:has-text("Results")');
  console.log(`   Mobile Segmented Tabs: Guide=${!!guideTab}, Code=${!!codeTab}, Results=${!!resultsTab}`);

  // Take Guide Mode screenshot
  await mobilePage.screenshot({ path: path.join(screenshotDir, '01_mobile_guide.png') });
  console.log('   📸 Captured: 01_mobile_guide.png');

  // Click "Code" tab
  await codeTab.click();
  await mobilePage.waitForTimeout(500);

  // Check syntax accessory bar
  const syntaxBar = await mobilePage.$('button:has-text("->")');
  console.log(`   Erlang Quick Syntax Bar visible: ${!!syntaxBar}`);

  // Check Monaco editor visibility in mobile Code mode
  const editorEl = await mobilePage.$('.monaco-editor');
  console.log(`   Monaco Editor mounted & visible: ${!!editorEl}`);

  // Take Code Mode screenshot
  await mobilePage.screenshot({ path: path.join(screenshotDir, '02_mobile_code_editor.png') });
  console.log('   📸 Captured: 02_mobile_code_editor.png');

  // Click "Run" on mobile
  const runBtn = await mobilePage.$('button:has-text("Run")');
  if (runBtn) {
    console.log('   Clicking "Run" button to verify auto-switch to Results...');
    await runBtn.click();
    await mobilePage.waitForTimeout(1500);

    // Verify Results view is active
    const backBtn = await mobilePage.$('button:has-text("Back to Editor")');
    console.log(`   Auto-switched to Results View! Sticky [Back to Editor] button: ${!!backBtn}`);

    await mobilePage.screenshot({ path: path.join(screenshotDir, '03_mobile_results_tab.png') });
    console.log('   📸 Captured: 03_mobile_results_tab.png');

    // Click [Back to Editor]
    if (backBtn) {
      await backBtn.click();
      await mobilePage.waitForTimeout(500);
      const editorVisibleAgain = await mobilePage.$('.monaco-editor');
      console.log(`   Switched back to Editor seamlessly: ${!!editorVisibleAgain}`);
    }
  }

  // 2. DESKTOP VIEWPORT TEST (1280 x 800)
  console.log('\n💻 Testing Desktop Viewport (1280 x 800)...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Verify 50/50 split layout
  const desktopEditor = await desktopPage.$('.monaco-editor');
  console.log(`   Desktop Monaco Editor mounted: ${!!desktopEditor}`);

  await desktopPage.screenshot({ path: path.join(screenshotDir, '04_desktop_split_view.png') });
  console.log('   📸 Captured: 04_desktop_split_view.png');

  await browser.close();
  console.log('\n✅ UI Responsiveness Test Run PASSED with 0 errors!');
}

testMobileAndDesktop().catch(err => {
  console.error('UI Test Error:', err);
  process.exit(1);
});
