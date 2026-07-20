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

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=home', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await page.waitForSelector('.launchpad-card[data-filter="gcode"]', {
    state: 'visible',
    timeout: 30000
  });
  await page.waitForTimeout(1400);

  assert.equal(await page.title(), '数控小潘 CNC速查与学习助手');
  assert.equal(await page.locator('body').evaluate(node => node.classList.contains('cnc-clean-ui')), true);
  assert.match((await page.locator('.study-card[data-level="9"] p').textContent()) || '', /不保证直线/);
  assert.match((await page.locator('.study-card[data-level="10"] p').textContent()) || '', /最小输入单位/);

  const hiddenSelectors = [
    '.fan-suggestion-panel',
    '#view-dashboard .featured-images-preview',
    '#view-dashboard #faq-preview-section'
  ];
  for (const selector of hiddenSelectors) {
    const display = await page.locator(selector).evaluate(node => getComputedStyle(node).display);
    assert.equal(display, 'none', selector + ' 应在手机首页隐藏');
  }

  const launchColumns = await page.locator('.launchpad-grid').evaluate(node =>
    getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length
  );
  assert.equal(launchColumns, 2, '首页六个入口应为两列');

  await page.locator('.launchpad-card[data-route="study"]').click();
  await page.waitForSelector('#view-study.active', { state: 'visible', timeout: 15000 });
  const studyColumns = await page.locator('.study-card-grid').first().evaluate(node =>
    getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length
  );
  assert.equal(studyColumns, 2, '新手课程目录应为两列');
  assert.equal(
    await page.locator('.study-card').first().locator('p').evaluate(node => getComputedStyle(node).display),
    'none',
    '课程目录不应直接展示长说明'
  );

  console.log('首页减法界面、品牌与课程目录通过');
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
