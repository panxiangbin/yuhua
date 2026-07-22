const { chromium } = require('playwright');

(async () => {
  const base = process.env.CNC_URL || 'http://127.0.0.1:4173';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  await page.goto(base + '/cnc/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.CNC_INDUSTRIAL_TOOLS && window.CNC_INDUSTRIAL_TOOLS.build === '20260722d');
  const home = await page.locator('#view-dashboard').evaluate(el => el.classList.contains('active'));
  if (!home) throw new Error('根网址启动后没有稳定停留在首页');

  const trigger = page.locator('[data-route="calculator"]').first();
  await trigger.click();
  await page.waitForFunction(() => document.querySelector('#view-calculator.view.active') && document.body.classList.contains('cnc-industrial-tools'));
  const check = await page.evaluate(() => window.CNC_INDUSTRIAL_TOOLS.runCheck());
  if (!check.passed || check.cards !== 6 || !check.accessible) throw new Error('工具页工业卡片验收失败: ' + JSON.stringify(check));

  const metrics = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#view-calculator .calc-card')];
    const input = document.querySelector('#view-calculator .calc-input');
    const button = document.querySelector('#view-calculator .calc-btn');
    const result = document.querySelector('#view-calculator .calc-result');
    const first = cards[0] && cards[0].getBoundingClientRect();
    const second = cards[1] && cards[1].getBoundingClientRect();
    return {
      cardRadius: cards[0] ? getComputedStyle(cards[0]).borderRadius : '',
      inputHeight: input ? input.getBoundingClientRect().height : 0,
      buttonHeight: button ? button.getBoundingClientRect().height : 0,
      resultSize: result ? parseFloat(getComputedStyle(result).fontSize) : 0,
      singleColumn: Boolean(first && second && second.top > first.bottom)
    };
  });
  if (metrics.cardRadius !== '14px' || metrics.inputHeight < 48 || metrics.buttonHeight < 48 || metrics.resultSize < 24 || !metrics.singleColumn) {
    throw new Error('工具页手机几何规范失败: ' + JSON.stringify(metrics));
  }

  const firstCard = page.locator('#view-calculator .calc-card').first();
  const firstHeader = firstCard.locator('.calc-card-header');
  if ((await firstHeader.getAttribute('aria-expanded')) === 'false') await firstHeader.click();
  const inputs = firstCard.locator('.calc-input');
  await inputs.nth(0).fill('150');
  await inputs.nth(1).fill('10');
  await firstCard.locator('.calc-btn').click();
  await page.waitForFunction(() => {
    const text = document.querySelector('#view-calculator .calc-card .calc-result')?.textContent || '';
    return /4775\s*rpm/i.test(text);
  });
  const ariaLive = await firstCard.locator('.calc-result').getAttribute('aria-live');
  if (ariaLive !== 'polite') throw new Error('计算结果未提供屏幕阅读器播报');

  await firstHeader.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(80);
  const collapsed = await firstHeader.getAttribute('aria-expanded');
  if (collapsed !== 'false') throw new Error('键盘 Enter 未能收起计算卡片');

  await page.locator('#view-calculator .sub-nav-btn').first().click();
  await page.waitForFunction(() => document.querySelector('#view-dashboard.view.active'));
  if (errors.length) throw new Error('控制台错误: ' + errors.join(' | '));
  console.log(JSON.stringify({ passed: true, check, metrics, result: '4775 rpm' }));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
