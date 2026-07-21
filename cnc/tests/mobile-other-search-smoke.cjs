const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:4173/cnc/?smoke=other-search-r', { waitUntil: 'domcontentloaded', timeout: 60000 });

  await page.waitForFunction(() => window.CNC_QUERY_MODES && window.CNC_QUERY_MODES.build === '20260721r', null, { timeout: 30000 });
  const paramsCard = page.locator('.launchpad-card[data-filter="parameter"]').first();
  await paramsCard.waitFor({ state: 'visible', timeout: 30000 });
  await paramsCard.click();

  await page.waitForSelector('#view-workspace.active #result-list .result-card', { state: 'visible', timeout: 30000 });
  await page.waitForFunction(() => window.CNC_CLEAN_UI && window.CNC_CLEAN_UI.build === '20260721q', null, { timeout: 15000 });
  await page.waitForFunction(() => document.body.dataset.cncQueryMode === 'parameter', null, { timeout: 15000 });

  assert.equal(await page.locator('#workspace-mode-row').evaluate(node => getComputedStyle(node).display), 'none');
  assert.equal(await page.locator('#preset-chip-row').evaluate(node => getComputedStyle(node).display), 'none');
  assert.match((await page.locator('#workspace-title').textContent()) || '', /参数速查/);
  assert.match(await page.locator('#search-input').getAttribute('placeholder') || '', /1815|参数号/);

  const button = page.locator('#result-list .result-card').first().locator('.result-button');
  assert.equal(await button.count(), 1);
  const style = await button.evaluate(element => { const c = getComputedStyle(element); return { display:c.display, opacity:c.opacity, position:c.position }; });
  assert.deepEqual(style, { display:'block', opacity:'0', position:'absolute' });

  await page.waitForFunction(() => { const b=document.querySelector('#result-list .result-card .result-button'); return b&&b.dataset.cncCleanBound==='true'; }, null, { timeout:15000 });
  await button.click({ force:true });
  await page.waitForFunction(() => { const p=document.querySelector('#detail-panel'); return p&&document.body.dataset.cncDetailOpen==='true'&&getComputedStyle(p).position==='fixed'; }, null, { timeout:15000 });
  assert.equal(await page.locator('#detail-panel').isVisible(), true);

  console.log('参数查询独立入口与无轮询构建通过');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
