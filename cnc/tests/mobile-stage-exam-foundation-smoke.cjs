const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('assert');

const BASE = process.env.CNC_BASE_URL || 'http://127.0.0.1:4173';
const ARTIFACT_DIR = 'artifacts/stage-exam-foundation';
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const ANSWERS = [
  [1],[1],[2],[2],[0,1,3],[1],[1],[0,1,2,3],[1],[1],[1],[0],[1],[0],[0,1,2,3]
];

async function openExam(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.clear());
  await page.goto(`${BASE}/cnc/stage-exam-foundation.html`, { waitUntil: 'networkidle' });
  await page.locator('.question.active').waitFor({ state: 'visible' });
  return { page, errors };
}

async function answerExam(page, wrongIndexes = new Set()) {
  for (let i = 0; i < ANSWERS.length; i++) {
    assert.match(await page.locator('.qmeta').textContent(), new RegExp(`第${i + 1}/15题`));
    const answer = wrongIndexes.has(i) ? [ANSWERS[i][0] === 0 ? 1 : 0] : ANSWERS[i];
    for (const value of answer) await page.locator(`input[name="answer"][value="${value}"]`).check();
    await page.locator('#submit-answer').click();
    await page.locator('#feedback.show').waitFor({ state: 'visible' });
    if (wrongIndexes.has(i)) assert.match(await page.locator('#feedback').textContent(), /回答错误/);
    else assert.match(await page.locator('#feedback').textContent(), /回答正确/);
    const next = page.locator('#next-question');
    await next.waitFor({ state: 'visible' });
    if (i === ANSWERS.length - 1) assert.strictEqual(await next.textContent(), '查看成绩');
    await next.click();
    if (i < ANSWERS.length - 1) await page.locator('.question.active').waitFor({ state: 'visible' });
  }
  await page.locator('#result.show').waitFor({ state: 'visible' });
}

async function assertTouchTargets(page) {
  const targets = await page.locator('a:visible,button:visible,label.option:visible').evaluateAll(nodes => nodes.map(node => {
    const r = node.getBoundingClientRect();
    return { text: node.textContent.trim().replace(/\s+/g, ' '), width: r.width, height: r.height };
  }));
  const invalid = targets.filter(item => item.width > 0 && item.height > 0 && item.height < 44);
  assert.deepStrictEqual(invalid, [], `触控区不足44px: ${JSON.stringify(invalid)}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const pass = await openExam(browser);
    assert.match(await pass.page.title(), /基础阶段综合考试/);
    assert.strictEqual(await pass.page.locator('.stat').count(), 3);
    assert.match(await pass.page.locator('body').textContent(), /原厂手册/);
    assert.match(await pass.page.locator('body').textContent(), /80分/);
    await answerExam(pass.page, new Set([0, 1, 2]));
    assert.strictEqual(await pass.page.locator('#score').textContent(), '80');
    assert.match(await pass.page.locator('#result-title').textContent(), /已通过/);
    const passData = await pass.page.evaluate(() => ({
      exam: JSON.parse(localStorage.getItem('cnc_training_exam_v1')),
      profile: JSON.parse(localStorage.getItem('cnc_training_profile_v1')),
      practice: JSON.parse(localStorage.getItem('cnc_training_practice_v1'))
    }));
    assert.strictEqual(passData.exam.passed, true);
    assert.strictEqual(passData.exam.bestScore, 80);
    assert.strictEqual(passData.exam.attempts.length, 1);
    assert.strictEqual(passData.exam.attempts[0].wrongIds.length, 3);
    assert.strictEqual(passData.profile.xp, 150);
    assert(passData.profile.rewards.includes('stage-exam-foundation'));
    assert.strictEqual(passData.profile.examScores.foundation, 80);
    assert.strictEqual(passData.practice.wrongQuestions.length, 3);
    assert.strictEqual(Object.keys(passData.practice.examAnswers).length, 15);
    assert.strictEqual(pass.errors.length, 0, `通过场景控制台错误: ${pass.errors.join(' | ')}`);
    await assertTouchTargets(pass.page);
    await pass.page.screenshot({ path: `${ARTIFACT_DIR}/pass-80.png`, fullPage: true });
    await pass.page.close();

    const fail = await openExam(browser);
    await answerExam(fail.page, new Set([0, 1, 2, 3]));
    assert.strictEqual(await fail.page.locator('#score').textContent(), '73');
    assert.match(await fail.page.locator('#result-title').textContent(), /未达到80分/);
    const failData = await fail.page.evaluate(() => ({
      exam: JSON.parse(localStorage.getItem('cnc_training_exam_v1')),
      profile: JSON.parse(localStorage.getItem('cnc_training_profile_v1')),
      practice: JSON.parse(localStorage.getItem('cnc_training_practice_v1'))
    }));
    assert.strictEqual(failData.exam.passed, false);
    assert.strictEqual(failData.exam.bestScore, 73);
    assert.strictEqual(failData.profile.xp, 0);
    assert.strictEqual(failData.profile.rewards.includes('stage-exam-foundation'), false);
    assert.strictEqual(failData.practice.wrongQuestions.length, 4);
    assert.strictEqual(fail.errors.length, 0, `未通过场景控制台错误: ${fail.errors.join(' | ')}`);
    await assertTouchTargets(fail.page);
    await fail.page.screenshot({ path: `${ARTIFACT_DIR}/fail-73.png`, fullPage: true });
    await fail.page.close();

    const hub = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await hub.addInitScript(() => localStorage.setItem('cnc_training_exam_v1', JSON.stringify({ version: 1, passed: true, bestScore: 80, lastScore: 80 })));
    await hub.goto(`${BASE}/cnc/training-camp.html`, { waitUntil: 'networkidle' });
    assert.match(await hub.locator('#exam-status').textContent(), /已通过.*80分/);
    assert.strictEqual(await hub.locator('#exam-entry').textContent(), '重新考试');
    assert.match(await hub.locator('#exam-entry').getAttribute('href'), /stage-exam-foundation\.html/);
    await hub.screenshot({ path: `${ARTIFACT_DIR}/hub-entry.png`, fullPage: true });
    await hub.close();

    console.log('CNC foundation stage exam smoke passed');
  } catch (error) {
    fs.writeFileSync(`${ARTIFACT_DIR}/error.txt`, `${error.stack || error}\n`);
    throw error;
  } finally {
    await browser.close();
  }
})();