const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const artifactDir = path.resolve(__dirname, '../test-artifacts/daily-training-plan');
fs.mkdirSync(artifactDir, { recursive: true });

let browser;
let page;

(async () => {
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=daily-plan', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_TRAINING_PROFILE?.build === '20260724a', null, { timeout: 20000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-startup-home') === 'stable', null, { timeout: 15000 });
  await page.waitForFunction(() => window.CNC_GAME_QUERY_NAV?.build === '20260731d', null, { timeout: 15000 });
  // 成长档案样式由脚本动态挂载，并有一次启动补渲染。
  // 必须确认 CSSOM、390px 媒体查询与补渲染全部就绪，不能降低单列或触控断言。
  await page.waitForFunction(() => {
    const link = document.querySelector('link[data-cnc-training-profile]');
    return performance.now() >= 1200 && Boolean(link?.sheet) && matchMedia('(max-width: 760px)').matches;
  }, null, { timeout: 10000 });
  assert.equal(await page.locator('.view.active').getAttribute('id'), 'view-dashboard');

  // 零记录新手必须从固定12关第1关开始，不能因为“未训练=0分”跳到后面的高优先级能力。
  const zeroState = await page.evaluate(() => window.CNC_TRAINING_PROFILE.snapshot());
  const zeroMappedLevels = zeroState.abilities.flatMap(item => item.lessons).slice().sort((a, b) => a - b);
  assert.deepEqual(zeroMappedLevels, Array.from({ length: 12 }, (_, index) => index + 1), '六项能力必须完整覆盖固定12关');
  assert.equal(new Set(zeroMappedLevels).size, 12, '固定12关在能力映射中必须恰好出现一次');
  assert.equal(zeroState.dailyPlan.lesson, 1, '零记录新手必须从固定12关第1关开始');
  assert.equal(zeroState.dailyPlan.ability, '安全操作');
  assert.match(zeroState.dailyPlan.reason, /固定12关学习顺序/);
  assert.equal(zeroState.dailyPlan.passed, false);

  await page.evaluate(() => {
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1, 2, 3]));
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1, xp: 360, badges: ['迈出第一步'], completed: [1, 2, 3] }));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({
      version: 1,
      attempts: {},
      wrong: ['g00-cutting', 'first-piece-check'],
      correct: ['axis-z-direction'],
      lessonScores: { 1: 100, 2: 90, 3: 85, 4: 40, 5: 20, 6: 80, 7: 60, 8: 0, 9: 50, 10: 50, 11: 0, 12: 0 }
    }));
  });

  await page.waitForFunction(() => {
    const home = window.CNC_PERSONAL_HOME?.runCheck?.();
    const nav = document.querySelector('body > .xp-bottom-nav');
    return home?.legacyHomeRemoved === true
      && home?.bottomNavReady === true
      && nav?.getClientRects().length > 0
      && nav.getAttribute('aria-hidden') === 'false'
      && !nav.hasAttribute('inert');
  }, null, { timeout: 15000 });

  const profileNav = page.locator('body > .xp-bottom-nav [data-xp-route="favorites"]');
  await profileNav.waitFor({ state: 'visible', timeout: 15000 });
  const profileTarget = await profileNav.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      label: node.getAttribute('aria-label') || node.querySelector('span')?.textContent.trim() || node.textContent.trim()
    };
  });
  assert.ok(profileTarget.width >= 44, `“我的”底栏入口宽度不得小于44px：${profileTarget.width}`);
  assert.ok(profileTarget.height >= 48, `“我的”底栏入口高度不得小于48px：${profileTarget.height}`);
  assert.match(profileTarget.label, /我的/, '“我的”底栏入口必须有明确中文名称');
  await profileNav.click();

  const activeProfile = page.locator('#view-favorites.active #xp-training-profile');
  await activeProfile.waitFor({ state: 'visible', timeout: 10000 });
  assert.equal(await activeProfile.count(), 1, '活跃“我的”视图中必须只有一份成长档案');
  await page.evaluate(() => window.CNC_TRAINING_PROFILE.render());

  await page.waitForFunction(() => {
    const view = document.querySelector('#view-favorites.active');
    const profile = view?.querySelector('#xp-training-profile');
    const list = profile?.querySelector('.xp-plan-list');
    const steps = list ? [...list.querySelectorAll('.xp-plan-step')] : [];
    const buttons = list ? [...list.querySelectorAll('button')] : [];
    const columns = list ? getComputedStyle(list).gridTemplateColumns.trim().split(/\s+/).filter(Boolean) : [];
    return Boolean(profile?.getClientRects().length)
      && steps.length === 3
      && buttons.length > 0
      && columns.length === 1
      && buttons.every(button => button.getBoundingClientRect().height >= 44);
  }, null, { timeout: 10000 });

  const data = await page.evaluate(() => window.CNC_TRAINING_PROFILE.snapshot());
  const mappedLevels = data.abilities.flatMap(item => item.lessons).slice().sort((a, b) => a - b);
  assert.deepEqual(mappedLevels, Array.from({ length: 12 }, (_, index) => index + 1), '运行态能力映射必须完整覆盖固定12关');
  assert.equal(new Set(mappedLevels).size, 12, '运行态固定12关不得跨能力重复映射');
  assert.equal(data.dailyPlan.steps.length, 3);
  assert.equal(data.dailyPlan.lesson, 5, '有已练低分课程时必须优先补真实薄弱课，不能跳到未训练课程');
  assert.equal(data.dailyPlan.ability, '坐标基础');
  assert.equal(data.dailyPlan.score, 55);
  assert.equal(data.weakest.weakLesson, 5);
  assert.match(data.dailyPlan.reason, /已练课程中分数最低/);
  assert.match(data.dailyPlan.target, /80 分以上/);
  assert.equal(data.dailyPlan.steps[0].level, 5);
  assert.match(data.dailyPlan.steps[0].title, /第 5 关/);
  assert.equal(data.dailyPlan.steps[1].type, 'wrong');
  assert.equal(data.dailyPlan.passed, false);

  const plan = activeProfile.locator('.xp-daily-plan');
  await plan.waitFor({ state: 'visible', timeout: 10000 });
  assert.equal(await plan.count(), 1, '活跃成长档案中必须只有一份每日计划');
  assert.match(await plan.textContent(), /今天先练什么/);
  assert.match(await plan.textContent(), /今日目标/);
  assert.match(await plan.textContent(), /重做当前 2 道错题/);
  assert.match(await plan.textContent(), /第 5 关/);

  // 要求活跃视图内同一份计划连续稳定 5 帧，并同时满足：
  // CSS 计算为单列、三个卡片垂直排列、左边缘对齐、按钮触控高度不小于44px。
  const layout = await plan.evaluate(async panel => {
    const measure = () => {
      const list = panel.querySelector('.xp-plan-list');
      const rects = [...panel.querySelectorAll('.xp-plan-step')].map(node => node.getBoundingClientRect());
      const buttons = [...panel.querySelectorAll('button')].map(node => node.getBoundingClientRect().height);
      const columns = list
        ? getComputedStyle(list).gridTemplateColumns.trim().split(/\s+/).filter(Boolean)
        : [];
      const aligned = rects.length === 3 && rects.slice(1).every(rect => Math.abs(rect.left - rects[0].left) < 2);
      const vertical = rects.length === 3 && rects.slice(1).every((rect, index) => rect.top >= rects[index].bottom - 2);
      return {
        stepCount: rects.length,
        buttonCount: buttons.length,
        computedColumnCount: columns.length,
        singleColumn: columns.length === 1 && aligned && vertical,
        minButtonHeight: buttons.length ? Math.min(...buttons) : 0,
        signature: [
          columns.join(','),
          ...rects.map(rect => [rect.left, rect.top, rect.width, rect.height].map(value => Math.round(value * 10) / 10).join(','))
        ].join('|')
      };
    };

    let previousSignature = '';
    let stableFrames = 0;
    let latest = measure();
    for (let frame = 0; frame < 120; frame += 1) {
      await new Promise(resolve => requestAnimationFrame(resolve));
      latest = measure();
      const valid = latest.singleColumn && latest.minButtonHeight >= 44;
      if (valid && latest.signature === previousSignature) stableFrames += 1;
      else stableFrames = 0;
      previousSignature = latest.signature;
      if (stableFrames >= 5) return { ...latest, stableFrames };
    }
    return { ...latest, stableFrames };
  });

  assert.equal(layout.stepCount, 3);
  assert.ok(layout.buttonCount > 0);
  assert.equal(layout.computedColumnCount, 1, `每日计划CSS计算列数必须为1：${JSON.stringify(layout)}`);
  assert.equal(layout.singleColumn, true, `每日计划必须在活跃手机视图中垂直单列：${JSON.stringify(layout)}`);
  assert.ok(layout.minButtonHeight >= 44, `每日计划按钮触控高度不得小于44px：${layout.minButtonHeight}`);
  assert.ok(layout.stableFrames >= 5, `每日计划布局未连续稳定5帧：${JSON.stringify(layout)}`);

  await plan.locator('[data-ability-train="5"]').click();
  await page.waitForSelector('#view-study.active #study-detail-content .lesson-detail-v2[data-level="5"]', { state: 'visible', timeout: 15000 });
  assert.deepEqual(errors, []);

  const report = {
    passed: true,
    zeroState: {
      lesson: zeroState.dailyPlan.lesson,
      ability: zeroState.dailyPlan.ability,
      reason: zeroState.dailyPlan.reason,
      mappedLevels: zeroMappedLevels
    },
    dailyPlan: data.dailyPlan,
    weakest: data.weakest,
    mappedLevels,
    layout,
    profileTarget,
    errors
  };
  fs.writeFileSync(path.join(artifactDir, 'report.json'), JSON.stringify(report, null, 2));
  await page.screenshot({ path: path.join(artifactDir, 'daily-training-plan-390x844.png'), fullPage: true });
  console.log('单层首页真实底栏、固定12关能力映射、零记录顺序起步、真实薄弱课优先、错题优先、80分目标和手机单列布局通过', report);
  await browser.close();
})().catch(async error => {
  const stack = error && error.stack ? error.stack : String(error);
  fs.writeFileSync(path.join(artifactDir, 'error.txt'), stack);
  if (page) {
    try {
      await page.screenshot({ path: path.join(artifactDir, 'daily-training-plan-failure-390x844.png'), fullPage: true });
    } catch (_) {}
  }
  if (browser) {
    try {
      await browser.close();
    } catch (_) {}
  }
  console.error(error);
  process.exit(1);
});
