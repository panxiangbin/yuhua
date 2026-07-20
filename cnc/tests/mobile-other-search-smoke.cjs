const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=other-search', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  const paramsCard = page.locator('.launchpad-card[data-filter="params"]').first();
  await paramsCard.waitFor({ state: 'visible', timeout: 30000 });
  await paramsCard.click();

  await page.waitForSelector('#view-workspace.active #result-list .result-card', {
    state: 'visible',
    timeout: 30000
  });
  await page.waitForFunction(() => window.CNC_CLEAN_UI && window.CNC_CLEAN_UI.build === '20260720k', null, { timeout: 15000 });
  await page.waitForTimeout(500);

  assert.equal(
    await page.locator('#workspace-mode-row').evaluate(node => getComputedStyle(node).display),
    'none',
    '报警/参数查询不应显示图文模式切换'
  );
  assert.equal(
    await page.locator('#preset-chip-row').evaluate(node => getComputedStyle(node).display),
    'none',
    '报警/参数查询不应显示重复分类快捷栏'
  );

  const firstResult = page.locator('#result-list .result-card').first();
  const button = firstResult.locator('.result-button');
  assert.equal(await button.count(), 1, '报警/参数结果卡必须保留详情入口');

  const style = await button.evaluate(element => {
    const computed = getComputedStyle(element);
    return {
      display: computed.display,
      opacity: computed.opacity,
      position: computed.position
    };
  });
  assert.equal(style.display, 'block');
  assert.equal(style.opacity, '0');
  assert.equal(style.position, 'absolute');

  await button.click({ force: true });
  await page.waitForFunction(() => {
    const panel = document.querySelector('#detail-panel');
    const body = document.body;
    if (!panel || !body) return false;
    const panelStyle = getComputedStyle(panel);
    return body.getAttribute('data-cnc-detail-open') === 'true' && panelStyle.display !== 'none' && panelStyle.position === 'fixed';
  }, null, { timeout: 15000 });

  assert.equal(await page.locator('#detail-panel').isVisible(), true);
  console.log('报警/参数查询减法界面、整卡点击和实际全屏详情通过');
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
