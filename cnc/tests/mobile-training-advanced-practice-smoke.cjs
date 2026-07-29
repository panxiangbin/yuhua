const { chromium } = require('playwright');
const assert = require('node:assert/strict');

async function trustedClickHiddenRoute(page, selector) {
  const route = page.locator(selector);
  await route.waitFor({ state: 'attached', timeout: 15000 });
  const markerId = `cnc-advanced-route-marker-${Date.now()}`;
  const routeId = `cnc-advanced-route-target-${Date.now()}`;

  await route.evaluate((node, ids) => {
    const marker = document.createElement('span');
    marker.id = ids.markerId;
    marker.hidden = true;
    node.parentNode.insertBefore(marker, node);
    node.dataset.advancedOriginalStyle = node.getAttribute('style') || '';
    node.dataset.advancedOriginalId = node.id || '';
    node.id = ids.routeId;
    document.body.appendChild(node);
    Object.assign(node.style, {
      position: 'fixed',
      left: '16px',
      top: '16px',
      width: '180px',
      height: '48px',
      display: 'block',
      visibility: 'visible',
      opacity: '1',
      pointerEvents: 'auto',
      zIndex: '2147483647'
    });
  }, { markerId, routeId });

  try {
    await page.locator(`#${routeId}`).click({ timeout: 15000 });
  } finally {
    await page.evaluate(({ routeId, markerId }) => {
      const node = document.getElementById(routeId);
      const marker = document.getElementById(markerId);
      if (!node) return;
      const originalStyle = node.dataset.advancedOriginalStyle || '';
      const originalId = node.dataset.advancedOriginalId || '';
      if (originalStyle) node.setAttribute('style', originalStyle);
      else node.removeAttribute('style');
      if (originalId) node.id = originalId;
      else node.removeAttribute('id');
      delete node.dataset.advancedOriginalStyle;
      delete node.dataset.advancedOriginalId;
      if (marker && marker.parentNode) {
        marker.parentNode.insertBefore(node, marker);
        marker.remove();
      }
    }, { routeId, markerId });
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('http://127.0.0.1:4173/cnc/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_TRAINING_PRACTICE && window.CNC_TRAINING_PRACTICE.build === '20260723e', null, { timeout: 20000 });
  await page.waitForSelector('#xp-game-home[data-ready="true"]', { state: 'visible', timeout: 60000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-startup-home') === 'stable', null, { timeout: 15000 });
  assert.equal(await page.locator('.view.active').getAttribute('id'), 'view-dashboard', '根网址必须稳定停留首页');

  await page.waitForTimeout(5600);
  await trustedClickHiddenRoute(page, '#sidebar .tree-item[data-route="study"]');
  await page.waitForSelector('#view-study.active', { state: 'visible', timeout: 15000 });

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
