const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('node:assert/strict');

const BASE = process.env.CNC_BASE_URL || 'http://127.0.0.1:4173';
const OUT = 'artifacts/ai-teacher';
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
    const page = await context.newPage();
    const errors = [];
    const requests = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push(request.url()));

    await page.goto(`${BASE}/cnc/ai-teacher.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(() => {
      localStorage.setItem('cnc_training_profile_v1', JSON.stringify({
        version: 1,
        completed: [1, 2, 3, 4],
        lessonScores: { 1: 92, 2: 88, 3: 85, 4: 82 },
        abilities: { safety: 86, coordinate: 72, drawing: 80, programVerification: 76, measurementDiagnosis: 68, troubleshooting: 55 }
      }));
      localStorage.setItem('cnc_training_practice_v1', JSON.stringify({
        version: 1,
        wrongQuestions: [
          { id: 'alarm-1', ability: '故障排查', risk: '高', title: '报警后连续复位' },
          { id: 'alarm-2', ability: '故障排查', risk: '高', title: '未记录报警原文' }
        ]
      }));
      localStorage.setItem('cnc_training_simulator_v1', JSON.stringify({
        version: 1,
        simulators: {
          homing: { passed: true, bestScore: 100 },
          workholding: { passed: true, bestScore: 100 },
          alarm: { passed: false, bestScore: 75 }
        }
      }));
      localStorage.setItem('cnc_training_exam_v1', JSON.stringify({ version: 1, highestScore: 73 }));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.CNC_AI_TEACHER?.build === '20260801-ai-teacher1');

    assert.equal(await page.locator('#course-progress').textContent(), '4/12');
    assert.equal(await page.locator('#wrong-count').textContent(), '2');
    assert.equal(await page.locator('#sim-progress').textContent(), '2/13');
    assert.equal(await page.locator('#weakest').textContent(), '故障排查');

    const api = await page.evaluate(() => ({
      build: window.CNC_AI_TEACHER.build,
      localOnly: window.CNC_AI_TEACHER.localOnly,
      externalModel: window.CNC_AI_TEACHER.externalModel,
      summary: window.CNC_AI_TEACHER.getSummary(),
      storageKeys: window.CNC_AI_TEACHER.storageKeys
    }));
    assert.equal(api.localOnly, true);
    assert.equal(api.externalModel, false);
    assert.equal(api.summary.weakest, '故障排查');
    assert.deepEqual(api.storageKeys.sort(), [
      'cnc_training_exam_v1',
      'cnc_training_practice_v1',
      'cnc_training_profile_v1',
      'cnc_training_simulator_v1'
    ]);

    await page.locator('[data-intent="next"]').click();
    await page.locator('#answer.show').waitFor();
    assert.match(await page.locator('#answer-title').textContent(), /高风险错题/);
    assert.match(await page.locator('#answer-copy').textContent(), /主线完成 4\/12/);
    assert.match(await page.locator('#answer-copy').textContent(), /优先补强“故障排查”/);
    assert.match(await page.locator('#answer-routes a').first().getAttribute('href'), /practice-wrong-review\.html/);

    await page.locator('[data-intent="alarm"]').click();
    assert.match(await page.locator('#answer-title').textContent(), /报警后第一步/);
    const alarmAnswer = await page.locator('#answer').textContent();
    assert.match(alarmAnswer, /停止继续运行/);
    assert.match(alarmAnswer, /记录完整报警号/);
    assert.match(alarmAnswer, /不要连续按复位/);
    assert.match(alarmAnswer, /核对原厂手册/);
    assert.match(await page.locator('#answer-routes a').first().getAttribute('href'), /simulator-alarm-troubleshooting\.html/);

    await page.locator('#question').fill('G54怎么找正');
    await page.locator('#ask-form button[type="submit"]').click();
    assert.match(await page.locator('#answer-title').textContent(), /G54/);
    const g54Answer = await page.locator('#answer').textContent();
    assert.match(g54Answer, /工件零点/);
    assert.match(g54Answer, /不要照抄别台机床的G54数值/);
    assert.match(g54Answer, /原厂手册/);

    const touchTargets = await page.locator('a:visible,button:visible,input:visible').evaluateAll(nodes => nodes.map(node => {
      const rect = node.getBoundingClientRect();
      return { text: node.textContent?.trim() || node.getAttribute('placeholder') || '', width: rect.width, height: rect.height };
    }));
    const tooSmall = touchTargets.filter(target => target.width > 0 && target.height > 0 && (target.width < 44 || target.height < 44));
    assert.deepEqual(tooSmall, [], `触控目标不足44px：${JSON.stringify(tooSmall)}`);

    const externalRequests = requests.filter(url => !url.startsWith(BASE));
    assert.deepEqual(externalRequests, [], `AI老师不得访问外部模型或云端接口：${externalRequests.join(' | ')}`);
    assert.equal(errors.length, 0, errors.join(' | '));

    await page.screenshot({ path: `${OUT}/ai-teacher-390x844.png`, fullPage: true });
    fs.writeFileSync(`${OUT}/result.json`, JSON.stringify({ api, touchTargets, requests, errors }, null, 2));
    console.log('CNC AI teacher smoke passed');
  } finally {
    await browser.close();
  }
})().catch(error => {
  fs.writeFileSync(`${OUT}/error.txt`, `${error.stack || error}\n`);
  process.exit(1);
});
