const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:4173/cnc/?smoke=gcode-layout', { waitUntil: 'domcontentloaded', timeout: 60000 });

  // 手机闯关首页已把旧工具宫格隐藏，G/M代码的真实可见入口是“现场速查”。
  // 本门禁继续验证同一G代码工作区和布局断言，只沿当前产品入口进入，不放宽结果要求。
  await page.waitForFunction(() => {
    const nav = window.CNC_GAME_QUERY_NAV;
    const button = document.querySelector('#xp-game-home [data-xp-query-filter="gcode"]');
    return Boolean(nav && nav.runCheck().passed && button && button.getClientRects().length);
  }, null, { timeout: 30000 });
  const card = page.locator('#xp-game-home [data-xp-query-filter="gcode"]');
  assert.equal(await card.count(), 1, '手机首页必须只有一个可见G/M代码现场速查入口');
  await card.click();
  await page.waitForFunction(() => {
    const workspace = document.getElementById('view-workspace');
    return window.__CNC_GM_PRO_INSTALLED__ === '20260720h' &&
      workspace && workspace.classList.contains('active') &&
      document.body.getAttribute('data-cnc-query-mode') === 'gcode';
  }, null, { timeout: 30000 });
  await page.waitForTimeout(500);

  assert.equal(await page.locator('#workspace-mode-row').evaluate(node => getComputedStyle(node).display), 'none');
  assert.equal(await page.locator('#preset-chip-row').evaluate(node => getComputedStyle(node).display), 'none');
  assert.equal(await page.locator('.gcode-quick-row').evaluate(node => getComputedStyle(node).display), 'none');
  const visibleRows = await page.locator('.gcode-mobile-controls .gcode-control-row').evaluateAll(nodes => nodes.filter(node => getComputedStyle(node).display !== 'none').length);
  assert.equal(visibleRows, 2);

  console.log('G/M布局减法通过');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
