const { chromium } = require('playwright');

const BASE_URL = process.env.CNC_TEST_URL || 'http://127.0.0.1:4173/cnc/';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });

  await context.addInitScript(() => {
    window.__copiedDetailUrl = '';
    Object.defineProperty(Navigator.prototype, 'share', {
      configurable: true,
      value: undefined
    });
    Object.defineProperty(Navigator.prototype, 'clipboard', {
      configurable: true,
      get() {
        return {
          writeText(value) {
            window.__copiedDetailUrl = String(value || '');
            return Promise.resolve();
          }
        };
      }
    });
  });

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#view-dashboard.active');
  await page.waitForSelector('.xp-bottom-nav');

  const navStyle = await page.locator('.xp-bottom-nav').evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      backgroundImage: style.backgroundImage,
      backdropFilter: style.backdropFilter || style.webkitBackdropFilter,
      radius: style.borderRadius
    };
  });
  assert(navStyle.backgroundImage === 'none', '底部导航仍存在渐变背景');
  assert(!navStyle.backdropFilter || navStyle.backdropFilter === 'none', '底部导航仍使用玻璃模糊');
  assert(parseFloat(navStyle.radius) <= 14, '底部导航圆角仍然过大');

  await page.locator('.xp-bottom-nav [data-xp-filter="gcode"]').click();
  await page.waitForSelector('#view-workspace.active');
  await page.locator('#search-input').fill('G01');
  await page.waitForFunction(() => document.querySelectorAll('#result-list [data-open-entry]').length > 0);

  const g01Button = page.locator('#result-list [data-open-entry]').filter({ hasText: '查看详情' }).first();
  await g01Button.scrollIntoViewIfNeeded();
  await g01Button.click();
  await page.waitForSelector('#detail-panel.mobile-open');
  await page.waitForFunction(() => /G0?1/i.test((document.getElementById('detail-code') || {}).textContent || ''));

  const shareButton = page.locator('#detail-share');
  await shareButton.waitFor({ state: 'visible' });
  assert(await shareButton.getAttribute('aria-label') === '分享当前知识条目', '分享按钮缺少清晰的无障碍名称');
  await shareButton.click();

  await page.waitForFunction(() => Boolean(window.__copiedDetailUrl));
  const copied = await page.evaluate(() => window.__copiedDetailUrl);
  assert(/\/cnc\/\?q=G0?1/i.test(copied), '复制的分享链接没有指向当前G01条目: ' + copied);
  await page.waitForSelector('#xp-share-status:not([hidden])');
  const statusText = (await page.locator('#xp-share-status').textContent() || '').trim();
  assert(statusText.includes('链接已复制'), '分享完成后没有清晰反馈');

  const trustStyle = await page.locator('.xp-trust-panel').evaluate((node) => {
    const style = getComputedStyle(node);
    return { backgroundImage: style.backgroundImage, radius: style.borderRadius };
  });
  assert(trustStyle.backgroundImage === 'none', '可信度卡仍存在渐变背景');
  assert(parseFloat(trustStyle.radius) <= 14, '可信度卡圆角仍然过大');

  assert(consoleErrors.length === 0, '控制台出现错误: ' + consoleErrors.join(' | '));
  console.log(JSON.stringify({ passed: true, copied, statusText, navStyle, trustStyle }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
