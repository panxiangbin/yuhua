const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('node:assert/strict');

const BASE = process.env.CNC_BASE_URL || 'http://127.0.0.1:4173';
const ARTIFACT_DIR = 'artifacts/stage-exam-foundation';
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const ANSWERS = [
  [1],[1],[2],[2],[0,1,3],[1],[1],[0,1,2,3],[1],[1],[1],[0],[1],[0],[0,1,2,3]
];
const CRITICAL_IDS = ['exam-safe-stop', 'exam-door-bypass'];
const report = {
  viewport: '390x844',
  expectedVersion: '20260804-safety-gate1',
  criticalIds: CRITICAL_IDS,
  scenarios: {}
};

async function openExam(browser) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2
  });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.clear());
  await page.goto(`${BASE}/cnc/stage-exam-foundation.html`, { waitUntil: 'networkidle' });
  await page.locator('.question.active').waitFor({ state: 'visible' });
  await page.waitForFunction(() => window.CNC_STAGE_EXAM?.version === '20260804-safety-gate1');
  return { page, errors };
}

function wrongAnswerFor(index) {
  const answer = ANSWERS[index];
  if (answer.length > 1) return answer.includes(0) ? [1] : [0];
  return [answer[0] === 0 ? 1 : 0];
}

async function answerExam(page, wrongIndexes = new Set()) {
  for (let i = 0; i < ANSWERS.length; i += 1) {
    assert.match(await page.locator('.qmeta').textContent(), new RegExp(`第${i + 1}/15题`));
    const answer = wrongIndexes.has(i) ? wrongAnswerFor(i) : ANSWERS[i];
    for (const value of answer) await page.locator(`input[name="answer"][value="${value}"]`).check();
    await page.locator('#submit-answer').click();
    await page.locator('#feedback.show').waitFor({ state: 'visible' });
    if (wrongIndexes.has(i)) assert.match(await page.locator('#feedback').textContent(), /回答错误/);
    else assert.match(await page.locator('#feedback').textContent(), /回答正确/);
    if (wrongIndexes.has(i) && i < 2) {
      assert.match(await page.locator('#feedback').textContent(), /安全关键题/);
    }
    const next = page.locator('#next-question');
    await next.waitFor({ state: 'visible' });
    if (i === ANSWERS.length - 1) assert.equal(await next.textContent(), '查看成绩');
    await next.click();
    if (i < ANSWERS.length - 1) await page.locator('.question.active').waitFor({ state: 'visible' });
  }
  await page.locator('#result.show').waitFor({ state: 'visible' });
}

async function readData(page) {
  return page.evaluate(() => ({
    exam: JSON.parse(localStorage.getItem('cnc_training_exam_v1')),
    profile: JSON.parse(localStorage.getItem('cnc_training_profile_v1')),
    practice: JSON.parse(localStorage.getItem('cnc_training_practice_v1')),
    snapshot: window.CNC_STAGE_EXAM.snapshot()
  }));
}

