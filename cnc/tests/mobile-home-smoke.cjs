const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:4173/cnc/?smoke=industrial-home', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.launchpad-card[data-filter="gcode"]', { state: 'visible', timeout: 30000 });
  await page.waitForFunction(() => window.CNC_INDUSTRIAL_SAMPLE && window.CNC_INDUSTRIAL_SAMPLE.build === '20260722e', null, { timeout: 15000 });
  await page.waitForFunction(() => window.CNC_PERSONAL_HOME && window.CNC_PERSONAL_HOME.build === '20260722b', null, { timeout: 15000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-industrial-surface') === 'home', null, { timeout: 15000 });
  await page.waitForTimeout(1100);

  assert.equal(await page.title(), '数控小潘 CNC速查与学习助手');
  assert.equal(await page.locator('body').evaluate(node => node.classList.contains('cnc-clean-ui')), true);
  assert.equal(await page.locator('body').evaluate(node => node.classList.contains('cnc-industrial-sample')), true);
  assert.match((await page.locator('.study-card[data-level="9"] p').textContent()) || '', /不保证直线/);
  assert.match((await page.locator('.study-card[data-level="10"] p').textContent()) || '', /最小输入单位/);

  for (const selector of ['.fan-suggestion-panel', '#view-dashboard .featured-images-preview', '#view-dashboard #faq-preview-section']) {
    assert.equal(await page.locator(selector).evaluate(node => getComputedStyle(node).display), 'none');
  }

  const launchColumns = await page.locator('.launchpad-grid').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length);
  assert.equal(launchColumns, 1, '首页入口必须竖向单列');

  const firstCard = page.locator('.launchpad-card').first();
  assert.equal(await firstCard.evaluate(node => getComputedStyle(node).backgroundImage), 'none');
  assert.ok(await firstCard.locator('h3').evaluate(node => Number(getComputedStyle(node).fontWeight)) >= 800);
  assert.ok(await firstCard.evaluate(node => parseFloat(getComputedStyle(node).borderRadius)) <= 16);
  assert.notEqual(await firstCard.evaluate(node => getComputedStyle(node).boxShadow), 'none');

  const homeOrder = await page.evaluate(() => {
    const launch = document.querySelector('#view-dashboard .launchpad-grid');
    const personal = document.getElementById('xp-personal-home');
    const first = launch && launch.querySelector('.launchpad-card');
    return {
      followsTools: Boolean(launch && personal && launch.nextElementSibling === personal),
      launchTop: launch ? launch.getBoundingClientRect().top : 99999,
      personalTop: personal ? personal.getBoundingClientRect().top : -1,
      firstCardTop: first ? first.getBoundingClientRect().top : 99999,
      activeView: (document.querySelector('.view.active') || {}).id || ''
    };
  });
  assert.equal(homeOrder.activeView, 'view-dashboard', '首页必须保持为当前视图');
  assert.equal(homeOrder.followsTools, true, '学习进度必须放在首页工具卡之后');
  assert.ok(homeOrder.launchTop < homeOrder.personalTop, '工具卡必须先于学习进度出现');
  assert.ok(homeOrder.firstCardTop < 844, '手机首屏必须直接看见首页功能入口');

  const searchColumns = await page.locator('.launchpad-search-bar').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length);
  assert.equal(searchColumns, 1, '搜索框与按钮必须竖向排列');

  const personal = await page.evaluate(() => window.CNC_PERSONAL_HOME && window.CNC_PERSONAL_HOME.runCheck());
  assert.equal(Boolean(personal && personal.passed), true, '首页学习进度不能被视觉样板破坏');
  assert.equal(personal.followsTools, true, '学习进度模块必须位于工具入口之后');

  await page.locator('.launchpad-card[data-route="study"]').click();
  await page.waitForSelector('#view-study.active', { state: 'visible', timeout: 15000 });
  const studyColumns = await page.locator('.study-card-grid').first().evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length);
  assert.equal(studyColumns, 1, '课程必须继续保持竖向单列');
  assert.ok(await page.locator('.study-card h4').first().evaluate(node => Number(getComputedStyle(node).fontWeight)) >= 800);

  console.log('手机首页工具优先、学习进度顺序与课程入口通过', homeOrder);
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });