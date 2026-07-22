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

  async function openAndCheck(filter, expectedKind) {
    const selector = `[data-route="workspace"][data-filter="${filter}"], [data-filter="${filter}"]`;
    await page.locator(selector).first().click();
    await page.waitForSelector('#view-workspace.active');
    await page.waitForSelector('#result-list [data-open-entry]');
    await page.locator('#result-list [data-open-entry]').first().click();
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
        cardBackground: cardStyle.backgroundColor,
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
  await page.locator('[data-route="dashboard"]').first().click().catch(() => page.locator('.xp-bottom-nav [data-xp-route="dashboard"]').click());
  await page.waitForSelector('#view-dashboard.active');
  await openAndCheck('parameter', 'parameter');

  assert.deepStrictEqual(errors, [], `console errors: ${errors.join(' | ')}`);
  console.log('PASS mobile industrial detail pages', JSON.stringify({ errors: errors.length }));
  await browser.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
