const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
fs.mkdirSync('artifacts', { recursive: true });
const answers = [[1],[0,1,2],[1],[1],[0,1,2],[1],[0],[0,1,2],[1],[1]];
async function answerCourse(page, wrongCount = 0) {
  for (let i = 0; i < 10; i++) {
    await page.waitForFunction(n => document.querySelector('#progress')?.textContent === `${n}/10`, i + 1);
    const useWrong = i < wrongCount;
    const pick = useWrong ? [answers[i][0] === 0 ? 1 : 0] : answers[i];
    for (const index of pick) await page.locator('#options .option').nth(index).click();
    await page.locator('#submit').click();
    await page.waitForFunction(() => /回答(正确|错误)/.test(document.querySelector('#feedback')?.textContent || ''));
    await page.locator('#next').click();
  }
  await page.waitForSelector('#result:not(.hidden)');
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  try {
    await page.goto('http://127.0.0.1:4173/cnc/course-complete-program-first-piece.html', { waitUntil: 'networkidle' });
    const text = await page.locator('body').innerText();
    for (const term of ['完整程序与首件验证','准备段','安全行','空运行','单段','倍率','首件','闭环','十步首件验证法','原厂手册']) assert.ok(text.includes(term), `missing ${term}`);
    assert.equal(await page.locator('.step').count(), 10);
    const visibleHeights = await page.locator('button:visible,a.back:visible').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().height));
    assert.ok(visibleHeights.every(h => h >= 44), `touch targets: ${visibleHeights.join(',')}`);
    await answerCourse(page, 0);
    assert.equal(await page.locator('#score').innerText(), '100分');
    assert.match(await page.locator('#resultTitle').innerText(), /已通过第12关/);
    const passed = await page.evaluate(() => JSON.parse(localStorage.getItem('cnc_training_profile_v1')));
    assert.ok(passed.completedCourses.includes('course-12'));
    assert.equal(passed.courseScores['course-12'], 100);
    assert.equal(passed.xp, 100);
    assert.equal(passed.rewardedCourses.filter(x => x === 'course-12').length, 1);
    const practice = await page.evaluate(() => JSON.parse(localStorage.getItem('cnc_training_practice_v1')));
    assert.equal(Object.keys(practice.answers).filter(x => x.startsWith('firstpiece-')).length, 10);
    assert.equal(practice.wrongIds.length, 0);
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await answerCourse(page, 3);
    assert.equal(await page.locator('#score').innerText(), '70分');
    assert.match(await page.locator('#resultTitle').innerText(), /未达到80分/);
    const failed = await page.evaluate(() => JSON.parse(localStorage.getItem('cnc_training_profile_v1')));
    assert.ok(!failed.completedCourses.includes('course-12'));
    assert.equal(failed.courseScores['course-12'], 70);
    assert.equal(failed.xp, 0);
    const failedPractice = await page.evaluate(() => JSON.parse(localStorage.getItem('cnc_training_practice_v1')));
    assert.equal(failedPractice.wrongIds.length, 3);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: 'artifacts/complete-program-first-piece-success.png', fullPage: true });
    console.log('CNC complete program and first-piece course smoke passed');
  } catch (error) {
    await page.screenshot({ path: 'artifacts/complete-program-first-piece-failure.png', fullPage: true }).catch(() => {});
    fs.writeFileSync('artifacts/complete-program-first-piece-error.txt', `${error.stack}\n\nConsole errors:\n${errors.join('\n')}`);
    throw error;
  } finally { await browser.close(); }
})();