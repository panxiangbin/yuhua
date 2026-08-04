const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('http://127.0.0.1:4173/cnc/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => {
    const home = window.CNC_PERSONAL_HOME?.runCheck?.();
    const nav = document.querySelector('body > .xp-bottom-nav');
    return home?.legacyHomeRemoved === true
      && home?.bottomNavReady === true
      && nav?.getClientRects().length > 0
      && nav.getAttribute('aria-hidden') === 'false'
      && !nav.hasAttribute('inert');
  }, null, { timeout: 20000 });
  await page.waitForFunction(() => window.CNC_TRAINING_PROFILE?.build === '20260724a', null, { timeout: 20000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-startup-home') === 'stable', null, { timeout: 15000 });

  const startup = await page.evaluate(() => ({
    activeView: (document.querySelector('.view.active') || {}).id || '',
    stable: document.body.getAttribute('data-cnc-startup-home'),
    oldHomes: Array.from(document.querySelectorAll('#xp-game-home,#xp-personal-home')).map(node => node.id),
    api: window.CNC_PERSONAL_HOME.runCheck(),
    profileApi: {
      build: window.CNC_TRAINING_PROFILE?.build || '',
      snapshot: typeof window.CNC_TRAINING_PROFILE?.snapshot === 'function',
      render: typeof window.CNC_TRAINING_PROFILE?.render === 'function'
    },
    homeProgress: document.querySelector('#view-dashboard .cnc-home-capabilities li:first-child strong')?.textContent.trim() || '',
    primaryHref: document.querySelector('#view-dashboard .cnc-home-primary')?.getAttribute('href') || ''
  }));
  console.log('training startup', JSON.stringify(startup));
  assert.equal(startup.activeView, 'view-dashboard', 'CNC 根网址必须稳定停留首页');
  assert.equal(startup.stable, 'stable', '启动守卫必须确认首页稳定');
  assert.deepEqual(startup.oldHomes, [], '单层手机首页不得恢复已删除的双首页节点');
  assert.equal(startup.api.legacyHomeRemoved, true, '旧手机首页必须保持移除');
  assert.equal(startup.api.bottomNavReady, true, '真实五项底栏必须完成就绪');
  assert.equal(startup.profileApi.build, '20260724a', '成长档案公开构建契约漂移');
  assert.equal(startup.profileApi.snapshot, true, '成长档案快照接口必须存在');
  assert.equal(startup.profileApi.render, true, '成长档案渲染接口必须存在');
  assert.equal(startup.homeProgress, '0/12', '零记录新手首页不得伪造课程进度');
  assert.match(startup.primaryHref, /course-safety-foundation\.html$/, '零记录新手必须从第1关安全基础开始');

  const studyNav = page.locator('body > .xp-bottom-nav [data-xp-route="study"]');
  await studyNav.waitFor({ state: 'visible', timeout: 15000 });
  const studyTarget = await studyNav.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      label: node.getAttribute('aria-label') || node.querySelector('span')?.textContent.trim() || node.textContent.trim()
    };
  });
  assert.ok(studyTarget.width >= 44, `学习底栏入口宽度不得小于44px：${studyTarget.width}`);
  assert.ok(studyTarget.height >= 48, `学习底栏入口高度不得小于48px：${studyTarget.height}`);
  assert.match(studyTarget.label, /学习/, '学习底栏入口必须有明确中文名称');
  await studyNav.click();
  await page.waitForSelector('#view-study.active', { state: 'visible', timeout: 15000 });
  await page.waitForSelector('#xp-training-overview', { state: 'visible', timeout: 15000 });

  const trainingBuild = await page.locator('body').getAttribute('data-cnc-training-build');
  assert.equal(trainingBuild, '20260728a', '训练营基础构建契约漂移');

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
    trainingBuild,
    roadmap: 4,
    lessons: 12,
    profileBuild: startup.profileApi.build,
    stats: 3,
    studyTarget
  });
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });