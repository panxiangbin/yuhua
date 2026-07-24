const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/cnc/course-safety-foundation.html', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await page.waitForFunction(() => window.CNC_SAFETY_COURSE?.build === '20260724e');

  assert.match(await page.locator('h1').textContent(), /安全基础/);
  assert.match(await page.locator('.hero').textContent(), /预计 20 分钟/);
  assert.match(await page.locator('.hero').textContent(), /风险等级：高/);
  assert.equal(await page.locator('.flow li').count(), 8);
  assert.equal(await page.locator('.term').count(), 5);
  assert.equal(await page.locator('.mistake').count(), 6);
  assert.match(await page.locator('.notice').textContent(), /原厂手册/);
  assert.match(await page.locator('.notice').textContent(), /企业安全制度/);

  const api = await page.evaluate(() => window.CNC_SAFETY_COURSE);
  assert.equal(api.questions.length, 10);
  const typeSet = new Set(api.questions.map(q => q.type));
  assert.ok(typeSet.has('single'));
  assert.ok(typeSet.has('multi'));
  assert.ok(typeSet.has('judge'));

  for (let q = 0; q < api.questions.length; q += 1) {
    const question = await page.evaluate(index => window.CNC_SAFETY_COURSE.questions[index], q);
    for (const answerIndex of question.answer) {
      await page.locator(`.option[data-i="${answerIndex}"]`).click();
    }
    await page.locator('#submit-answer').click();
    assert.match(await page.locator('#feedback').textContent(), /回答正确/);
    await page.locator('#next-question').click();
  }

  await page.waitForSelector('#result-panel:not(.hidden)');
  assert.equal(await page.locator('#final-score').textContent(), '100');
  assert.match(await page.locator('#result-text').textContent(), /已通过第1关/);
  const snapshot = await page.evaluate(() => window.CNC_SAFETY_COURSE.snapshot());
  assert.equal(snapshot.profile.lessonScores['1'], 100);
  assert.ok(snapshot.profile.completed.includes(1));
  assert.equal(snapshot.profile.safetyCourseXp, true);
  assert.equal(snapshot.practice.wrong.length, 0);

  const touchTargets = await page.locator('.option,.button,.back').evaluateAll(nodes =>
    nodes.map(node => node.getBoundingClientRect().height)
  );
  assert.ok(touchTargets.every(height => height >= 44));
  assert.deepEqual(errors, []);
  console.log('安全基础完整课程：内容结构、10题三题型、80分通关、档案写入与390x844触控区通过');
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});