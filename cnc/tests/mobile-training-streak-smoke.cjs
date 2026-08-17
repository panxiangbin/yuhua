const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=training-streak', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_TRAINING_PROFILE?.build === '20260817c', null, { timeout: 20000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-startup-home') === 'stable', null, { timeout: 15000 });
  await page.waitForFunction(() => window.CNC_GAME_QUERY_NAV?.build === '20260731d', null, { timeout: 15000 });
  // 成长档案启动时有一次 900ms 的受控补渲染。先等它真正结束，再写入测试数据，
  // 避免补渲染恰好覆盖点击后的 aria-live 成功反馈；不放宽连续天数、XP 或徽章断言。
  await page.waitForFunction(() => performance.now() >= 1200, null, { timeout: 5000 });
  assert.equal(await page.locator('.view.active').getAttribute('id'), 'view-dashboard');

  await page.evaluate(() => {
    const now = new Date();
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const d1 = new Date(now); d1.setDate(now.getDate()-2);
    const d2 = new Date(now); d2.setDate(now.getDate()-1);
    const lessonScores = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [index + 1, 100]));
    // 第4关已有80分以上练习成绩，但故意不写入真实课程完成记录。
    // 今日训练奖励必须继续阻断，避免“分数=完成”绕过新版课程门禁。
    localStorage.removeItem('cnc_daily_training_plan_v1');
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1,2,3,11]));
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version:1, xp:400, badges:['迈出第一步'], completed:[1,2,3,11], trainingDays:[fmt(d1),fmt(d2)], currentStreak:2, bestStreak:2, lastTrainingDate:fmt(d2) }));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version:2, gateVersion:2, attempts:{}, wrong:[], correct:['first-piece-check'], lessonScores, legacyLessonScores:{} }));
  });

  // 手机首页已取消第二套旧首页；直接使用当前真实可见底栏进入“我的”，
  // 验证真实用户路径而不是等待已经删除的 #xp-game-home 入口。
  await page.waitForFunction(() => {
    const node = document.querySelector('body > .xp-bottom-nav');
    return node && node.getClientRects().length > 0 && node.getAttribute('aria-hidden') === 'false' && !node.hasAttribute('inert');
  }, null, { timeout: 15000 });
  await page.locator('body > .xp-bottom-nav [data-xp-route="favorites"]').click();
  await page.waitForSelector('#view-favorites.active #xp-training-profile', { state: 'visible', timeout: 10000 });
  await page.evaluate(() => window.CNC_TRAINING_PROFILE.render());

  const before = await page.evaluate(() => window.CNC_TRAINING_PROFILE.snapshot());
  assert.equal(before.streak.current, 2);
  assert.equal(before.streak.trainedToday, false);
  assert.equal(before.dailyPlan.lesson, 4);
  assert.equal(before.lessons.find(item => item.level === 4).score, 100);
  assert.equal(before.lessons.find(item => item.level === 4).completed, false);
  assert.equal(before.dailyPlan.passed, false, '只有练习分数但没有真实课程完成记录时不得完成今日训练');

  const button = page.locator('[data-complete-today]');
  assert.equal(await button.isDisabled(), true);
  assert.match(await button.textContent(), /80分并通关后可完成/);

  const blocked = await page.evaluate(() => window.CNC_TRAINING_PROFILE.completeToday());
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, /80分.*完成课程通关记录/);
  const blockedStored = await page.evaluate(() => JSON.parse(localStorage.getItem('cnc_training_profile_v1')));
  assert.equal(blockedStored.xp, 400);
  assert.equal(blockedStored.trainingDays.length, 2);
  assert.equal(blockedStored.currentStreak, 2);
  assert.equal(blockedStored.bestStreak, 2);

  // 只有真实完成第4关后，今日目标仍固定为第4关，不会瞬间漂移到第5关；此时才允许领取一次奖励。
  await page.evaluate(() => {
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1,2,3,4,11]));
    window.CNC_TRAINING_PROFILE.render();
  });
  await page.waitForFunction(() => window.CNC_TRAINING_PROFILE?.snapshot().dailyPlan.passed === true, null, { timeout: 10000 });
  const unlocked = await page.evaluate(() => window.CNC_TRAINING_PROFILE.snapshot());
  assert.equal(unlocked.dailyPlan.lesson, 4, '真实完成当日目标后，今日训练目标不得漂移到下一关');
  assert.equal(unlocked.lessons.find(item => item.level === 4).completed, true);
  assert.ok(await button.isEnabled());
  await page.waitForFunction(() => {
    const node = document.querySelector('[data-complete-today]');
    return Boolean(node && node.getBoundingClientRect().height >= 44);
  }, null, { timeout: 10000 });
  const buttonHeight = await button.evaluate(node => node.getBoundingClientRect().height);
  assert.ok(buttonHeight >= 44, `完成今日训练按钮高度应不少于44px，实际为 ${buttonHeight}px`);
  await button.click();
  await page.waitForFunction(() => {
    const snapshot = window.CNC_TRAINING_PROFILE?.snapshot();
    const feedback = document.querySelector('.xp-streak-feedback')?.textContent || '';
    return snapshot?.streak.current === 3 && snapshot?.streak.trainedToday === true && /连续训练 3 天/.test(feedback);
  }, null, { timeout: 10000 });

  const after = await page.evaluate(() => window.CNC_TRAINING_PROFILE.snapshot());
  assert.equal(after.streak.current, 3);
  assert.equal(after.streak.best, 3);
  assert.equal(after.streak.trainedToday, true);
  assert.equal(after.xp, 420);
  assert.ok(after.badges.includes('连续训练3天'));
  assert.match(await page.locator('.xp-streak-feedback').textContent(), /连续训练 3 天/);
  assert.equal(await page.locator('[data-complete-today]').isDisabled(), true);

  const duplicate = await page.evaluate(() => window.CNC_TRAINING_PROFILE.completeToday());
  assert.equal(duplicate.duplicate, true);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('cnc_training_profile_v1')));
  assert.equal(stored.xp, 420);
  assert.equal(stored.trainingDays.length, 3);
  assert.deepEqual(errors, []);
  console.log('80分未通关阻断、当日目标稳定、真实通关后每日训练记录、连续天数、20XP、防重复与3天徽章通过', { before: before.streak, after: after.streak, badges: after.badges, buttonHeight });
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
