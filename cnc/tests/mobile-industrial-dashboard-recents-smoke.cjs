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
  await page.waitForFunction(() => {
    const home = window.CNC_PERSONAL_HOME?.runCheck?.();
    const nav = document.querySelector('body > .xp-bottom-nav');
    return home?.legacyHomeRemoved === true
      && home?.bottomNavReady === true
      && document.body.getAttribute('data-cnc-startup-home') === 'stable'
      && nav?.getClientRects().length > 0
      && nav.getAttribute('aria-hidden') === 'false'
      && !nav.hasAttribute('inert');
  }, null, { timeout: 20000 });

  const mobileHomeState = await page.evaluate(() => {
    const recent = document.querySelector('#dashboard-recent-section');
    const nav = document.querySelector('body > .xp-bottom-nav');
    const navButtons = Array.from(nav?.querySelectorAll('button[data-xp-route],button[data-xp-filter]') || []);
    return {
      innerWidth: window.innerWidth,
      mediaMatches: window.matchMedia('(max-width:760px)').matches,
      activeView: document.querySelector('.view.active')?.id || '',
      oldHomes: document.querySelectorAll('#xp-game-home,#xp-personal-home').length,
      legacyStyleLinks: document.querySelectorAll('link[data-cnc-mobile-home-game]').length,
      legacyGameClass: document.body.classList.contains('cnc-game-home-enabled'),
      recentDisplay: recent ? getComputedStyle(recent).display : 'missing',
      navVisible: Boolean(nav && nav.getClientRects().length > 0),
      navAriaHidden: nav?.getAttribute('aria-hidden') || '',
      navInert: Boolean(nav?.hasAttribute('inert')),
      navCount: navButtons.length,
      navLabels: navButtons.map(button => button.querySelector('span')?.textContent.trim() || button.getAttribute('aria-label') || button.textContent.trim()),
      home: window.CNC_PERSONAL_HOME?.runCheck?.() || null
    };
  });
  assert.equal(mobileHomeState.innerWidth, 390, '手机视口必须为390px: ' + JSON.stringify(mobileHomeState));
  assert.equal(mobileHomeState.mediaMatches, true, '手机媒体查询必须命中: ' + JSON.stringify(mobileHomeState));
  assert.equal(mobileHomeState.activeView, 'view-dashboard', '根网址必须稳定停留单层首页: ' + JSON.stringify(mobileHomeState));
  assert.equal(mobileHomeState.oldHomes, 0, '已删除的双首页节点不得重新出现: ' + JSON.stringify(mobileHomeState));
  assert.equal(mobileHomeState.legacyStyleLinks, 0, '已废弃的闯关首页样式资源不得重新挂载: ' + JSON.stringify(mobileHomeState));
  assert.equal(mobileHomeState.legacyGameClass, false, '已废弃的闯关首页状态类不得重新启用: ' + JSON.stringify(mobileHomeState));
  assert.equal(mobileHomeState.home?.legacyHomeRemoved, true, '单层首页自检必须确认旧首页已移除: ' + JSON.stringify(mobileHomeState));
  assert.equal(mobileHomeState.home?.bottomNavReady, true, '单层首页自检必须确认真实底栏就绪: ' + JSON.stringify(mobileHomeState));
  assert.equal(mobileHomeState.recentDisplay, 'none', '旧最近查看区域在手机端必须隐藏: ' + JSON.stringify(mobileHomeState));
  assert.equal(mobileHomeState.navVisible, true, '手机真实底栏必须可见: ' + JSON.stringify(mobileHomeState));
  assert.equal(mobileHomeState.navAriaHidden, 'false', '手机真实底栏不得对辅助技术隐藏: ' + JSON.stringify(mobileHomeState));
  assert.equal(mobileHomeState.navInert, false, '手机真实底栏不得处于 inert 状态: ' + JSON.stringify(mobileHomeState));
  assert.equal(mobileHomeState.navCount, 5, '手机真实底栏必须严格保持5项: ' + JSON.stringify(mobileHomeState));
  assert.deepEqual(mobileHomeState.navLabels, ['首页', '查代码', '报警', '学习', '我的'], '手机真实底栏名称和顺序不得漂移');

  // 通过单层首页真实可见的“查代码”底栏进入工作区，并确认入口触控和可访问名称合格。
  await page.waitForFunction(() => window.CNC_TRUST_NAV && window.CNC_TRUST_NAV.build === '20260721s' && (window.__CNC_TRUST_READY_AT__ || 0) > 0, null, { timeout: 15000 });
  const gcodeNav = page.locator('body > .xp-bottom-nav button[data-xp-filter="gcode"]');
  await gcodeNav.waitFor({ state: 'visible', timeout: 15000 });
  const gcodeTarget = await gcodeNav.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      label: node.getAttribute('aria-label') || node.querySelector('span')?.textContent.trim() || node.textContent.trim()
    };
  });
  assert.ok(gcodeTarget.width >= 44, `查代码底栏入口宽度不得小于44px：${gcodeTarget.width}`);
  assert.ok(gcodeTarget.height >= 48, `查代码底栏入口高度不得小于48px：${gcodeTarget.height}`);
  assert.match(gcodeTarget.label, /查代码|G代码/, '查代码底栏入口必须有明确中文名称');
  await gcodeNav.click();
  await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => {
    const nav = document.querySelector('body > .xp-bottom-nav');
    const gcode = nav?.querySelector('button[data-xp-filter="gcode"]');
    return Boolean(
      nav && nav.getClientRects().length > 0 && nav.getAttribute('aria-hidden') === 'false' &&
      !nav.hasAttribute('inert') && gcode?.getAttribute('aria-current') === 'page'
    );
  }, null, { timeout: 15000 });

  // 从手机端真实打开一个工业知识条目，确认最近查看记录仍会被写入。
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
  await desktopPage.waitForFunction(() => window.CNC_TRUST_NAV && window.CNC_TRUST_NAV.build === '20260721s' && (window.__CNC_TRUST_READY_AT__ || 0) > 0, null, { timeout: 15000 });
  await desktopPage.waitForFunction(() => {
    const loading = document.querySelector('#loading-screen');
    return !loading || getComputedStyle(loading).display === 'none';
  }, null, { timeout: 15000 });
  await desktopPage.waitForSelector('#dashboard-recent-section', { state: 'visible', timeout: 20000 });
  await desktopPage.waitForSelector('#dashboard-recent-list .recent-card', { state: 'visible', timeout: 15000 });
  await desktopPage.waitForFunction(() => {
    const card = document.querySelector('#dashboard-recent-list .recent-card');
    return Boolean(
      card &&
      card.getBoundingClientRect().height >= 56 &&
      card.dataset.industrialKeyboardBound === 'true'
    );
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
  assert.equal(await card.evaluate(node => document.activeElement === node), true, '桌面最近查看卡片必须可通过键盘聚焦');
  await card.press('Enter');
  await desktopPage.waitForTimeout(600);
  const keyboardNavigationState = await desktopPage.evaluate(() => {
    const guard = window.CNC_STARTUP_HOME_GUARD;
    let guardReport = null;
    try { guardReport = guard && typeof guard.runCheck === 'function' ? guard.runCheck() : null; } catch (error) {
      guardReport = { error: String(error && error.message ? error.message : error) };
    }
    return {
      activeView: document.querySelector('.view.active')?.id || '',
      dashboardActive: document.querySelector('#view-dashboard')?.classList.contains('active') || false,
      workspaceActive: document.querySelector('#view-workspace')?.classList.contains('active') || false,
      focusedClass: document.activeElement?.className || '',
      guardKeys: guard ? Object.keys(guard) : [],
      guardReport,
      manifest: window.CNC_KB_CONTENT_MANIFEST || null,
      href: location.href
    };
  });
  assert.equal(
    keyboardNavigationState.workspaceActive,
    true,
    '桌面最近查看卡片按 Enter 后必须进入工作区，诊断=' + JSON.stringify(keyboardNavigationState)
  );
  assert.equal(desktopErrors.length, 0, '桌面首页最近查看流程不应产生控制台错误: ' + desktopErrors.join(' | ') + '; HTTP错误: ' + desktopHttpErrors.join(' | '));
  assert.equal(desktopHttpErrors.length, 0, '桌面首页最近查看流程不应请求失败资源: ' + desktopHttpErrors.join(' | '));

  console.log('单层首页真实入口、手机端最近查看写入与桌面端工业卡继续查看通过');
  await desktop.close();
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
