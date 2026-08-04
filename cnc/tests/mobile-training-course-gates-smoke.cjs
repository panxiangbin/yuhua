const { chromium } = require('playwright');
const assert = require('node:assert/strict');

async function passNativeLessonQuiz(page) {
  const buttons = page.locator('.quiz-v2-submit[data-level="9"]');
  const count = await buttons.count();
  assert.ok(count > 0, '第9关必须包含原生过关小测');
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    const answer = await button.getAttribute('data-answer');
    const card = button.locator('xpath=ancestor::article[contains(@class,"quiz-card-v2")]');
    await card.locator(`input[type="radio"][value="${answer}"]`).check();
    await button.click();
    await card.locator('.quiz-v2-feedback.correct').waitFor({ state: 'visible', timeout: 10000 });
  }
  await page.waitForFunction(() => {
    const progress = JSON.parse(localStorage.getItem('cnc_learning_progress_v2') || 'null');
    const bucket = progress && progress.correct && progress.correct['9'];
    const cards = Array.from(document.querySelectorAll('.quiz-card-v2[data-quiz-id]'));
    return cards.length > 0 && cards.every(card => bucket && bucket[card.dataset.quizId] === true);
  }, null, { timeout: 10000 });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/cnc/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_TRAINING_PRACTICE && /^\d{8}[a-z]$/.test(window.CNC_TRAINING_PRACTICE.build), null, { timeout: 20000 });
  await page.waitForFunction(() => {
    const home = window.CNC_PERSONAL_HOME?.runCheck?.();
    const nav = document.querySelector('body > .xp-bottom-nav');
    return home?.legacyHomeRemoved === true
      && home?.bottomNavReady === true
      && nav?.getClientRects().length > 0
      && nav.getAttribute('aria-hidden') === 'false'
      && !nav.hasAttribute('inert');
  }, null, { timeout: 20000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-startup-home') === 'stable', null, { timeout: 15000 });

  const buildConsistency = await page.evaluate(() => {
    const build = window.CNC_TRAINING_PRACTICE.build;
    const style = document.querySelector('link[data-cnc-training-practice]');
    const profileScript = document.querySelector('script[data-cnc-training-profile-script]');
    return {
      build,
      bodyBuild: document.body.dataset.cncPracticeBuild || '',
      styleHref: style ? style.getAttribute('href') || '' : '',
      profileSrc: profileScript ? profileScript.getAttribute('src') || '' : '',
      activeView: document.querySelector('.view.active')?.id || '',
      oldHomes: document.querySelectorAll('#xp-game-home,#xp-personal-home').length,
      home: window.CNC_PERSONAL_HOME.runCheck()
    };
  });
  assert.equal(buildConsistency.bodyBuild, buildConsistency.build, '练习API与页面构建标识必须一致');
  assert.ok(buildConsistency.styleHref.endsWith(`training-practice.css?v=${buildConsistency.build}`), '练习样式资源版本必须与API构建一致');
  assert.ok(buildConsistency.profileSrc.endsWith(`training-profile.js?v=${buildConsistency.build}`), '成长档案脚本版本必须与API构建一致');
  assert.equal(buildConsistency.activeView, 'view-dashboard', '根网址必须稳定停留首页');
  assert.equal(buildConsistency.oldHomes, 0, '课程闯关门禁不得依赖已删除的双首页节点');
  assert.equal(buildConsistency.home.legacyHomeRemoved, true, '旧双首页必须保持移除');
  assert.equal(buildConsistency.home.bottomNavReady, true, '真实五项底栏必须就绪');

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
  await page.waitForSelector('#xp-practice-entry', { state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => Boolean(window.CNC_TRAINING_PRACTICE?.runCheck?.().passed), null, { timeout: 15000 });
  assert.equal(await page.evaluate(() => window.CNC_TRAINING_PRACTICE.runCheck().build), buildConsistency.build, '运行自检构建号必须与页面构建一致');

  await page.locator('#view-study .study-card[data-level="9"]').click();
  await page.waitForSelector('#study-detail-content .lesson-detail-v2[data-level="9"]', { state: 'visible', timeout: 15000 });
  await passNativeLessonQuiz(page);
  await page.waitForSelector('.xp-practice-gate', { state: 'visible', timeout: 10000 });
  assert.match((await page.locator('.xp-practice-gate').textContent()) || '', /当前 0 分/);
  assert.match((await page.locator('.xp-practice-gate').textContent()) || '', /达到 80 分/);

  const completeButton = page.locator('[data-complete-level="9"], [data-xp-complete="9"]').first();
  await completeButton.waitFor({ state: 'visible', timeout: 15000 });
  await completeButton.click();
  await page.waitForTimeout(150);
  const blocked = await page.evaluate(() => {
    const legacy = JSON.parse(localStorage.getItem('cnc_study_completed_v1') || '[]');
    const learning = JSON.parse(localStorage.getItem('cnc_learning_progress_v2') || 'null') || { completed: [] };
    return { legacyDone: legacy, learningDone: learning.completed || [], panelVisible: !document.getElementById('xp-practice-panel').hidden, questionId: document.getElementById('xp-practice-panel').dataset.questionId };
  });
  assert.equal(blocked.legacyDone.includes(9), false, '未达到80分时旧完成记录不得包含本关');
  assert.equal(blocked.learningDone.includes(9), false, '未达到80分时真实课程进度不得记录完成');
  assert.equal(blocked.panelVisible, true, '被拦截后必须直接打开必答练习');
  assert.equal(blocked.questionId, 'g00-cutting');

  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('cnc_training_practice_v1') || 'null') || { version: 1, attempts: {}, wrong: [], correct: [], lessonScores: {}, updatedAt: new Date().toISOString() };
    state.attempts = state.attempts || {}; state.lessonScores = state.lessonScores || {};
    state.correct = Array.from(new Set([...(state.correct || []), 'g00-cutting']));
    state.wrong = (state.wrong || []).filter(id => id !== 'g00-cutting');
    state.attempts['g00-cutting'] = { selected: 1, correct: true, answeredAt: new Date().toISOString() };
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify(state));
    window.CNC_TRAINING_PRACTICE.refreshGateStatus();
  });
  await page.waitForFunction(() => document.querySelector('.xp-practice-gate')?.textContent.includes('当前 50 分'));
  assert.equal(await page.evaluate(() => window.CNC_TRAINING_PRACTICE.requirement(9).qualified), false, '50分不得通关');
  await completeButton.click();
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => (JSON.parse(localStorage.getItem('cnc_learning_progress_v2') || 'null')?.completed || []).includes(9)), false, '50分时真实课程进度仍不得完成');

  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('cnc_training_practice_v1'));
    state.correct = Array.from(new Set([...(state.correct || []), 'find-error-g00']));
    state.wrong = (state.wrong || []).filter(id => id !== 'find-error-g00');
    state.attempts['find-error-g00'] = { selected: 2, correct: true, answeredAt: new Date().toISOString() };
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify(state));
    window.CNC_TRAINING_PRACTICE.refreshGateStatus();
  });
  await page.waitForFunction(() => document.querySelector('.xp-practice-gate')?.textContent.includes('闯关成绩已达标'));
  const result = await page.evaluate(() => window.CNC_TRAINING_PRACTICE.requirement(9));
  assert.equal(result.score, 100); assert.equal(result.bestScore, 100); assert.equal(result.passScore, 80); assert.equal(result.qualified, true);

  const gateLayout = await page.locator('.xp-practice-gate').evaluate(node => {
    const meter = node.querySelector('.xp-practice-score-track');
    const button = node.querySelector('button');
    return { width: node.getBoundingClientRect().width, meterWidth: meter ? meter.getBoundingClientRect().width : 0, buttonHeight: button ? button.getBoundingClientRect().height : 48 };
  });
  assert.ok(gateLayout.width > 300, '手机闯关状态卡应铺满内容区');
  assert.ok(gateLayout.meterWidth > 250, '手机成绩条应清晰铺开');
  assert.ok(gateLayout.buttonHeight >= 44, '闯关练习按钮点击区不得小于44px');

  const closeButton = page.locator('[data-practice-close]');
  if (await closeButton.isVisible()) await closeButton.click();
  await completeButton.click();
  await page.waitForFunction(() => (JSON.parse(localStorage.getItem('cnc_learning_progress_v2') || 'null')?.completed || []).includes(9));
  assert.match((await page.locator('.lesson-complete-row, .xp-complete-bar').first().textContent()) || '', /这一关已完成|本关已完成/);
  assert.deepEqual(errors, []);
  console.log('真实学习底栏、原生小测和课程0分/50分门禁通过，100分后真实完成记录生效', { blocked, result, buildConsistency, studyTarget });
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
