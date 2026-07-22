const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const consoleErrors = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => consoleErrors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('cnc_app_recents_v2', '[]'));
  await page.goto('http://127.0.0.1:4173/cnc/?smoke=dashboard-recents', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_INDUSTRIAL_SAMPLE && window.CNC_INDUSTRIAL_SAMPLE.build === '20260722e', null, { timeout: 20000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-industrial-surface') === 'home', null, { timeout: 15000 });
  await page.waitForSelector('#dashboard-recent-section', { state: 'visible', timeout: 20000 });

  const emptyText = ((await page.locator('#dashboard-recent-list .recent-empty').textContent()) || '').trim();
  assert.match(emptyText, /还没有最近查看/);
  assert.doesNotMatch(emptyText, /干干净净|装进来吧/);
  assert.ok(await page.locator('#dashboard-recent-section').evaluate(node => parseFloat(getComputedStyle(node).borderRadius)) <= 16);
  assert.equal(await page.locator('#dashboard-recent-list').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length), 1);

  await page.locator('.xp-bottom-nav [data-xp-filter="gcode"]').click();
  await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 15000 });
  await page.locator('#search-input').fill('G01');
  await page.waitForSelector('#result-list [data-open-entry]', { state: 'visible', timeout: 15000 });
  await page.locator('#result-list [data-open-entry]').first().click();
  await page.waitForSelector('#detail-panel.mobile-open', { state: 'visible', timeout: 15000 });
  await page.locator('#detail-back-btn').click();
  await page.locator('.xp-bottom-nav [data-xp-route="dashboard"]').click();
  await page.waitForSelector('#view-dashboard.active', { state: 'visible', timeout: 15000 });
  await page.waitForSelector('#dashboard-recent-list .recent-card', { state: 'visible', timeout: 15000 });

  const card = page.locator('#dashboard-recent-list .recent-card').first();
  assert.equal(await card.getAttribute('role'), 'button');
  assert.equal(await card.getAttribute('tabindex'), '0');
  assert.match((await card.getAttribute('aria-label')) || '', /继续查看/);
  assert.ok(await card.evaluate(node => node.getBoundingClientRect().height) >= 56);
  assert.ok(await card.evaluate(node => parseFloat(getComputedStyle(node).borderRadius)) <= 14);
  assert.equal(await card.evaluate(node => getComputedStyle(node).backgroundImage), 'none');
  assert.notEqual(await card.evaluate(node => getComputedStyle(node).boxShadow), 'none');
  assert.doesNotMatch(((await card.locator('.recent-card-icon').textContent()) || ''), /📘|📄/);
  assert.ok(await card.locator('.recent-card-meta strong').evaluate(node => Number(getComputedStyle(node).fontWeight)) >= 800);

  await card.focus();
  await page.keyboard.press('Enter');
  await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 15000 });
  assert.equal(consoleErrors.length, 0, '首页最近查看流程不应产生控制台错误: ' + consoleErrors.join(' | '));

  console.log('手机首页最近查看工业卡、空状态与键盘继续查看通过');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });