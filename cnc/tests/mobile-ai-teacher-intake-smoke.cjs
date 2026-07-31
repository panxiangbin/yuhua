const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('node:assert/strict');

const BASE = process.env.CNC_BASE_URL || 'http://127.0.0.1:4173';
const OUT = 'artifacts/ai-teacher-intake';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2
    });
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
    const page = await context.newPage();
    const errors = [];
    const requests = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push(request.url()));

    await page.goto(`${BASE}/cnc/ai-teacher-intake.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.CNC_AI_TEACHER_INTAKE?.build === '20260801-ai-intake1');

    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('cnc_test_sentinel', JSON.stringify({ keep: true, value: 27 }));
      localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1, xp: 360, completed: [1, 2, 3] }));
    });
    const storageBefore = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));

    const api = await page.evaluate(() => ({
      build: window.CNC_AI_TEACHER_INTAKE.build,
      localOnly: window.CNC_AI_TEACHER_INTAKE.localOnly,
      externalModel: window.CNC_AI_TEACHER_INTAKE.externalModel,
      persistsData: window.CNC_AI_TEACHER_INTAKE.persistsData,
      routes: window.CNC_AI_TEACHER_INTAKE.routes
    }));
    assert.equal(api.build, '20260801-ai-intake1');
    assert.equal(api.localOnly, true);
    assert.equal(api.externalModel, false);
    assert.equal(api.persistsData, false);
    assert.match(api.routes.alarm, /simulator-alarm-troubleshooting\.html$/);

    await page.locator('#system').selectOption({ label: 'FANUC类加工中心' });
    await page.locator('#phase').selectOption({ label: '单段首次接近工件' });
    await page.locator('#category').selectOption('alarm');
    await page.locator('#machine-state').selectOption({ label: '已停止，现场状态已保留' });
    await page.locator('input[name="risk"][value="collision"]').check();
    await page.locator('#alarm-text').fill('SERVO 401 X轴伺服报警');
    await page.locator('#program-block').fill('N110 T03 M06\nN120 G43 H03 Z50.\nN130 G00 X120. Y-35.');
    await page.locator('#symptom').fill('X轴首次接近时停止，刀具距夹具约15毫米，工件和夹具未发现松动。');
    await page.locator('#actions-taken').fill('已按现场制度停止并拍照记录，尚未再次复位或启动。');
    await page.locator('#intake-form button[type="submit"]').click();

    await page.locator('#output.show').waitFor({ state: 'visible' });
    const banner = page.locator('#risk-banner');
    assert.match(await banner.getAttribute('class'), /urgent/);
    assert.match(await banner.textContent(), /不要继续试运行/);

    const report = await page.locator('#report').textContent();
    for (const expected of [
      'FANUC类加工中心',
      '单段首次接近工件',
      '报警或无法继续运行',
      'SERVO 401 X轴伺服报警',
      'N120 G43 H03 Z50.',
      '刀具距夹具约15毫米',
      '尚未再次复位或启动',
      '不要连续按复位并反复启动',
      '不要照抄别台机床的参数、坐标或刀补值',
      '核对机床原厂手册',
      '不用于整理信息，不给出固定转速'
    ]) assert.match(report, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

    const trainingHref = await page.locator('#training-link').getAttribute('href');
    assert.match(trainingHref, /simulator-alarm-troubleshooting\.html$/);

    await page.locator('#copy-report').click();
    await page.waitForFunction(() => /已复制|复制失败/.test(document.getElementById('copy-status')?.textContent || ''));
    const copyStatus = await page.locator('#copy-status').textContent();
    assert.match(copyStatus, /问诊单已复制/);
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), report);

    const storageAfter = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));
    assert.deepEqual(storageAfter, storageBefore, '现场问诊单不得新增、迁移或修改学习数据');

    const touchTargets = await page.locator('a:visible,button:visible,select:visible,textarea:visible').evaluateAll(nodes => nodes.map(node => {
      const rect = node.getBoundingClientRect();
      return { tag: node.tagName, text: node.textContent?.trim() || node.getAttribute('placeholder') || '', width: rect.width, height: rect.height };
    }));
    const riskLabels = await page.locator('.risk-option:visible').evaluateAll(nodes => nodes.map(node => {
      const rect = node.getBoundingClientRect();
      return { text: node.textContent?.trim() || '', width: rect.width, height: rect.height };
    }));
    const tooSmall = [...touchTargets, ...riskLabels].filter(target => target.width > 0 && target.height > 0 && (target.width < 44 || target.height < 44));
    assert.deepEqual(tooSmall, [], `触控目标不足44px：${JSON.stringify(tooSmall)}`);

    const externalRequests = requests.filter(url => !url.startsWith(BASE));
    assert.deepEqual(externalRequests, [], `现场问诊单不得访问外部模型或云端接口：${externalRequests.join(' | ')}`);
    assert.equal(errors.length, 0, errors.join(' | '));

    await page.screenshot({ path: `${OUT}/ai-teacher-intake-390x844.png`, fullPage: true });
    fs.writeFileSync(`${OUT}/result.json`, JSON.stringify({ api, report, trainingHref, copyStatus, storageBefore, storageAfter, touchTargets, riskLabels, requests, errors }, null, 2));
    console.log('CNC AI teacher intake smoke passed');
  } finally {
    await browser.close();
  }
})().catch(error => {
  fs.writeFileSync(`${OUT}/error.txt`, `${error.stack || error}\n`);
  process.exit(1);
});
