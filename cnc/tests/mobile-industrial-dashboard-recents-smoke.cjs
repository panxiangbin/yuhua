const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const mobileErrors = [];
  const mobileHttpErrors = [];
  await mobile.addInitScript(() => localStorage.setItem('cnc_app_recents_v2', '[]'));
  const page = await mobile.newPage();
  page.on('console', message => { if (message.type() === 'error') mobileErrors.push(message.text()); });
  page.on('pageerror', error => mobileErrors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400) mobileHttpErrors.push(`${response.status()} ${response.url()}`);
  });

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=dashboard-recents', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_INDUSTRIAL_SAMPLE && window.CNC_INDUSTRIAL_SAMPLE.build === '20260722e', null, { timeout: 20000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-industrial-surface') === 'home', null, { timeout: 15000 });
  await page.waitForSelector('#xp-game-home[data-ready="true"]', { state: 'attached', timeout: 60000 });

  // 手机首页样式由 personal-home.js 动态声明。必须等真实 load 完成；资源失败会直接报错。
  const gameStyle = page.locator('link[data-cnc-mobile-home-game]');
  await gameStyle.waitFor({ state: 'attached', timeout: 20000 });
  assert.match((await gameStyle.getAttribute('href')) || '', /mobile-home-game\.css\?v=\d{8}[a-z0-9-]*$/i, '手机闯关首页必须声明版本化样式资源');
  await gameStyle.evaluate((link) => {
    if (link.sheet) return true;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('手机闯关首页样式资源加载超时: ' + link.href)), 20000);
      link.addEventListener('load', () => { clearTimeout(timer); resolve(true); }, { once: true });
      link.addEventListener('error', () => { clearTimeout(timer); reject(new Error('手机闯关首页样式资源加载失败: ' + link.href)); }, { once: true });
    });
  });

  const mobileHomeState = await page.evaluate(async () => {
    const link = document.querySelector('link[data-cnc-mobile-home-game]');
    const gameHome = document.querySelector('#xp-game-home[data-ready="true"]');
    const recent = document.querySelector('#dashboard-recent-section');
    const cssText = link ? await fetch(link.href, { cache: 'no-store' }).then(response => response.text()) : '';
    return {
      innerWidth: window.innerWidth,
      mediaMatches: window.matchMedia('(max-width:760px)').matches,
      bodyClasses: document.body.className,
      linkHref: link ? link.href : '',
      stylesheetReady: Boolean(link && link.sheet),
      servedCssHasRecentRule: cssText.includes('#dashboard-recent-section'),
      gameDisplay: gameHome ? getComputedStyle(gameHome).display : 'missing',
      recentDisplay: recent ? getComputedStyle(recent).display : 'missing'
    };
  });
  assert.equal(mobileHomeState.innerWidth, 390, '手机视口必须为390px: ' + JSON.stringify(mobileHomeState));
  assert.equal(mobileHomeState.mediaMatches, true, '手机媒体查询必须命中: ' + JSON.stringify(mobileHomeState));
  assert.match(mobileHomeState.bodyClasses, /cnc-game-home-enabled/, '手机闯关首页状态类必须存在: ' + JSON.stringify(mobileHomeState));
  assert.equal(mobileHomeState.stylesheetReady, true, '手机闯关首页样式表必须完成解析: ' + JSON.stringify(mobileHomeState));
  assert.equal(mobileHomeState.servedCssHasRecentRule, true, '实际服务的手机首页CSS必须包含最近查看隐藏规则: ' + JSON.stringify(mobileHomeState));
  assert.notEqual(mobileHomeState.gameDisplay, 'none', '手机闯关首页必须可见: ' + JSON.stringify(mobileHomeState));
  assert.equal(mobileHomeState.recentDisplay, 'none', '旧最近查看区域在手机端必须隐藏: ' + JSON.stringify(mobileHomeState));
  await page.waitForSelector('#xp-game-home[data-ready="true"]', { state: 'visible', timeout: 15000 });

  // 从手机端真实打开一个工业知识条目，确认最近查看记录仍会被写入。
  await page.locator('.xp-bottom-nav [data-xp-filter="gcode"]').click();
  await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 15000 });
  await page.locator('#search-input').fill('G01');
  await page.waitForSelector('#result-list [data-open-entry]', { state: 'visible', timeout: 15000 });
  await page.locator('#result-list [data-open-entry]').first().click();
  await page.waitForSelector('#detail-panel.mobile-open', { state: 'visible', timeout: 15000 });
  const savedRecents = await page.evaluate(() => JSON.parse(localStorage.getItem('cnc_app_recents_v2') || '[]'));
  assert.ok(Array.isArray(savedRecents) && savedRecents.length > 0, '手机端打开条目后必须写入最近查看记录');
  assert.equal(mobileErrors.length, 0, '手机端最近查看写入不应产生控制台错误: ' + mobileErrors.join(' | ') + '; HTTP错误: ' + mobileHttpErrors.join(' | '));
  assert.equal(mobileHttpErrors.length, 0, '手机端最近查看写入不应请求失败资源: ' + mobileHttpErrors.join(' | '));
  await mobile.close();

  // 桌面端仍保留工具型首页，并负责呈现最近查看卡片。
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const desktopErrors = [];
  const desktopHttpErrors = [];
  await desktop.addInitScript((recents) => localStorage.setItem('cnc_app_recents_v2', JSON.stringify(recents)), savedRecents);
  const desktopPage = await desktop.newPage();
  desktopPage.on('console', message => { if (message.type() === 'error') desktopErrors.push(message.text()); });
  desktopPage.on('pageerror', error => desktopErrors.push(error.message));
  desktopPage.on('response', response => {
    if (response.status() >= 400) desktopHttpErrors.push(`${response.status()} ${response.url()}`);
  });
  await desktopPage.goto('http://127.0.0.1:4173/cnc/?smoke=dashboard-recents-desktop', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await desktopPage.waitForFunction(() => window.CNC_INDUSTRIAL_SAMPLE && window.CNC_INDUSTRIAL_SAMPLE.build === '20260722e', null, { timeout: 20000 });
  await desktopPage.waitForSelector('#dashboard-recent-section', { state: 'visible', timeout: 20000 });
  await desktopPage.waitForSelector('#dashboard-recent-list .recent-card', { state: 'visible', timeout: 15000 });
  await desktopPage.waitForFunction(() => {
    const card = document.querySelector('#dashboard-recent-list .recent-card');
    return Boolean(card && card.getBoundingClientRect().height >= 56);
  }, null, { timeout: 15000 });

  const card = desktopPage.locator('#dashboard-recent-list .recent-card').first();
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
  await desktopPage.keyboard.press('Enter');
  await desktopPage.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 15000 });
  assert.equal(desktopErrors.length, 0, '桌面首页最近查看流程不应产生控制台错误: ' + desktopErrors.join(' | ') + '; HTTP错误: ' + desktopHttpErrors.join(' | '));
  assert.equal(desktopHttpErrors.length, 0, '桌面首页最近查看流程不应请求失败资源: ' + desktopHttpErrors.join(' | '));

  console.log('手机端最近查看写入与桌面端工业卡继续查看通过');
  await desktop.close();
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
