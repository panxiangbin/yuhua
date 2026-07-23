const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=course-gates', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_TRAINING_PRACTICE && window.CNC_TRAINING_PRACTICE.build === '20260723d', null, { timeout: 20000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-startup-home') === 'stable', null, { timeout: 15000 });
  assert.equal(await page.locator('.view.active').getAttribute('id'), 'view-dashboard');

  await page.locator('.launchpad-card[data-route="study"]').click();
  await page.waitForSelector('#view-study.active', { state: 'visible' });
  await page.locator('#view-study .study-card[data-level="9"]').click();
  await page.waitForSelector('#study-detail-content .lesson-detail-v2[data-level="9"]', { state: 'visible', timeout: 15000 });
  await page.waitForSelector('.xp-practice-gate', { state: 'visible', timeout: 10000 });
  assert.match((await page.locator('.xp-practice-gate').textContent()) || '', /还需答对 2 道本关练习/);

  await page.locator('[data-xp-complete="9"]').click();
  await page.waitForTimeout(150);
  const blocked = await page.evaluate(() => ({
    done: JSON.parse(localStorage.getItem('cnc_study_completed_v1') || '[]'),
    panelVisible: !document.getElementById('xp-practice-panel').hidden,
    questionId: document.getElementById('xp-practice-panel').dataset.questionId
  }));
  assert.equal(blocked.done.includes(9), false, '未通过练习时不得记录课程完成');
  assert.equal(blocked.panelVisible, true, '被拦截后必须直接打开必答练习');
  assert.equal(blocked.questionId, 'g00-cutting');

  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('cnc_training_practice_v1') || 'null') || { version: 1, attempts: {}, wrong: [], correct: [], updatedAt: new Date().toISOString() };
    state.attempts = state.attempts || {};
    state.correct = Array.from(new Set([...(state.correct || []), 'g00-cutting', 'find-error-g00']));
    state.wrong = (state.wrong || []).filter(id => id !== 'g00-cutting' && id !== 'find-error-g00');
    state.attempts['g00-cutting'] = { selected: 1, correct: true, answeredAt: new Date().toISOString() };
    state.attempts['find-error-g00'] = { selected: 2, correct: true, answeredAt: new Date().toISOString() };
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify(state));
    window.CNC_TRAINING_PRACTICE.refreshGateStatus();
  });
  await page.waitForFunction(() => document.querySelector('.xp-practice-gate')?.textContent.includes('闯关条件已达成'));
  await page.locator('[data-practice-close]').click();
  await page.locator('[data-xp-complete="9"]').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('cnc_study_completed_v1') || '[]').includes(9));

  const gateLayout = await page.locator('.xp-practice-gate').evaluate(node => {
    const button = node.querySelector('button');
    return { width: node.getBoundingClientRect().width, buttonHeight: button ? button.getBoundingClientRect().height : 48 };
  });
  assert.ok(gateLayout.width > 300, '手机闯关状态卡应铺满内容区');
  assert.ok(gateLayout.buttonHeight >= 44, '闯关练习按钮点击区不得小于44px');
  assert.deepEqual(errors, []);
  console.log('课程练习门槛、拦截、必答跳转与通关记录通过', blocked);
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
