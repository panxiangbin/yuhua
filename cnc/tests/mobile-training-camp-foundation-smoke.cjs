const { chromium } = require('playwright');
const assert = require('node:assert/strict');

async function trustedClickHiddenRoute(page, selector) {
  const route = page.locator(selector);
  await route.waitFor({ state: 'attached', timeout: 15000 });
  const markerId = `cnc-training-route-marker-${Date.now()}`;
  const routeId = `cnc-training-route-target-${Date.now()}`;

  await route.evaluate((node, ids) => {
    const marker = document.createElement('span');
    marker.id = ids.markerId;
    marker.hidden = true;
    node.parentNode.insertBefore(marker, node);
    node.dataset.trainingOriginalStyle = node.getAttribute('style') || '';
    node.dataset.trainingOriginalId = node.id || '';
    node.id = ids.routeId;
    document.body.appendChild(node);
    Object.assign(node.style, {
      position: 'fixed',
      left: '16px',
      top: '16px',
      width: '180px',
      height: '48px',
      display: 'block',
      visibility: 'visible',
      opacity: '1',
      pointerEvents: 'auto',
      zIndex: '2147483647'
    });
  }, { markerId, routeId });

  try {
    await page.locator(`#${routeId}`).click({ timeout: 15000 });
  } finally {
    await page.evaluate(({ routeId, markerId }) => {
      const node = document.getElementById(routeId);
      const marker = document.getElementById(markerId);
      if (!node) return;
      const originalStyle = node.dataset.trainingOriginalStyle || '';
      const originalId = node.dataset.trainingOriginalId || '';
      if (originalStyle) node.setAttribute('style', originalStyle);
      else node.removeAttribute('style');
      if (originalId) node.id = originalId;
      else node.removeAttribute('id');
      delete node.dataset.trainingOriginalStyle;
      delete node.dataset.trainingOriginalId;
      if (marker && marker.parentNode) {
        marker.parentNode.insertBefore(node, marker);
        marker.remove();
      }
    }, { routeId, markerId });
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/cnc/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_PERSONAL_HOME && window.CNC_PERSONAL_HOME.trainingBuild === '20260728a', null, { timeout: 20000 });
  await page.waitForSelector('#xp-game-home[data-ready="true"]', { state: 'visible', timeout: 60000 });
  await page.waitForSelector('#xp-personal-home', { state: 'attached', timeout: 20000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-startup-home') === 'stable', null, { timeout: 15000 });

  const startup = await page.evaluate(() => ({
    activeView: (document.querySelector('.view.active') || {}).id || '',
    stable: document.body.getAttribute('data-cnc-startup-home'),
    trainingBuild: document.body.dataset.cncTrainingBuild,
    legacyDisplay: getComputedStyle(document.getElementById('xp-personal-home')).display,
    gameDisplay: getComputedStyle(document.getElementById('xp-game-home')).display,
    api: window.CNC_PERSONAL_HOME.runCheck()
  }));
  console.log('training startup', JSON.stringify(startup));
  assert.equal(startup.activeView, 'view-dashboard', 'CNC 根网址必须稳定停留首页');
  assert.equal(startup.stable, 'stable', '启动守卫必须确认首页稳定');
  assert.equal(startup.trainingBuild, '20260728a');
  assert.equal(startup.legacyDisplay, 'none', '手机端旧个人首页必须隐藏');
  assert.notEqual(startup.gameDisplay, 'none', '手机端闯关首页必须显示');
  assert.equal(startup.api.passed, true);
  assert.equal(startup.api.profileVersion, 1);

  const home = page.locator('#xp-personal-home');
  assert.match((await home.locator('h2').textContent()) || '', /零基础|训练/);
  assert.equal(await home.locator('.xp-progress-number').count(), 1);

  await page.waitForTimeout(5600);
  await trustedClickHiddenRoute(page, '#sidebar .tree-item[data-route="study"]');
  await page.waitForSelector('#view-study.active', { state: 'visible', timeout: 15000 });
  await page.waitForSelector('#xp-training-overview', { state: 'visible', timeout: 15000 });

  const overview = page.locator('#xp-training-overview');
  assert.match((await overview.locator('h4').textContent()) || '', /独立完成首件/);
  const roadmapCards = overview.locator('.xp-roadmap-card');
  assert.equal(await roadmapCards.count(), 4, '必须展示完整四阶段成长路线');
  const roadmapText = (await roadmapCards.allTextContents()).join(' ');
  assert.match(roadmapText, /零基础入门/);
  assert.match(roadmapText, /现场基础/);
  assert.match(roadmapText, /编程入门/);
  assert.match(roadmapText, /独立首件/);
  assert.match(roadmapText, /第\s*1[—-]3\s*关/);
  assert.match(roadmapText, /第\s*4[—-]8\s*关/);
  assert.match(roadmapText, /第\s*9[—-]11\s*关/);
  assert.match(roadmapText, /第\s*12\s*关/);

  const stats = overview.locator('.xp-training-stat');
  assert.equal(await stats.count(), 3, '训练营概览必须展示经验值、通关数和待复习错题三项统计');
  const statsText = (await stats.allTextContents()).join(' ');
  assert.match(statsText, /累计经验值/);
  assert.match(statsText, /已通过关卡/);
  assert.match(statsText, /待复习错题/);
  assert.match(statsText, /0\s*\/\s*12/, '零记录新手必须明确显示0/12关，不能伪造进度');

  assert.equal(await page.locator('#view-study .study-card[data-training-ready="true"]').count(), 12, '12关必须全部纳入训练营基础结构');
  assert.equal(await page.locator('#view-study .study-card .xp-course-meta').count(), 12, '12关都必须展示学习目标、易错提醒和闯关说明');

  const layout = await overview.evaluate(node => {
    const stats = node.querySelector('.xp-training-stats');
    const cards = Array.from(node.querySelectorAll('.xp-training-stat')).map(card => card.getBoundingClientRect());
    return {
      columns: getComputedStyle(stats).gridTemplateColumns.split(' ').filter(Boolean).length,
      singleColumn: cards.every((rect, index) => index === 0 || Math.abs(rect.left - cards[0].left) < 2),
      widths: cards.map(rect => Math.round(rect.width))
    };
  });
  console.log('training layout', JSON.stringify(layout));
  assert.equal(layout.singleColumn, true, '手机端训练数据必须按真实视觉位置单列显示');
  assert.ok(layout.widths.every(width => width >= 300), '手机端三项训练统计必须保持可读的整行宽度');
  assert.deepEqual(errors, []);

  console.log('CNC新手训练营基础、四阶段十二关路线、版本化成长档案与统计概览通过', {
    trainingBuild: startup.trainingBuild,
    roadmap: 4,
    lessons: 12,
    profileVersion: startup.api.profileVersion,
    stats: 3
  });
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });