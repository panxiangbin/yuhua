const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:4173/cnc/?smoke=gcode-detail-content', { waitUntil: 'domcontentloaded', timeout: 60000 });

  // 手机闯关首页不再展示旧工具宫格；从当前可见“现场速查”进入真实 G/M 工作区。
  await page.waitForFunction(() => {
    const nav = window.CNC_GAME_QUERY_NAV;
    const entry = document.querySelector('#xp-game-home [data-xp-query-filter="gcode"]');
    return Boolean(nav && nav.runCheck().passed && entry && entry.getClientRects().length);
  }, null, { timeout: 30000 });
  const entry = page.locator('#xp-game-home [data-xp-query-filter="gcode"]');
  assert.equal(await entry.count(), 1, '手机首页必须只有一个可见G/M代码现场速查入口');
  await entry.click();
  await page.waitForFunction(() => {
    const workspace = document.getElementById('view-workspace');
    return window.__CNC_GM_PRO_INSTALLED__ === '20260720h' &&
      workspace && workspace.classList.contains('active') &&
      document.body.getAttribute('data-cnc-query-mode') === 'gcode';
  }, null, { timeout: 30000 });
  await page.locator('#search-input').fill('G1');
  await page.waitForTimeout(700);

  const button = page.locator('#result-list [data-open-entry="kb-gcode-g01"]');
  await button.waitFor({ state: 'attached', timeout: 15000 });
  await button.click({ force: true });

  await page.waitForFunction(() => {
    const code = document.querySelector('#detail-code');
    return code && /G01/.test(code.textContent || '');
  }, null, { timeout: 15000 });

  assert.match((await page.locator('#detail-title').textContent()) || '', /G01|直线插补/);
  console.log('G01详情内容切换通过');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
