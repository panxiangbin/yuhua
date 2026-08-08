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
}

async function setPracticeState(page, correct, extra = {}) {
  await page.evaluate(({ correct, extra }) => {
    const ids = ['g00-cutting', 'find-error-g00', 'g01-feed', 'rapid-clearance-check', 'feed-command-context'];
    const state = {
      version: 2,
      gateVersion: 2,
      attempts: {},
      wrong: ids.filter(id => !correct.includes(id)),
      correct,
      lessonScores: {},
      legacyLessonScores: {},
      updatedAt: new Date().toISOString(),
      ...extra
    };
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify(state));
    window.CNC_TRAINING_PRACTICE.refreshGateStatus();
  }, { correct, extra });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/cnc/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_TRAINING_PRACTICE && /^\d{8}[a-z]$/.test(window.CNC_TRAINING_PRACTICE.build), null, { timeout: 20000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-startup-home') === 'stable', null, { timeout: 15000 });

  const apiContract = await page.evaluate(() => ({
    build: window.CNC_TRAINING_PRACTICE.build,
    questions: window.CNC_TRAINING_PRACTICE.questions.length,
    gateVersion: window.CNC_TRAINING_PRACTICE.gateVersion,
    passScore: window.CNC_TRAINING_PRACTICE.passScore,
    level9: window.CNC_TRAINING_PRACTICE.requirements[9],
    critical9: window.CNC_TRAINING_PRACTICE.criticalRequirements[9],
    state: window.CNC_TRAINING_PRACTICE.getState(),
    check: window.CNC_TRAINING_PRACTICE.runCheck()
  }));
  assert.equal(apiContract.questions, 60, '固定12关题库必须为60题');
  assert.equal(apiContract.level9.length, 5, '第9关必须为5道专属题');
  assert.deepEqual(apiContract.critical9, ['g00-cutting', 'find-error-g00', 'rapid-clearance-check'], '第9关三道高风险关键题必须固定');
  assert.equal(apiContract.gateVersion, 2);
  assert.equal(apiContract.passScore, 80);
  assert.equal(apiContract.state.version, 2);
  assert.equal(apiContract.state.gateVersion, 2);
  assert.equal(apiContract.check.passed, true, '训练题库运行自检必须通过');

  const buildConsistency = await page.evaluate(() => {
    const build = window.CNC_TRAINING_PRACTICE.build;
    const style = document.querySelector('link[data-cnc-training-practice]');
    const profileScript = document.querySelector('script[data-cnc-training-profile-script]');
    return {
      build,
      bodyBuild: document.body.dataset.cncPracticeBuild || '',
      styleHref: style?.getAttribute('href') || '',
      profileSrc: profileScript?.getAttribute('src') || '',
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
  assert.equal(buildConsistency.home.legacyHomeRemoved, true);
  assert.equal(buildConsistency.home.bottomNavReady, true);

  const studyNav = page.locator('body > .xp-bottom-nav [data-xp-route="study"]');
  await studyNav.waitFor({ state: 'visible', timeout: 15000 });
  const studyTarget = await studyNav.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return { width: rect.width, height: rect.height, label: node.getAttribute('aria-label') || node.textContent.trim() };
  });
  assert.ok(studyTarget.width >= 44, `学习底栏入口宽度不得小于44px：${studyTarget.width}`);
  assert.ok(studyTarget.height >= 48, `学习底栏入口高度不得小于48px：${studyTarget.height}`);
  assert.match(studyTarget.label, /学习/);
  await studyNav.click();
  await page.waitForSelector('#view-study.active', { state: 'visible', timeout: 15000 });
  await page.locator('#view-study .study-card[data-level="9"]').click();
  await page.waitForSelector('#study-detail-content .lesson-detail-v2[data-level="9"]', { state: 'visible', timeout: 15000 });
  await passNativeLessonQuiz(page);
  await page.waitForSelector('.xp-practice-gate', { state: 'visible', timeout: 10000 });

  // 3/5=60：三道关键题全对也不能因为安全题全对而提前通关。
  await setPracticeState(page, ['g00-cutting', 'find-error-g00', 'rapid-clearance-check']);
  await page.waitForFunction(() => window.CNC_TRAINING_PRACTICE.requirement(9).score === 60);
  const sixty = await page.evaluate(() => window.CNC_TRAINING_PRACTICE.requirement(9));
  assert.equal(sixty.rawScore, 60);
  assert.equal(sixty.score, 60);
  assert.equal(sixty.qualified, false);
  assert.deepEqual(sixty.missingCritical, []);

  // 4/5且三道关键题全对：真实80分必须可通关。
  await setPracticeState(page, ['g00-cutting', 'find-error-g00', 'g01-feed', 'rapid-clearance-check']);
  await page.waitForFunction(() => window.CNC_TRAINING_PRACTICE.requirement(9).qualified === true);
  const eighty = await page.evaluate(() => window.CNC_TRAINING_PRACTICE.requirement(9));
  assert.equal(eighty.rawScore, 80);
  assert.equal(eighty.score, 80);
  assert.equal(eighty.bestScore, 80);
  assert.equal(eighty.qualified, true);
  assert.deepEqual(eighty.missingCritical, []);
  assert.match((await page.locator('.xp-practice-gate').textContent()) || '', /闯关成绩已达标/);

  const gateLayout = await page.locator('.xp-practice-gate').evaluate(node => {
    const meter = node.querySelector('.xp-practice-score-track');
    return { width: node.getBoundingClientRect().width, meterWidth: meter?.getBoundingClientRect().width || 0 };
  });
  assert.ok(gateLayout.width > 300, '手机闯关状态卡应铺满内容区');
  assert.ok(gateLayout.meterWidth > 250, '手机成绩条应清晰铺开');

  // 4/5但漏关键题：原始80必须被压到79，且完成动作优先打开缺失关键题。
  localStorageReset = null;
  await page.evaluate(() => {
    localStorage.setItem('cnc_study_completed_v1', '[]');
    const learning = JSON.parse(localStorage.getItem('cnc_learning_progress_v2') || '{}');
    learning.completed = (learning.completed || []).filter(level => Number(level) !== 9);
    localStorage.setItem('cnc_learning_progress_v2', JSON.stringify(learning));
    const profile = JSON.parse(localStorage.getItem('cnc_training_profile_v1') || '{}');
    profile.version = 1;
    profile.completed = (profile.completed || []).filter(level => Number(level) !== 9);
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify(profile));
  });
  await setPracticeState(page, ['g00-cutting', 'g01-feed', 'rapid-clearance-check', 'feed-command-context']);
  await page.waitForFunction(() => window.CNC_TRAINING_PRACTICE.requirement(9).rawScore === 80 && window.CNC_TRAINING_PRACTICE.requirement(9).score === 79);
  const criticalBlocked = await page.evaluate(() => window.CNC_TRAINING_PRACTICE.requirement(9));
  assert.equal(criticalBlocked.rawScore, 80);
  assert.equal(criticalBlocked.score, 79);
  assert.equal(criticalBlocked.qualified, false);
  assert.deepEqual(criticalBlocked.missingCritical, ['find-error-g00']);
  assert.match((await page.locator('.xp-practice-gate').textContent()) || '', /关键题未通过/);

  const completeButton = page.locator('[data-complete-level="9"], [data-xp-complete="9"]').first();
  await completeButton.click();
  await page.waitForTimeout(150);
  const blocked = await page.evaluate(() => ({
    done: JSON.parse(localStorage.getItem('cnc_study_completed_v1') || '[]'),
    learningDone: JSON.parse(localStorage.getItem('cnc_learning_progress_v2') || '{}').completed || [],
    questionId: document.getElementById('xp-practice-panel')?.dataset.questionId || '',
    panelVisible: !document.getElementById('xp-practice-panel')?.hidden
  }));
  assert.equal(blocked.done.includes(9), false, '漏关键题时旧完成记录不得包含本关');
  assert.equal(blocked.learningDone.includes(9), false, '漏关键题时真实课程进度不得记录完成');
  assert.equal(blocked.questionId, 'find-error-g00', '被拦截后必须优先打开缺失关键题');
  assert.equal(blocked.panelVisible, true);

  // 旧版两题100分但从未真正完成：迁移后不得绕过新版5题门禁。
  await page.evaluate(() => {
    localStorage.setItem('cnc_study_completed_v1', '[]');
    localStorage.setItem('cnc_learning_progress_v2', JSON.stringify({ version: 2, completed: [], correct: {} }));
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1, completed: [], xp: 0, badges: [], trainingDays: [], practiceXp: {} }));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({
      version: 1,
      attempts: {
        'g00-cutting': { selected: 1, correct: true },
        'find-error-g00': { selected: 2, correct: true }
      },
      wrong: [],
      correct: ['g00-cutting', 'find-error-g00'],
      lessonScores: { 9: 100 },
      updatedAt: new Date().toISOString()
    }));
  });
  const migrated = await page.evaluate(() => {
    const state = window.CNC_TRAINING_PRACTICE.getState();
    const req = window.CNC_TRAINING_PRACTICE.requirement(9);
    return { state, req };
  });
  assert.equal(migrated.state.version, 2);
  assert.equal(migrated.state.gateVersion, 2);
  assert.equal(migrated.state.legacyLessonScores['9'], 100, '旧100分必须留在迁移审计字段');
  assert.equal(migrated.req.rawScore, 40, '旧两题正确在新版5题中只能形成40分');
  assert.equal(migrated.req.qualified, false, '旧两题100分但未完成课程不得绕过新版门禁');

  // 已真实完成的旧用户：升级不得撤销通关，但页面要提示建议复测。
  await page.evaluate(() => localStorage.setItem('cnc_study_completed_v1', '[9]'));
  const legacyCompleted = await page.evaluate(() => window.CNC_TRAINING_PRACTICE.requirement(9));
  assert.equal(legacyCompleted.legacyCompleted, true);
  assert.equal(legacyCompleted.qualified, true);
  assert.ok(legacyCompleted.score >= 80, '既有真实通关记录应保留80分掌握基线');
  windowDummy = null;
  await page.evaluate(() => window.CNC_TRAINING_PRACTICE.refreshGateStatus());
  await page.waitForFunction(() => document.querySelector('.xp-practice-gate')?.textContent.includes('既有通关记录已保留'));

  assert.deepEqual(errors, []);
  console.log('真实手机固定12关门禁通过：3/5=60、关键题全对4/5=80、漏关键题80→79、旧两题100分迁移受阻、旧完成记录保留', {
    apiContract,
    sixty,
    eighty,
    criticalBlocked,
    migrated: { stateVersion: migrated.state.version, gateVersion: migrated.state.gateVersion, legacyScore: migrated.state.legacyLessonScores['9'], req: migrated.req },
    legacyCompleted,
    buildConsistency,
    studyTarget,
    gateLayout
  });
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
