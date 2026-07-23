const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=training-practice', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_TRAINING_PRACTICE && window.CNC_TRAINING_PRACTICE.build === '20260723d', null, { timeout: 20000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-startup-home') === 'stable', null, { timeout: 15000 });
  assert.equal(await page.locator('.view.active').getAttribute('id'), 'view-dashboard', '根网址必须稳定停留首页');

  await page.locator('.launchpad-card[data-route="study"]').click();
  await page.waitForSelector('#view-study.active', { state: 'visible', timeout: 15000 });
  await page.waitForSelector('#xp-practice-entry', { state: 'visible', timeout: 15000 });

  const api = await page.evaluate(() => window.CNC_TRAINING_PRACTICE.runCheck());
  assert.equal(api.passed, true);
  assert.equal(api.questions, 9);
  assert.equal(api.lessonGates, 12);
  assert.equal(api.state.version, 1);

  const entry = page.locator('#xp-practice-entry');
  assert.match((await entry.locator('h4').textContent()) || '', /练习通过才算闯关/);
  const entryLayout = await entry.evaluate(node => ({ buttonHeight: node.querySelector('[data-practice-open]').getBoundingClientRect().height }));
  assert.ok(entryLayout.buttonHeight >= 48, '手机端练习入口点击区不得小于48px');

  await entry.locator('[data-practice-open]').click();
  const panel = page.locator('#xp-practice-panel');
  await panel.waitFor({ state: 'visible', timeout: 10000 });
  assert.equal(await panel.locator('.xp-practice-options label').count(), 4);

  await panel.locator('input[value="0"]').check();
  await panel.locator('[data-practice-submit]').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('cnc_training_practice_v1') || 'null').wrong.includes('safe-stop-first'));
  assert.match((await panel.locator('.xp-practice-feedback').textContent()) || '', /加入错题本/);

  await panel.locator('input[value="1"]').check();
  await panel.locator('[data-practice-submit]').click();
  await page.waitForFunction(() => {
    const state = JSON.parse(localStorage.getItem('cnc_training_practice_v1') || 'null');
    return state.correct.includes('safe-stop-first') && !state.wrong.includes('safe-stop-first');
  });
  assert.match((await panel.locator('.xp-practice-feedback').textContent()) || '', /回答正确/);

  const saved = await page.evaluate(() => ({
    practice: JSON.parse(localStorage.getItem('cnc_training_practice_v1')),
    profile: JSON.parse(localStorage.getItem('cnc_training_profile_v1'))
  }));
  assert.equal(saved.practice.version, 1);
  assert.ok(saved.profile.xp >= 10, '首次答对必须增加经验值');
  assert.equal(saved.profile.practiceXp['safe-stop-first'], 10, '同题经验值必须有防重复记录');
  await panel.locator('[data-practice-submit]').click();
  const profileAfterRepeat = await page.evaluate(() => JSON.parse(localStorage.getItem('cnc_training_profile_v1')));
  assert.equal(profileAfterRepeat.practiceXp['safe-stop-first'], 10, '重复答对不得重复刷经验值');

  const optionLayout = await panel.locator('.xp-practice-options').evaluate(node => {
    const cards = Array.from(node.querySelectorAll('label')).map(label => label.getBoundingClientRect());
    return { singleColumn: cards.every((rect, index) => index === 0 || Math.abs(rect.left - cards[0].left) < 2), minHeight: Math.min(...cards.map(rect => rect.height)) };
  });
  assert.equal(optionLayout.singleColumn, true, '手机端答案必须单列显示');
  assert.ok(optionLayout.minHeight >= 54, '答案点击区不得过小');
  assert.deepEqual(errors, []);
  console.log('CNC新手在线练习、解析、错题记录、课程门槛与XP防重复通过', { build: api.build, questions: api.questions, xp: saved.profile.xp });
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
