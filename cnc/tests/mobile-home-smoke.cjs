const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const DIAGNOSTIC_DIR = 'cnc/test-artifacts/industrial-card-sample';
fs.mkdirSync(DIAGNOSTIC_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => pageErrors.push(String(error.stack || error.message || error)));
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure() }));

  try {
    await page.goto('http://127.0.0.1:4173/cnc/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => {
      const visible = node => {
        if (!node) return false;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
      };
      const home = window.CNC_PERSONAL_HOME;
      const dashboard = document.querySelector('#view-dashboard.active');
      const nav = document.querySelector('body > .xp-bottom-nav');
      const hero = document.querySelector('#view-dashboard .cnc-home-hero-copy');
      const query = document.querySelector('#view-dashboard .launchpad-search');
      const practice = document.querySelector('#view-dashboard .cnc-home-route-card');
      return home?.build === '20260722b' && home?.refactorBuild === '20260804-mobile1' &&
        dashboard && visible(nav) && visible(hero) && visible(query) && visible(practice);
    }, null, { timeout: 60000 });
    await page.waitForFunction(() => window.CNC_INDUSTRIAL_SAMPLE?.build === '20260722e', null, { timeout: 60000 });
    await page.waitForTimeout(1100);

    assert.equal(await page.title(), '数控小潘 CNC速查与学习助手');
    assert.equal(await page.locator('body').evaluate(node => node.classList.contains('cnc-clean-ui')), true);
    assert.equal(await page.locator('body').evaluate(node => node.classList.contains('cnc-industrial-sample')), true);
    assert.match((await page.locator('.study-card[data-level="9"] p').textContent()) || '', /不保证直线/);
    assert.match((await page.locator('.study-card[data-level="10"] p').textContent()) || '', /最小输入单位/);

    const homeState = await page.evaluate(() => {
      const visible = node => {
        if (!node) return false;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
      };
      const nav = document.querySelector('body > .xp-bottom-nav');
      const navItems = nav ? Array.from(nav.querySelectorAll('[data-xp-route], [data-xp-filter]')).filter(visible) : [];
      const oldSelectors = [
        '#xp-game-home',
        '#xp-personal-home',
        '#view-dashboard .launchpad-grid',
        '#view-dashboard .fan-suggestion-panel',
        '#view-dashboard .recent-section',
        '#view-dashboard .featured-images-preview',
        '#view-dashboard .faq-preview-section'
      ];
      const controls = Array.from(document.querySelectorAll('#view-dashboard.active a, #view-dashboard.active button, body > .xp-bottom-nav [data-xp-route], body > .xp-bottom-nav [data-xp-filter]'))
        .filter(visible)
        .map(node => {
          const rect = node.getBoundingClientRect();
          return { text: (node.textContent || '').trim(), width: rect.width, height: rect.height };
        });
      return {
        heroVisible: visible(document.querySelector('#view-dashboard .cnc-home-hero-copy')),
        queryVisible: visible(document.querySelector('#view-dashboard .launchpad-search')),
        practiceVisible: visible(document.querySelector('#view-dashboard .cnc-home-route-card')),
        navVisible: visible(nav),
        navCount: navItems.length,
        navLabels: navItems.map(node => (node.textContent || '').replace(/\s+/g, ' ').trim()),
        oldVisible: oldSelectors.filter(selector => visible(document.querySelector(selector))),
        smallTargets: controls.filter(item => item.height < 44),
        scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        clientWidth: document.documentElement.clientWidth,
        personal: window.CNC_PERSONAL_HOME?.runCheck?.() || null
      };
    });

    assert.equal(homeState.heroVisible, true, '手机首页必须显示学习主入口');
    assert.equal(homeState.queryVisible, true, '手机首页必须显示查询入口');
    assert.equal(homeState.practiceVisible, true, '手机首页必须显示练习入口');
    assert.equal(homeState.navVisible, true, '手机首页必须显示真实底部导航');
    assert.equal(homeState.navCount, 5, `手机首页底部导航必须稳定为5项，实际${homeState.navCount}项`);
    assert.deepEqual(homeState.navLabels, ['首页', '查代码', '报警', '学习', '我的'], `手机首页底栏顺序或中文名称漂移：${homeState.navLabels.join(' / ')}`);
    assert.deepEqual(homeState.oldVisible, [], `手机端不得恢复第二套旧首页：${homeState.oldVisible.join('、')}`);
    assert.deepEqual(homeState.smallTargets, [], '手机首页可见按钮和链接高度不得小于44px');
    assert.ok(homeState.scrollWidth <= homeState.clientWidth + 1, `390px手机首页不得横向溢出：${homeState.scrollWidth}/${homeState.clientWidth}`);
    assert.equal(homeState.personal?.legacyHomeRemoved, true, '兼容层必须确认旧首页已移除');
    assert.equal(homeState.personal?.bottomNavReady, true, '兼容层必须确认真实底栏可见');
    assert.equal(homeState.personal?.courseImages, 12, '12关课程必须各有一张学习图片');

    await page.locator('body > .xp-bottom-nav [data-xp-route="study"]').click();
    await page.waitForSelector('#view-study.active', { state: 'visible', timeout: 15000 });
    await page.waitForFunction(() => document.querySelectorAll('#view-study .study-card[data-level] .study-card-thumb').length === 12, null, { timeout: 15000 });
    const study = await page.evaluate(() => {
      const grid = document.querySelector('#view-study.active .study-card-grid');
      const cards = Array.from(document.querySelectorAll('#view-study.active .study-card[data-level]'));
      const images = cards.map(card => card.querySelector('.study-card-thumb'));
      return {
        columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean).length : 0,
        cards: cards.length,
        images: images.filter(Boolean).length,
        missingAlt: images.filter(image => image && !image.alt.trim()).length,
        minTargetHeight: cards.length ? Math.min(...cards.map(card => card.getBoundingClientRect().height)) : 0
      };
    });
    assert.equal(study.columns, 1, '课程必须继续保持竖向单列');
    assert.equal(study.cards, 12, '课程页必须保持固定12关');
    assert.equal(study.images, 12, '12关课程图片必须完整');
    assert.equal(study.missingAlt, 0, '课程图片必须具备中文替代文字');
    assert.ok(study.minTargetHeight >= 44, '课程卡片触控高度不得小于44px');
    assert.ok(await page.locator('.study-card h4').first().evaluate(node => Number(getComputedStyle(node).fontWeight)) >= 800);

    await page.screenshot({ path: `${DIAGNOSTIC_DIR}/mobile-home-current-390x844.png`, fullPage: true });
    fs.writeFileSync(`${DIAGNOSTIC_DIR}/mobile-home-current-report.json`, JSON.stringify({ homeState, study, consoleErrors, pageErrors, failedRequests }, null, 2));

    assert.deepEqual(pageErrors, [], `手机首页不能出现页面错误：${pageErrors.join(' | ')}`);
    assert.deepEqual(consoleErrors, [], `手机首页不能出现控制台错误：${consoleErrors.join(' | ')}`);
    assert.deepEqual(failedRequests, [], `手机首页不能出现资源请求失败：${JSON.stringify(failedRequests)}`);
    console.log('手机单层首页、真实底栏、工业样板、触控尺寸与12关课程入口通过', { homeState, study });
  } catch (error) {
    fs.writeFileSync(`${DIAGNOSTIC_DIR}/mobile-home-current-error.txt`, `${error.stack || error}\n`);
    try { await page.screenshot({ path: `${DIAGNOSTIC_DIR}/mobile-home-current-error-390x844.png`, fullPage: true }); } catch (_) {}
    throw error;
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });