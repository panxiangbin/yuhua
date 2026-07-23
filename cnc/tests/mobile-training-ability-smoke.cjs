const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=ability-analysis', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_TRAINING_PROFILE?.build === '20260723g', null, { timeout: 20000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-startup-home') === 'stable', null, { timeout: 15000 });
  assert.equal(await page.locator('.view.active').getAttribute('id'), 'view-dashboard');

  await page.evaluate(() => {
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1, 2, 3]));
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1, xp: 360, badges: ['迈出第一步'], completed: [1, 2, 3] }));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({
      version: 1, attempts: {}, wrong: ['g00-cutting'], correct: ['axis-z-direction'],
      lessonScores: { 1: 100, 2: 90, 3: 85, 4: 40, 5: 20, 6: 80, 7: 60, 8: 0, 9: 50, 10: 50, 11: 0, 12: 0 }
    }));
  });

  await page.locator('.xp-bottom-nav [data-xp-route="favorites"]').click();
  await page.waitForSelector('#view-favorites.active #xp-training-profile', { state: 'visible', timeout: 10000 });
  await page.evaluate(() => window.CNC_TRAINING_PROFILE.render());

  const data = await page.evaluate(() => window.CNC_TRAINING_PROFILE.snapshot());
  assert.equal(data.abilities.length, 6);
  assert.equal(data.abilities.find(item => item.id === 'coordinates').score, 85);
  assert.equal(data.abilities.find(item => item.id === 'setup').score, 30);
  assert.equal(data.weakest.id, 'verification');

  const cards = page.locator('.xp-ability-card');
  assert.equal(await cards.count(), 6);
  const text = await page.locator('.xp-ability-section').textContent();
  assert.match(text, /安全操作/);
  assert.match(text, /坐标基础/);
  assert.match(text, /对刀装夹/);
  assert.match(text, /当前最需要加强/);

  const layout = await page.locator('.xp-ability-section').evaluate(panel => {
    const nodes = [...panel.querySelectorAll('.xp-ability-card')];
    const rects = nodes.map(node => node.getBoundingClientRect());
    const buttons = [...panel.querySelectorAll('button')].map(node => node.getBoundingClientRect().height);
    return {
      singleColumn: rects.slice(1).every((rect, i) => Math.abs(rect.left - rects[i].left) < 2 && rect.top > rects[i].top),
      minButtonHeight: Math.min(...buttons)
    };
  });
  assert.equal(layout.singleColumn, true);
  assert.ok(layout.minButtonHeight >= 44);

  await page.locator('[data-ability-train="11"]').first().click();
  await page.waitForSelector('#view-study.active #study-detail-content .lesson-detail-v2[data-level="11"]', { state: 'visible', timeout: 15000 });
  assert.deepEqual(errors, []);
  console.log('六维阶段能力、薄弱项识别与针对训练入口通过', { abilities: data.abilities, weakest: data.weakest, layout });
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });