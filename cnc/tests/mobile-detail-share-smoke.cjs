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
  await page.waitForSelector('.xp-game-bottom-nav', { state: 'visible' });

  const gameNavStyle = await page.locator('.xp-game-bottom-nav').evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      backgroundImage: style.backgroundImage,
      backdropFilter: style.backdropFilter || style.webkitBackdropFilter,
      radius: style.borderRadius,
      visibleItems: [...node.querySelectorAll('a')].filter(link => link.getClientRects().length > 0).length
    };
  });
  assert(gameNavStyle.backgroundImage === 'none', '闯关首页底部导航仍存在渐变背景');
  assert(!gameNavStyle.backdropFilter || gameNavStyle.backdropFilter === 'none', '闯关首页底部导航仍使用玻璃模糊');
  assert(parseFloat(gameNavStyle.radius) <= 14, '闯关首页底部导航圆角仍然过大');
  assert(gameNavStyle.visibleItems === 5, '闯关首页必须只有五项可见主导航');

  const homeUtilityState = await page.locator('body > .xp-bottom-nav').evaluate((node) => ({
    visible: node.getClientRects().length > 0,
    ariaHidden: node.getAttribute('aria-hidden'),
    inert: node.hasAttribute('inert')
  }));
  assert(!homeUtilityState.visible && homeUtilityState.ariaHidden === 'true' && homeUtilityState.inert, '手机首页工具导航隐藏语义异常');

  await page.locator('#xp-game-home [data-xp-query-filter="gcode"]').click();
  await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => {
    const node = document.querySelector('body > .xp-bottom-nav');
    return node && node.getClientRects().length > 0 && node.getAttribute('aria-hidden') === 'false' && !node.hasAttribute('inert');
  }, null, { timeout: 15000 });

  const utilityNavStyle = await page.locator('body > .xp-bottom-nav').evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      backgroundImage: style.backgroundImage,
      backdropFilter: style.backdropFilter || style.webkitBackdropFilter,
      radius: style.borderRadius
    };
  });
  assert(utilityNavStyle.backgroundImage === 'none', '查询工作区底部导航仍存在渐变背景');
  assert(!utilityNavStyle.backdropFilter || utilityNavStyle.backdropFilter === 'none', '查询工作区底部导航仍使用玻璃模糊');
  assert(parseFloat(utilityNavStyle.radius) <= 14, '查询工作区底部导航圆角仍然过大');

  const gcodeButton = page.locator('body > .xp-bottom-nav [data-xp-filter="gcode"]');
  await gcodeButton.waitFor({ state: 'visible', timeout: 10000 });
  await gcodeButton.click();
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
  console.log(JSON.stringify({ passed: true, copied, statusText, gameNavStyle, homeUtilityState, utilityNavStyle, trustStyle }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
