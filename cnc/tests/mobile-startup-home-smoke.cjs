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

async function trustedClickHiddenRoute(page, selector) {
  const route = page.locator(selector);
  await route.waitFor({ state: 'attached', timeout: 15000 });
  await route.evaluate(node => {
    node.dataset.smokeOriginalStyle = node.getAttribute('style') || '';
    Object.assign(node.style, {
      position: 'fixed',
      left: '16px',
      top: '16px',
      width: '160px',
      height: '48px',
      display: 'block',
      visibility: 'visible',
      opacity: '1',
      pointerEvents: 'auto',
      zIndex: '2147483647'
    });
  });
  await route.click();
  await route.evaluate(node => {
    const original = node.dataset.smokeOriginalStyle || '';
    if (original) node.setAttribute('style', original);
    else node.removeAttribute('style');
    delete node.dataset.smokeOriginalStyle;
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  const first = await createPage(browser);
  await first.page.goto('http://127.0.0.1:4173/cnc/?smoke=startup-home', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await first.page.waitForSelector('#xp-game-home[data-ready="true"]', {
    state: 'visible',
    timeout: 30000
  });
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
    '根网址启动阶段必须稳定停在首页'
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

  // 等待启动保护窗口完整结束后，把手机端隐藏的既有路由按钮临时放入视口，
  // 再由 Playwright 发出真实浏览器点击；产品路由与首页保护逻辑均按原链路执行。
  await first.page.waitForTimeout(3500);
  await trustedClickHiddenRoute(first.page, '#sidebar .tree-item[data-route="study"]');
  await first.page.waitForSelector('#view-study.active', { state: 'visible', timeout: 15000 });
  await first.page.waitForTimeout(2100);
  assert.equal(
    await first.page.locator('#view-study').evaluate(node => node.classList.contains('active')),
    true,
    '用户主动点击新手学习后必须正常停留'
  );
  assert.equal(
    (await first.page.evaluate(() => window.CNC_STARTUP_HOME_GUARD.runCheck())).userRouteRequested,
    true,
    '必须识别产品路由按钮的可信点击操作'
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
    'BFCache恢复根网址时必须回到首页'
  );

  const relevantSecondErrors = [...second.pageErrors, ...second.consoleErrors]
    .filter(text => /startup-home|CNC_STARTUP_HOME_GUARD|TypeError|ReferenceError/i.test(text));
  assert.deepEqual(relevantSecondErrors, []);

  console.log('手机根网址启动稳定性通过', {
    startupReport,
    activeView: await second.page.locator('.view.active').getAttribute('id')
  });

  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});