const { chromium } = require('playwright');
const assert = require('node:assert/strict');

async function createPage(browser) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error.message || error)));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  return { page, pageErrors, consoleErrors };
}

async function waitForSingleLayerHome(page) {
  await page.waitForFunction(() => {
    const state = window.CNC_PERSONAL_HOME?.runCheck?.();
    const dashboard = document.querySelector('#view-dashboard');
    const nav = document.querySelector('body > .xp-bottom-nav');
    const visible = node => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    return state?.legacyHomeRemoved === true &&
      state?.bottomNavReady === true &&
      dashboard?.classList.contains('active') &&
      visible(nav) &&
      nav.getAttribute('aria-hidden') === 'false' &&
      !nav.hasAttribute('inert');
  }, null, { timeout: 30000 });
}

async function clickVisibleStudyRoute(page) {
  const route = page.locator('body > .xp-bottom-nav button[data-xp-route="study"]');
  await route.waitFor({ state: 'visible', timeout: 15000 });
  const box = await route.boundingBox();
  assert.ok(box && box.width >= 44 && box.height >= 44, `手机学习入口触控区不足44px：${JSON.stringify(box)}`);
  await route.click({ timeout: 15000 });
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  const first = await createPage(browser);
  await first.page.goto('http://127.0.0.1:4173/cnc/?smoke=startup-home', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await waitForSingleLayerHome(first.page);
  await first.page.waitForFunction(() => {
    return window.CNC_STARTUP_HOME_GUARD &&
      window.CNC_STARTUP_HOME_GUARD.build === '20260722a';
  }, null, { timeout: 15000 });

  // 模拟启动阶段某个延迟脚本错误地把页面带到新手学习。
  await first.page.evaluate(() => {
    window.setTimeout(() => {
      if (typeof window.navigate === 'function') {
        window.navigate('study');
      }
    }, 120);
  });

  await first.page.waitForTimeout(2100);
  assert.equal(
    await first.page.locator('#view-dashboard').evaluate(node => node.classList.contains('active')),
    true,
    '根网址启动阶段必须稳定停在单层手机首页'
  );
  assert.equal(
    await first.page.locator('#view-study').evaluate(node => node.classList.contains('active')),
    false,
    '启动阶段不能被脚本自动带进新手学习'
  );
  assert.equal(await first.page.evaluate(() => location.hash), '', '根网址不能残留 #study');
  const startupReport = await first.page.evaluate(() => window.CNC_STARTUP_HOME_GUARD.runCheck());
  assert.equal(startupReport.passed, true);
  assert.ok(startupReport.forceCount >= 1, '测试必须真实触发一次自动跳转拦截');

  // 等待启动保护窗口结束后，真实点击手机底栏“学习”入口。
  await first.page.waitForTimeout(3500);
  await clickVisibleStudyRoute(first.page);
  await first.page.waitForSelector('#view-study.active', { state: 'visible', timeout: 15000 });
  await first.page.waitForTimeout(2100);
  assert.equal(
    await first.page.locator('#view-study').evaluate(node => node.classList.contains('active')),
    true,
    '用户主动点击手机学习入口后必须正常停留'
  );
  assert.equal(
    (await first.page.evaluate(() => window.CNC_STARTUP_HOME_GUARD.runCheck())).userRouteRequested,
    true,
    '必须识别手机底栏路由按钮的可信点击操作'
  );

  const relevantFirstErrors = [...first.pageErrors, ...first.consoleErrors]
    .filter(text => /startup-home|CNC_STARTUP_HOME_GUARD|TypeError|ReferenceError/i.test(text));
  assert.deepEqual(relevantFirstErrors, []);
  await first.page.close();

  // 模拟手机浏览器从 BFCache 恢复了错误的学习页 DOM，但地址仍是根网址。
  const second = await createPage(browser);
  await second.page.goto('http://127.0.0.1:4173/cnc/?smoke=startup-pageshow', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await waitForSingleLayerHome(second.page);
  await second.page.waitForFunction(() => {
    return window.CNC_STARTUP_HOME_GUARD &&
      window.CNC_STARTUP_HOME_GUARD.build === '20260722a';
  }, null, { timeout: 15000 });
  await second.page.evaluate(() => {
    history.replaceState(history.state, '', location.pathname + location.search);
    document.querySelectorAll('.view').forEach(node => {
      node.classList.toggle('active', node.id === 'view-study');
    });
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await second.page.waitForTimeout(2100);
  assert.equal(
    await second.page.locator('#view-dashboard').evaluate(node => node.classList.contains('active')),
    true,
    'BFCache恢复根网址时必须回到单层手机首页'
  );
  assert.equal(
    await second.page.locator('#view-study').evaluate(node => node.classList.contains('active')),
    false,
    'BFCache恢复根网址时学习页不得继续激活'
  );

  const relevantSecondErrors = [...second.pageErrors, ...second.consoleErrors]
    .filter(text => /startup-home|CNC_STARTUP_HOME_GUARD|TypeError|ReferenceError/i.test(text));
  assert.deepEqual(relevantSecondErrors, []);

  console.log('手机根网址单层首页启动稳定性通过', {
    startupReport,
    activeView: await second.page.locator('.view.active').getAttribute('id'),
    personalHome: await second.page.evaluate(() => window.CNC_PERSONAL_HOME?.runCheck?.())
  });

  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
