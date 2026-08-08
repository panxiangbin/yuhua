const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=training-profile', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_TRAINING_PROFILE?.build === '20260808b', null, { timeout: 20000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-startup-home') === 'stable', null, { timeout: 15000 });
  await page.waitForFunction(() => window.CNC_GAME_QUERY_NAV?.build === '20260731d', null, { timeout: 15000 });
  assert.equal(await page.locator('.view.active').getAttribute('id'), 'view-dashboard');

  await page.evaluate(() => {
    // PWA25 首次渲染会固定当天训练目标。本测试随后注入独立的第9关薄弱课样例，
    // 因此先移除启动阶段目标，避免跨场景状态污染；同日目标稳定性由专门 streak 门禁验证。
    localStorage.removeItem('cnc_daily_training_plan_v1');
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1, 2]));
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1, xp: 260, badges: ['迈出第一步'], completed: [1, 2] }));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({
      version: 1,
      attempts: {},
      wrong: ['g00-cutting'],
      correct: ['axis-z-direction'],
      lessonScores: { 1: 100, 2: 100, 9: 50 },
      updatedAt: new Date().toISOString()
    }));
  });

  // 手机首页已取消第二套旧首页；直接使用真实可见底栏进入“我的”。
  await page.waitForFunction(() => {
    const node = document.querySelector('body > .xp-bottom-nav');
    return node && node.getClientRects().length > 0 && node.getAttribute('aria-hidden') === 'false' && !node.hasAttribute('inert');
  }, null, { timeout: 15000 });
  await page.locator('body > .xp-bottom-nav [data-xp-route="favorites"]').click();
  await page.waitForSelector('#view-favorites.active', { state: 'visible', timeout: 10000 });
  await page.evaluate(() => window.CNC_TRAINING_PROFILE.render());
  await page.waitForSelector('#view-favorites.active #xp-training-profile', { state: 'visible', timeout: 10000 });

  const data = await page.evaluate(() => window.CNC_TRAINING_PROFILE.snapshot());
  assert.equal(data.completed, 2);
  assert.equal(data.wrong, 1);
  assert.equal(data.lessons.length, 12);
  assert.equal(data.abilities.length, 6);
  assert.equal(data.weak.some(item => item.level === 9 && item.score === 50), true);
  assert.equal(data.next.level, 3);
  assert.equal(data.streak.current, 0);
  assert.equal(data.dailyPlan.lesson, 9, '真实薄弱课应锁定第9关');
  assert.deepEqual(data.dailyPlan.lessonWrong, ['g00-cutting'], '第9关必须只回流其映射错题');
  assert.equal(data.dailyPlan.steps[1].type, 'wrong');
  assert.equal(data.dailyPlan.steps[1].questionId, 'g00-cutting');

  const text = (await page.locator('#xp-training-profile').textContent()) || '';
  assert.match(text, /2\/12/);
  assert.match(text, /第 9 关 50 分/);
  assert.match(text, /第 3 关/);
  assert.match(text, /重做本关 1 道错题/);
  assert.match(text, /重做本关错题/);
  assert.match(text, /查看成长成果/);

  const layout = await page.locator('#xp-training-profile').evaluate(panel => {
    const cards = [...panel.querySelectorAll('.xp-profile-score')];
    const rects = cards.map(card => card.getBoundingClientRect());
    const button = panel.querySelector('[data-profile-continue]');
    const achievements = panel.querySelector('[data-training-achievements]');
    const wrongButton = panel.querySelector('[data-profile-wrong="g00-cutting"]');
    return {
      panelWidth: panel.getBoundingClientRect().width,
      cards: cards.length,
      singleColumn: rects.slice(1).every((rect, i) => Math.abs(rect.left - rects[i].left) < 2 && rect.top > rects[i].top),
      buttonHeight: button?.getBoundingClientRect().height || 0,
      achievementsHeight: achievements?.getBoundingClientRect().height || 0,
      achievementsHref: achievements?.getAttribute('href') || '',
      wrongButtonHeight: wrongButton?.getBoundingClientRect().height || 0
    };
  });
  assert.ok(layout.panelWidth > 330, '成长档案应铺满手机内容区');
  assert.equal(layout.cards, 12);
  assert.equal(layout.singleColumn, true, '手机课程成绩必须保持单列');
  assert.ok(layout.buttonHeight >= 44, '继续训练按钮点击区不得小于44px');
  assert.ok(layout.achievementsHeight >= 44, '成长成果入口点击区不得小于44px');
  assert.ok(layout.wrongButtonHeight >= 44, '本关错题按钮点击区不得小于44px');
  assert.match(layout.achievementsHref, /training-achievements\.html/);

  await page.locator('[data-training-achievements]').click();
  await page.waitForURL(/training-achievements\.html/, { timeout: 10000 });
  await page.waitForSelector('h1', { state: 'visible' });
  assert.match(await page.locator('h1').textContent(), /成长成果/);
  assert.deepEqual(errors, []);
  console.log('新版单层首页真实底栏、成长档案、本关错题精准回流、课程成绩、阶段能力、连续训练与成长成果入口通过', { data, layout });
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });