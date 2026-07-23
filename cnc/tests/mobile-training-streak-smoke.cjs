const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=training-streak', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_TRAINING_PROFILE?.build === '20260723i', null, { timeout: 20000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-startup-home') === 'stable', null, { timeout: 15000 });
  assert.equal(await page.locator('.view.active').getAttribute('id'), 'view-dashboard');

  await page.evaluate(() => {
    const now = new Date();
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const d1 = new Date(now); d1.setDate(now.getDate()-2);
    const d2 = new Date(now); d2.setDate(now.getDate()-1);
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1,2,3,11]));
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version:1, xp:400, badges:['迈出第一步'], completed:[1,2,3,11], trainingDays:[fmt(d1),fmt(d2)], currentStreak:2, bestStreak:2, lastTrainingDate:fmt(d2) }));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version:1, attempts:{}, wrong:[], correct:['first-piece-check'], lessonScores:{1:100,2:100,3:100,11:100,12:100} }));
  });

  await page.locator('.xp-bottom-nav [data-xp-route="favorites"]').click();
  await page.waitForSelector('#view-favorites.active #xp-training-profile', { state: 'visible', timeout: 10000 });
  await page.evaluate(() => window.CNC_TRAINING_PROFILE.render());

  const before = await page.evaluate(() => window.CNC_TRAINING_PROFILE.snapshot());
  assert.equal(before.streak.current, 2);
  assert.equal(before.streak.trainedToday, false);
  assert.equal(before.dailyPlan.passed, true);

  const button = page.locator('[data-complete-today]');
  assert.ok(await button.isEnabled());
  assert.ok((await button.evaluate(node => node.getBoundingClientRect().height)) >= 44);
  await button.click();

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
  console.log('每日训练记录、连续天数、20XP、防重复与3天徽章通过', { before: before.streak, after: after.streak, badges: after.badges });
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });