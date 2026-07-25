const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const OUT = path.join(process.cwd(), 'artifacts/practice-safety-coordinate');
fs.mkdirSync(OUT, { recursive: true });

async function answerSet(page, wrongIndexes = []) {
  const total = await page.locator('.question.active').count();
  assert.equal(total, 1, 'question should be visible');
  for (let i = 0; i < 15; i++) {
    await page.waitForSelector('.question.active');
    const inputs = page.locator('input[name=answer]');
    const count = await inputs.count();
    assert.ok(count >= 2, `question ${i + 1} options missing`);
    const qText = await page.locator('.question.active h2').innerText();
    const all = await page.evaluate(() => QS.map(q => q.answer));
    const answer = all[i];
    const chosen = wrongIndexes.includes(i) ? [answer[0] === 0 ? 1 : 0] : answer;
    for (const idx of chosen) await inputs.nth(idx).check();
    await page.getByRole('button', { name: '提交答案' }).click();
    await page.waitForSelector('.feedback.show');
    const feedback = await page.locator('.feedback.show').innerText();
    assert.ok(/回答正确|回答错误/.test(feedback), `question ${i + 1} no feedback: ${qText}`);
    await page.getByRole('button', { name: i === 14 ? '查看成绩' : '下一题' }).click();
  }
}

async function checkTouchTargets(page) {
  const bad = await page.locator('a:visible,button:visible,.option:visible').evaluateAll(nodes => nodes.map(n => {
    const r = n.getBoundingClientRect();
    return { text: (n.innerText || n.getAttribute('aria-label') || '').trim().slice(0, 60), w: r.width, h: r.height };
  }).filter(x => x.w > 0 && x.h > 0 && x.h < 44));
  assert.deepEqual(bad, [], `touch targets below 44px: ${JSON.stringify(bad)}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  try {
    await page.goto('http://127.0.0.1:4173/cnc/practice-safety-coordinate.html', { waitUntil: 'networkidle' });
    assert.match(await page.title(), /安全与坐标专项练习/);
    assert.match(await page.locator('body').innerText(), /15题练到会/);
    assert.match(await page.locator('body').innerText(), /原厂手册/);
    assert.equal(await page.evaluate(() => QS.length), 15, 'must contain 15 questions');
    const types = await page.evaluate(() => [...new Set(QS.map(q => q.type))]);
    assert.ok(types.includes('single') && types.includes('multi') && types.includes('judge'), 'missing required question types');
    const metadataOk = await page.evaluate(() => QS.every(q => q.course && q.ability && q.risk && q.system && q.explain));
    assert.ok(metadataOk, 'question metadata incomplete');
    await checkTouchTargets(page);

    await answerSet(page, []);
    await page.waitForSelector('#result.show');
    assert.equal(await page.locator('#score').innerText(), '100');
    assert.match(await page.locator('#result-title').innerText(), /专项通过/);
    const data = await page.evaluate(() => JSON.parse(localStorage.getItem('cnc_training_practice_v1')));
    assert.equal(data.answers.length, 15);
    assert.equal(data.scores.safetyCoordinate, 100);
    assert.equal(Object.keys(data.wrong || {}).length, 0);
    await checkTouchTargets(page);
    await page.screenshot({ path: path.join(OUT, 'pass-100.png'), fullPage: true });

    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await answerSet(page, [0, 1, 2, 3]);
    await page.waitForSelector('#result.show');
    assert.equal(await page.locator('#score').innerText(), '73');
    assert.match(await page.locator('#result-title').innerText(), /未达到80分/);
    const failData = await page.evaluate(() => JSON.parse(localStorage.getItem('cnc_training_practice_v1')));
    assert.equal(failData.answers.length, 15);
    assert.equal(Object.keys(failData.wrong || {}).length, 4);
    await page.getByRole('button', { name: '只重做错题' }).click();
    assert.match(await page.locator('.meta').innerText(), /1\/4/);
    await page.screenshot({ path: path.join(OUT, 'fail-73-redo.png'), fullPage: true });

    assert.deepEqual(errors, [], `console errors: ${errors.join('\n')}`);
    fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ ok: true, viewport: '390x844', questions: 15, types, passScore: 100, failScore: 73 }, null, 2));
  } catch (error) {
    await page.screenshot({ path: path.join(OUT, 'failure.png'), fullPage: true }).catch(() => {});
    fs.writeFileSync(path.join(OUT, 'error.txt'), `${error.stack || error}\n\nConsole errors:\n${errors.join('\n')}`);
    throw error;
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exit(1); });