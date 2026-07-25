const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/cnc/?smoke=advanced-practice', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_TRAINING_PRACTICE && window.CNC_TRAINING_PRACTICE.build === '20260723e', null, { timeout: 20000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-startup-home') === 'stable', null, { timeout: 15000 });
  assert.equal(await page.locator('.view.active').getAttribute('id'), 'view-dashboard');
  await page.locator('.launchpad-card[data-route="study"]').click();
  await page.waitForSelector('#view-study.active', { state: 'visible' });

  // The study view becomes visible before all practice cards finish their synchronous
  // enhancement pass on slower CI runners. Wait for the module's own semantic health
  // check rather than relying on a fixed delay or accepting a partially initialized UI.
  await page.waitForFunction(() => {
    const practice = window.CNC_TRAINING_PRACTICE;
    return Boolean(practice && practice.runCheck && practice.runCheck().passed);
  }, null, { timeout: 15000 });

  const api = await page.evaluate(() => window.CNC_TRAINING_PRACTICE.runCheck());
  assert.equal(api.passed, true, `advanced practice readiness failed: ${JSON.stringify(api)}`);
  assert.equal(api.questions, 9);
  assert.equal(api.lessonGates, 12);
  assert.equal(api.passScore, 80);
  assert.ok(api.types.includes('fill'));
  assert.ok(api.types.includes('order'));
  assert.ok(api.types.includes('find-error'));

  await page.evaluate(() => window.CNC_TRAINING_PRACTICE.renderQuestion('fill-g01', 'all'));
  const panel = page.locator('#xp-practice-panel');
  await panel.locator('[data-practice-fill]').fill('g1');
  await panel.locator('[data-practice-submit]').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('cnc_training_practice_v1')).correct.includes('fill-g01'));
  assert.match((await panel.locator('.xp-practice-feedback').textContent()) || '', /回答正确/);

  await page.evaluate(() => window.CNC_TRAINING_PRACTICE.renderQuestion('order-first-run', 'all'));
  assert.equal(await panel.locator('.xp-practice-order li').count(), 4);
  const minOrderButton = await panel.locator('.xp-practice-order button').evaluateAll(nodes => Math.min(...nodes.map(node => node.getBoundingClientRect().height)));
  assert.ok(minOrderButton >= 44);

  await page.evaluate(() => window.CNC_TRAINING_PRACTICE.renderQuestion('find-error-g00', 'all'));
  assert.match((await panel.locator('.xp-practice-code').textContent()) || '', /G00 Z-20\.0/);
  await panel.locator('input[value="2"]').check();
  await panel.locator('[data-practice-submit]').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('cnc_training_practice_v1')).correct.includes('find-error-g00'));
  assert.deepEqual(errors, []);
  console.log('程序补空、步骤排序、看程序找错、80分闯关与12关绑定检查通过', api);
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });