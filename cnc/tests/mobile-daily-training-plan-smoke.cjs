const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=daily-plan', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_TRAINING_PROFILE?.build === '20260724a', null, { timeout: 20000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-startup-home') === 'stable', null, { timeout: 15000 });
  assert.equal(await page.locator('.view.active').getAttribute('id'), 'view-dashboard');

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

  await page.locator('.xp-bottom-nav [data-xp-route="favorites"]').click();
  await page.waitForSelector('#view-favorites.active #xp-training-profile', { state: 'visible', timeout: 10000 });
  await page.evaluate(() => window.CNC_TRAINING_PROFILE.render());

  const data = await page.evaluate(() => window.CNC_TRAINING_PROFILE.snapshot());
  assert.equal(data.dailyPlan.steps.length, 3);
  assert.equal(data.dailyPlan.ability, '首件验证与排障');
  assert.equal(data.dailyPlan.score, 0);
  assert.match(data.dailyPlan.target, /80 分以上/);
  assert.equal(data.dailyPlan.steps[1].type, 'wrong');
  assert.equal(data.dailyPlan.passed, false);

  const plan = page.locator('.xp-daily-plan');
  await plan.waitFor({ state: 'visible' });
  assert.match(await plan.textContent(), /今天先练什么/);
  assert.match(await plan.textContent(), /今日目标/);
  assert.match(await plan.textContent(), /重做当前 2 道错题/);

  const layout = await plan.evaluate(panel => {
    const rects = [...panel.querySelectorAll('.xp-plan-step')].map(node => node.getBoundingClientRect());
    const buttons = [...panel.querySelectorAll('button')].map(node => node.getBoundingClientRect().height);
    return {
      singleColumn: rects.slice(1).every((rect, i) => Math.abs(rect.left - rects[i].left) < 2 && rect.top > rects[i].top),
      minButtonHeight: Math.min(...buttons)
    };
  });
  assert.equal(layout.singleColumn, true);
  assert.ok(layout.minButtonHeight >= 44);

  await page.locator('.xp-plan-step [data-ability-train="11"]').click();
  await page.waitForSelector('#view-study.active #study-detail-content .lesson-detail-v2[data-level="11"]', { state: 'visible', timeout: 15000 });
  assert.deepEqual(errors, []);
  console.log('个性化每日训练计划、错题优先、80分目标和手机单列布局通过', { dailyPlan: data.dailyPlan, layout });
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });