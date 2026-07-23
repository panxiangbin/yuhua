const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/cnc/training-certificate.html', { waitUntil: 'domcontentloaded', timeout: 60000 });

  await page.evaluate(() => {
    const lessonScores = {};
    for (let level = 1; level <= 12; level += 1) lessonScores[level] = level === 8 ? 70 : 90;
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 1, lessonScores }));
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1, trainingDays: ['2026-07-20', '2026-07-21', '2026-07-22'], badges: ['迈出第一步', '成绩达标'] }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1,2,3,4,5,6,7,9,10,11,12]));
    location.reload();
  });
  await page.waitForFunction(() => window.CNC_TRAINING_CERTIFICATE?.build === '20260724c');

  const unfinished = await page.evaluate(() => window.CNC_TRAINING_CERTIFICATE.snapshot());
  assert.equal(unfinished.passed, 11);
  assert.equal(unfinished.average, 88);
  assert.equal(unfinished.days, 3);
  assert.equal(unfinished.badges, 2);
  assert.equal(unfinished.graduated, false);
  assert.equal(unfinished.abilities.length, 6);
  assert.equal(await page.locator('#certificate-status').textContent(), '训练进行中');
  assert.equal(await page.locator('#ability-list .ability').count(), 6);
  assert.equal(await page.locator('#score-list .score').count(), 12);
  assert.match(await page.locator('#score-list').textContent(), /第 8 关/);
  assert.match(await page.locator('#score-list').textContent(), /70/);

  const layout = await page.evaluate(() => {
    const list = document.querySelector('#score-list');
    const listBox = list.getBoundingClientRect();
    const boxes = [...list.querySelectorAll('.score')].map(node => node.getBoundingClientRect());
    return { listBox, boxes };
  });
  assert.ok(layout.boxes.every(box => box.width >= layout.listBox.width - 2));
  assert.ok(layout.boxes.every((box, index) => index === 0 || box.top >= layout.boxes[index - 1].bottom));
  assert.ok((await page.locator('.back').evaluate(node => node.getBoundingClientRect().height)) >= 44);
  assert.match(await page.locator('.notice').textContent(), /不是职业资格证书/);
  assert.match(await page.locator('.notice').textContent(), /原厂手册/);

  await page.evaluate(() => {
    const lessonScores = {};
    for (let level = 1; level <= 12; level += 1) lessonScores[level] = 90;
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 1, lessonScores }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1,2,3,4,5,6,7,8,9,10,11,12]));
    location.reload();
  });
  await page.waitForFunction(() => window.CNC_TRAINING_CERTIFICATE?.build === '20260724c');

  const graduated = await page.evaluate(() => window.CNC_TRAINING_CERTIFICATE.snapshot());
  assert.equal(graduated.passed, 12);
  assert.equal(graduated.average, 90);
  assert.equal(graduated.graduated, true);
  assert.equal(await page.locator('#certificate-status').textContent(), '基础训练营已达标');
  assert.match(await page.locator('.notice').textContent(), /不是职业资格证书/);
  assert.match(await page.locator('.notice').textContent(), /原厂手册/);
  assert.deepEqual(errors, []);

  console.log('阶段训练证书未达标与达标双场景、12关成绩、六维能力与安全声明通过', { unfinished, graduated });
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