async function assertTouchTargets(page) {
  const targets = await page.locator('a:visible,button:visible,label.option:visible').evaluateAll(nodes => nodes.map(node => {
    const r = node.getBoundingClientRect();
    return { text: node.textContent.trim().replace(/\s+/g, ' '), width: r.width, height: r.height };
  }));
  const invalid = targets.filter(item => item.width > 0 && item.height > 0 && item.height < 44);
  assert.deepEqual(invalid, [], `触控区不足44px: ${JSON.stringify(invalid)}`);
  return targets.length;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const blocked = await openExam(browser);
    assert.match(await blocked.page.title(), /基础阶段综合考试/);
    assert.match(await blocked.page.locator('.hero').textContent(), /达到80分.*2道安全关键题全部正确/);
    assert.match(await blocked.page.locator('.notice').textContent(), /安全判断不能由其他题的高分抵消/);
    assert.match(await blocked.page.locator('.notice').textContent(), /原厂手册/);
    const contract = await blocked.page.evaluate(() => window.CNC_STAGE_EXAM);
    assert.equal(contract.questions.length, 15);
    assert.deepEqual(contract.questions.filter(q => q.critical).map(q => q.id), CRITICAL_IDS);
    assert.equal(await blocked.page.locator('.critical-tag').textContent(), '安全关键题');
    await answerExam(blocked.page, new Set([0, 1]));
    assert.equal(await blocked.page.locator('#score').textContent(), '87');
    assert.match(await blocked.page.locator('#result-title').textContent(), /安全关键题未通过/);
    assert.match(await blocked.page.locator('#result-copy').textContent(), /不标记通过、不发放XP/);
    assert.equal(await blocked.page.locator('#weak-list li.critical').count(), 2);
    const blockedData = await readData(blocked.page);
    assert.equal(blockedData.exam.passed, false);
    assert.equal(blockedData.exam.bestScore, 87);
    assert.equal(blockedData.exam.lastScorePassed, true);
    assert.equal(blockedData.exam.lastCriticalPassed, false);
    assert.deepEqual(blockedData.exam.lastCriticalWrongIds, CRITICAL_IDS);
    assert.equal(blockedData.exam.attempts[0].passed, false);
    assert.equal(blockedData.exam.attempts[0].scorePassed, true);
    assert.equal(blockedData.exam.attempts[0].criticalPassed, false);
    assert.deepEqual(blockedData.exam.attempts[0].criticalWrongIds, CRITICAL_IDS);
    assert.equal(blockedData.profile.xp, 0);
    assert.equal(blockedData.profile.rewards.includes('stage-exam-foundation'), false);
    assert.equal(blockedData.profile.examScores.foundation, 87);
    assert.equal(blockedData.profile.examSafety.foundation.passed, false);
    assert.deepEqual(blockedData.profile.examSafety.foundation.wrongIds, CRITICAL_IDS);
    assert.equal(blockedData.practice.wrongQuestions.length, 2);
    assert.equal(blockedData.practice.examAnswers['exam-safe-stop'].critical, true);
    assert.equal(blockedData.practice.examAnswers['exam-axis-z'].critical, false);
    assert.equal(blocked.errors.length, 0, `关键题阻断场景控制台错误: ${blocked.errors.join(' | ')}`);
    const blockedTargets = await assertTouchTargets(blocked.page);
    await blocked.page.screenshot({ path: `${ARTIFACT_DIR}/blocked-87-critical.png`, fullPage: true });
    report.scenarios.criticalBlocked = { score: 87, passed: false, criticalPassed: false, criticalWrongIds: CRITICAL_IDS, touchTargets: blockedTargets };
    await blocked.page.close();

    const thresholdFail = await openExam(browser);
    await answerExam(thresholdFail.page, new Set([2, 3, 4, 5]));
    assert.equal(await thresholdFail.page.locator('#score').textContent(), '73');
    assert.match(await thresholdFail.page.locator('#result-title').textContent(), /未达到80分/);
    const thresholdData = await readData(thresholdFail.page);
    assert.equal(thresholdData.exam.passed, false);
    assert.equal(thresholdData.exam.lastScorePassed, false);
    assert.equal(thresholdData.exam.lastCriticalPassed, true);
    assert.deepEqual(thresholdData.exam.lastCriticalWrongIds, []);
    assert.equal(thresholdData.profile.xp, 0);
    assert.equal(thresholdData.profile.rewards.includes('stage-exam-foundation'), false);
    assert.equal(thresholdData.profile.examSafety.foundation.passed, true);
    assert.equal(thresholdData.practice.wrongQuestions.length, 4);
    assert.equal(thresholdFail.errors.length, 0, `分数未达标场景控制台错误: ${thresholdFail.errors.join(' | ')}`);
    const failTargets = await assertTouchTargets(thresholdFail.page);
    await thresholdFail.page.screenshot({ path: `${ARTIFACT_DIR}/fail-73-score.png`, fullPage: true });
    report.scenarios.scoreFail = { score: 73, passed: false, criticalPassed: true, touchTargets: failTargets };
    await thresholdFail.page.close();

    const pass = await openExam(browser);
    await answerExam(pass.page, new Set([2, 3, 4]));
    assert.equal(await pass.page.locator('#score').textContent(), '80');
    assert.match(await pass.page.locator('#result-title').textContent(), /已通过/);
    assert.match(await pass.page.locator('#result-copy').textContent(), /2道安全关键题全部正确/);
    const passData = await readData(pass.page);
    assert.equal(passData.exam.passed, true);
    assert.equal(passData.exam.bestScore, 80);
    assert.equal(passData.exam.lastPassed, true);
    assert.equal(passData.exam.lastScorePassed, true);
    assert.equal(passData.exam.lastCriticalPassed, true);
    assert.deepEqual(passData.exam.attempts[0].criticalWrongIds, []);
    assert.equal(passData.profile.xp, 150);
    assert(passData.profile.rewards.includes('stage-exam-foundation'));
    assert.equal(passData.profile.examScores.foundation, 80);
    assert.equal(passData.profile.examSafety.foundation.passed, true);
    assert.equal(passData.practice.wrongQuestions.length, 3);
    assert.equal(Object.keys(passData.practice.examAnswers).length, 15);
    assert.equal(pass.errors.length, 0, `通过场景控制台错误: ${pass.errors.join(' | ')}`);
    const passTargets = await assertTouchTargets(pass.page);
    await pass.page.screenshot({ path: `${ARTIFACT_DIR}/pass-80-critical-clear.png`, fullPage: true });
    report.scenarios.pass = { score: 80, passed: true, criticalPassed: true, xp: 150, touchTargets: passTargets };
    await pass.page.close();

    const hub = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await hub.addInitScript(() => localStorage.setItem('cnc_training_exam_v1', JSON.stringify({ version: 1, passed: true, bestScore: 80, lastScore: 80, lastCriticalPassed: true })));
    await hub.goto(`${BASE}/cnc/training-camp.html`, { waitUntil: 'networkidle' });
    assert.match(await hub.locator('#exam-status').textContent(), /已通过.*80分/);
    assert.equal(await hub.locator('#exam-entry').textContent(), '重新考试');
    assert.match(await hub.locator('#exam-entry').getAttribute('href'), /stage-exam-foundation\.html/);
    await hub.screenshot({ path: `${ARTIFACT_DIR}/hub-entry.png`, fullPage: true });
    report.scenarios.hub = { status: await hub.locator('#exam-status').textContent(), entry: await hub.locator('#exam-entry').textContent() };
    await hub.close();

    report.passed = true;
    fs.writeFileSync(`${ARTIFACT_DIR}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
    console.log('CNC foundation stage exam critical safety gate smoke passed');
  } catch (error) {
    report.passed = false;
    report.error = error.stack || String(error);
    fs.writeFileSync(`${ARTIFACT_DIR}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(`${ARTIFACT_DIR}/error.txt`, `${error.stack || error}\n`);
    throw error;
  } finally {
    await browser.close();
  }
})();
