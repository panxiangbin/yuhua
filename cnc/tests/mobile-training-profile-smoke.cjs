const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=training-profile', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_TRAINING_PROFILE?.build === '20260723f', null, { timeout: 20000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-startup-home') === 'stable', null, { timeout: 15000 });
  assert.equal(await page.locator('.view.active').getAttribute('id'), 'view-dashboard');

  await page.evaluate(() => {
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
    window.CNC_TRAINING_PROFILE.render();
  });

  await page.locator('[data-route="favorites"],[data-xp-route="favorites"]').first().click();
  await page.waitForSelector('#view-favorites.active #xp-training-profile', { state: 'visible', timeout: 10000 });
  const data = await page.evaluate(() => window.CNC_TRAINING_PROFILE.snapshot());
  assert.equal(data.completed, 2);
  assert.equal(data.wrong, 1);
  assert.equal(data.lessons.length, 12);
  assert.equal(data.weak.some(item => item.level === 9 && item.score === 50), true);
  assert.equal(data.next.level, 3);

  const text = (await page.locator('#xp-training-profile').textContent()) || '';
  assert.match(text, /2\/12/);
  assert.match(text, /第 9 关 50 分/);
  assert.match(text, /第 3 关/);
  assert.match(text, /重做错题/);

  const layout = await page.locator('#xp-training-profile').evaluate(panel => {
    const cards = [...panel.querySelectorAll('.xp-profile-score')];
    const rects = cards.map(card => card.getBoundingClientRect());
    const button = panel.querySelector('[data-profile-continue]');
    return {
      panelWidth: panel.getBoundingClientRect().width,
      cards: cards.length,
      singleColumn: rects.slice(1).every((rect, i) => Math.abs(rect.left - rects[i].left) < 2 && rect.top > rects[i].top),
      buttonHeight: button?.getBoundingClientRect().height || 0
    };
  });
  assert.ok(layout.panelWidth > 330, '成长档案应铺满手机内容区');
  assert.equal(layout.cards, 12);
  assert.equal(layout.singleColumn, true, '手机课程成绩必须保持单列');
  assert.ok(layout.buttonHeight >= 44, '继续训练按钮点击区不得小于44px');

  await page.locator('[data-profile-continue="3"]').click();
  await page.waitForSelector('#view-study.active #study-detail-content .lesson-detail-v2[data-level="3"]', { state: 'visible', timeout: 15000 });
  assert.deepEqual(errors, []);
  console.log('成长档案、课程成绩、薄弱项、错题与下一关推荐通过', { data, layout });
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
