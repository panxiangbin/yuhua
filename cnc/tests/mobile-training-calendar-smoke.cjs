const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const reportPath = path.join('cnc', 'test-results', 'training-calendar', 'report.json');
const report = { passed: false, viewport: '390x844', consoleErrors: [], pageErrors: [] };
function writeReport() {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
}

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
    page.on('pageerror', error => report.pageErrors.push(error.message));
    await page.goto('http://127.0.0.1:4173/cnc/training-calendar.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.body.dataset.trainingCalendar === 'ready');

    const dates = await page.evaluate(() => {
      const now = new Date();
      const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const d1 = new Date(now); d1.setDate(now.getDate()-2);
      const d2 = new Date(now); d2.setDate(now.getDate()-1);
      return { d1: fmt(d1), d2: fmt(d2) };
    });

    const normalRaw = JSON.stringify({ version:1, trainingDays:[dates.d1,dates.d2], currentStreak:2, bestStreak:4 });
    await page.evaluate(raw => {
      localStorage.setItem('cnc_training_profile_v1', raw);
      window.CNC_TRAINING_CALENDAR.render();
    }, normalRaw);
    assert.equal(await page.locator('#current-streak').textContent(), '2');
    assert.equal(await page.locator('#best-streak').textContent(), '4');
    assert.equal(await page.locator('#total-days').textContent(), '2');
    assert.equal(await page.locator('.day').count(), 7);
    assert.equal(await page.locator('.day.is-done').count(), 2);
    assert.equal(await page.locator('.day.is-today').count(), 1);
    assert.equal(await page.locator('#integrity-warning').isHidden(), true);
    assert.equal(await page.evaluate(() => localStorage.getItem('cnc_training_profile_v1')), normalRaw);
    report.normal = { currentStreak: 2, bestStreak: 4, totalDays: 2, completedRecentDays: 2, readOnly: true };

    const boxes = await page.locator('.day').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect()));
    assert.equal(boxes.length, 7);
    assert.ok(boxes.every(box => box.width > 330));
    assert.ok(boxes.every((box, index) => index === 0 || box.top >= boxes[index - 1].bottom));

    const corruptRaw = JSON.stringify({
      version: 1,
      trainingDays: [dates.d1, dates.d2, dates.d2, '2026-02-30', '2026-13-01', 'not-date', '', null, 123, {}, [dates.d1]],
      currentStreak: '99',
      bestStreak: '365'
    });
    await page.evaluate(raw => {
      localStorage.setItem('cnc_training_profile_v1', raw);
      window.CNC_TRAINING_CALENDAR.render();
    }, corruptRaw);
    assert.equal(await page.locator('#current-streak').textContent(), '0');
    assert.equal(await page.locator('#best-streak').textContent(), '0');
    assert.equal(await page.locator('#total-days').textContent(), '2');
    assert.equal(await page.locator('.day.is-done').count(), 2);
    assert.equal(await page.locator('#integrity-warning').isHidden(), true);
    assert.equal(await page.evaluate(() => localStorage.getItem('cnc_training_profile_v1')), corruptRaw);
    assert.ok(!(await page.locator('body').innerText()).match(/NaN|Infinity/));
    report.corruptFields = { currentStreak: 0, bestStreak: 0, totalDays: 2, invalidRowsIgnored: true, readOnly: true };

    const rootCases = [
      { name: 'array-root', raw: JSON.stringify([dates.d1, dates.d2]), reason: '根结构不是对象' },
      { name: 'string-root', raw: JSON.stringify('broken-profile'), reason: '根结构不是对象' },
      { name: 'bad-json', raw: '{"version":1,"trainingDays":[', reason: 'JSON 无法解析' },
      { name: 'wrong-version', raw: JSON.stringify({ version: 2, trainingDays: [dates.d1] }), reason: '版本字段异常' }
    ];
    report.rootIntegrity = [];
    for (const item of rootCases) {
      await page.evaluate(raw => {
        localStorage.setItem('cnc_training_profile_v1', raw);
        window.CNC_TRAINING_CALENDAR.render();
      }, item.raw);
      assert.equal(await page.evaluate(() => document.body.dataset.trainingCalendar), 'blocked');
      assert.equal(await page.locator('#current-streak').textContent(), '--');
      assert.equal(await page.locator('#best-streak').textContent(), '--');
      assert.equal(await page.locator('#total-days').textContent(), '--');
      assert.equal(await page.locator('.day').count(), 0);
      assert.equal(await page.locator('#integrity-warning').isVisible(), true);
      assert.match(await page.locator('#integrity-detail').textContent(), new RegExp(item.reason));
      assert.match(await page.locator('.calendar').innerText(), /学习数据异常/);
      assert.equal(await page.evaluate(() => localStorage.getItem('cnc_training_profile_v1')), item.raw);
      const recoveryHeights = await page.locator('#integrity-warning a').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
      assert.equal(recoveryHeights.length, 2);
      assert.ok(recoveryHeights.every(height => height >= 44));
      report.rootIntegrity.push({ name: item.name, blocked: true, readOnly: true, recoveryTouchMin: Math.min(...recoveryHeights) });
    }

    await page.evaluate(raw => {
      localStorage.setItem('cnc_training_profile_v1', raw);
      window.CNC_TRAINING_CALENDAR.render();
    }, normalRaw);
    assert.equal(await page.evaluate(() => document.body.dataset.trainingCalendar), 'ready');
    assert.equal(await page.locator('#integrity-warning').isHidden(), true);
    assert.equal(await page.locator('.day').count(), 7);

    const backHeight = await page.locator('.back').evaluate(node => node.getBoundingClientRect().height);
    assert.ok(backHeight >= 44);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    assert.equal(overflow, false);
    assert.ok(!(await page.locator('body').innerText()).match(/NaN|Infinity/));
    assert.deepEqual(report.consoleErrors, []);
    assert.deepEqual(report.pageErrors, []);
    report.mobile = { horizontalOverflow: false, backTouchHeight: backHeight };
    report.passed = true;
    writeReport();
    console.log('7天训练日历严格日期、连续训练数值语义、损坏根数据阻断、只读降级、手机单列和44px恢复入口通过');
    await browser.close();
  } catch (error) {
    report.error = error && error.stack ? error.stack : String(error);
    writeReport();
    if (browser) await browser.close().catch(() => {});
    console.error(error);
    process.exit(1);
  }
})();
