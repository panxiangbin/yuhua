const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:4173/cnc/?smoke=gcode-layout', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const card = page.locator('.launchpad-card[data-filter="gcode"]');
  await card.waitFor({ state: 'visible', timeout: 30000 });
  await card.click();
  await page.waitForFunction(() => window.__CNC_GM_PRO_INSTALLED__ === '20260720h', null, { timeout: 30000 });
  await page.waitForTimeout(500);

  assert.equal(await page.locator('#workspace-mode-row').evaluate(node => getComputedStyle(node).display), 'none');
  assert.equal(await page.locator('#preset-chip-row').evaluate(node => getComputedStyle(node).display), 'none');
  assert.equal(await page.locator('.gcode-quick-row').evaluate(node => getComputedStyle(node).display), 'none');
  const visibleRows = await page.locator('.gcode-mobile-controls .gcode-control-row').evaluateAll(nodes => nodes.filter(node => getComputedStyle(node).display !== 'none').length);
  assert.equal(visibleRows, 2);

  console.log('G/M布局减法通过');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
