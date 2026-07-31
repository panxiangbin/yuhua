const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('http://127.0.0.1:4173/cnc/?detail-style=20260722d', { waitUntil: 'networkidle' });
  await page.waitForSelector('#view-dashboard.active');

  const homeUtilityState = await page.locator('body > .xp-bottom-nav').evaluate(node => ({
    visible: node.getClientRects().length > 0,
    ariaHidden: node.getAttribute('aria-hidden'),
    inert: node.hasAttribute('inert')
  }));
  assert.deepStrictEqual(homeUtilityState, { visible: false, ariaHidden: 'true', inert: true }, '手机首页工具导航隐藏语义异常');

  async function ensureWorkspaceAndUtilityNav() {
    if (await page.locator('#view-dashboard.active').count()) {
      const quickEntry = page.locator('#xp-game-home [data-xp-query-filter="gcode"]');
      await quickEntry.waitFor({ state: 'visible', timeout: 15000 });
      await quickEntry.click();
    }
    await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 15000 });
    await page.waitForFunction(() => {
      const node = document.querySelector('body > .xp-bottom-nav');
      return node && node.getClientRects().length > 0 && node.getAttribute('aria-hidden') === 'false' && !node.hasAttribute('inert');
    }, null, { timeout: 15000 });
  }

  async function enterFilter(filter) {
    await ensureWorkspaceAndUtilityNav();
    const bottomButton = page.locator(`body > .xp-bottom-nav [data-xp-filter="${filter}"]`);
    if (await bottomButton.count()) {
      await bottomButton.waitFor({ state: 'visible', timeout: 10000 });
      await bottomButton.click();
      return;
    }
    await page.locator('#sidebar-open').click();
    const menuButton = page.locator(`#sidebar.open [data-route="workspace"][data-filter="${filter}"],#sidebar.open [data-filter="${filter}"]`).first();
    await menuButton.waitFor({ state: 'visible', timeout: 10000 });
    await menuButton.click();
  }

  async function openAndCheck(filter, expectedKind) {
    await enterFilter(filter);
    await page.waitForSelector('#view-workspace.active');
    await page.waitForSelector('#result-list [data-open-entry]');
    const firstEntry = page.locator('#result-list [data-open-entry]').first();
    await firstEntry.waitFor({ state: 'visible', timeout: 15000 });
    await firstEntry.click();
    await page.waitForSelector('#detail-panel.mobile-open');
    await page.waitForFunction(() => {
      const body = document.body;
      return body.getAttribute('data-cnc-industrial-surface') === 'detail' &&
        Boolean(document.querySelector('link[data-cnc-industrial-detail-pages]'));
    });

    const snapshot = await page.evaluate(() => {
      const code = document.getElementById('detail-code');
      const card = document.querySelector('#detail-panel .detail-card-primary');
      const back = document.getElementById('detail-back-btn');
      const body = document.body;
      const codeStyle = getComputedStyle(code);
      const cardStyle = getComputedStyle(card);
      const backStyle = getComputedStyle(back);
      return {
        surface: body.getAttribute('data-cnc-industrial-surface'),
        kind: body.getAttribute('data-cnc-detail-kind'),
        code: code.textContent.trim(),
        codeSize: parseFloat(codeStyle.fontSize),
        codeWeight: parseInt(codeStyle.fontWeight, 10),
        cardRadius: parseFloat(cardStyle.borderRadius),
        backHeight: back.getBoundingClientRect().height,
        backRadius: parseFloat(backStyle.borderRadius),
        gridColumns: getComputedStyle(document.querySelector('#detail-panel .detail-content-grid')).gridTemplateColumns
      };
    });

    assert.strictEqual(snapshot.surface, 'detail');
    assert.ok(snapshot.kind === expectedKind || snapshot.kind === 'knowledge', `unexpected detail kind: ${snapshot.kind}`);
    assert.ok(snapshot.code.length > 0, 'detail code should be visible');
    assert.ok(snapshot.codeSize >= 30, `detail code too small: ${snapshot.codeSize}`);
    assert.ok(snapshot.codeWeight >= 800, `detail code too light: ${snapshot.codeWeight}`);
    assert.ok(snapshot.cardRadius >= 12 && snapshot.cardRadius <= 16, `card radius out of range: ${snapshot.cardRadius}`);
    assert.ok(snapshot.backHeight >= 44, `back target too short: ${snapshot.backHeight}`);
    assert.ok(snapshot.backRadius >= 8 && snapshot.backRadius <= 12, `back radius out of range: ${snapshot.backRadius}`);
    assert.ok(!snapshot.gridColumns.includes(' '), `detail grid must be single-column: ${snapshot.gridColumns}`);

    await page.locator('#detail-back-btn').click();
    await page.waitForFunction(() => !document.getElementById('detail-panel').classList.contains('mobile-open'));
  }

  await openAndCheck('alarm', 'alarm');
  await page.locator('body > .xp-bottom-nav [data-xp-route="dashboard"]').click();
  await page.waitForSelector('#view-dashboard.active');
  await openAndCheck('parameter', 'parameter');

  assert.deepStrictEqual(errors, [], `console errors: ${errors.join(' | ')}`);
  console.log('PASS mobile industrial detail pages', JSON.stringify({ homeUtilityState, errors: errors.length }));
  await browser.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
