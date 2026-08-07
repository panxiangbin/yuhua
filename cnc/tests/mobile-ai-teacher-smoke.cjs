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
        completedStages: ['stage-1', 'stage-2', 'stage-3', 'stage-4'],
        courseScores: { 'stage-1': 92, 'stage-2': 88, 'stage-3': 85, 'stage-4': 82, 'stage-5': 20 },
        // 故意保留一份旧能力字段：AI老师不得再让旧字段覆盖固定12关真实课程语义。
        abilities: { safety: 99, coordinate: 99, drawing: 99, programVerification: 99, measurementDiagnosis: 99, troubleshooting: 1 }
      }));
      localStorage.setItem('cnc_training_practice_v1', JSON.stringify({
        version: 1,
        lessonScores: { 1: 92, 2: 88, 3: 85, 4: 82, 5: 20 },
        wrongQuestions: [
          { id: 'alarm-1', ability: '故障排查', risk: '高', title: '报警后连续复位' },
          { id: 'alarm-2', ability: '故障排查', risk: '高', title: '未记录报警原文' }
        ]
      }));
      localStorage.setItem('cnc_training_simulator_v1', JSON.stringify({
        version: 1,
        simulators: {
          homing: { passed: true, bestScore: 100 },
          workholding: { passed: false, bestScore: 85 },
          alarm: { passed: false, bestScore: 75 }
        }
      }));
      localStorage.setItem('cnc_training_exam_v1', JSON.stringify({ version: 1, highestScore: 73 }));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.CNC_AI_TEACHER?.build === '20260806-learning-depth1');

    assert.equal(await page.locator('#course-progress').textContent(), '4/12');
    assert.equal(await page.locator('#wrong-count').textContent(), '2');
    assert.equal(await page.locator('#sim-progress').textContent(), '2/13');
    assert.equal(await page.locator('#weakest').textContent(), '机床与坐标');

    const api = await page.evaluate(() => ({
      build: window.CNC_AI_TEACHER.build,
      localOnly: window.CNC_AI_TEACHER.localOnly,
      externalModel: window.CNC_AI_TEACHER.externalModel,
      summary: window.CNC_AI_TEACHER.getSummary(),
      storageKeys: window.CNC_AI_TEACHER.storageKeys,
      alarmIntake: window.CNC_AI_TEACHER.intakeRoute('alarm'),
      unknownIntake: window.CNC_AI_TEACHER.intakeRoute('unknown'),
      normalG54: window.CNC_AI_TEACHER.classifyQuestion('G54怎么找正'),
      parameterValue: window.CNC_AI_TEACHER.classifyQuestion('FANUC 1815参数应该改成多少'),
      bypassInterlock: window.CNC_AI_TEACHER.classifyQuestion('怎么屏蔽安全门联锁继续加工'),
      blindReset: window.CNC_AI_TEACHER.classifyQuestion('报警以后怎么直接复位'),
      sourcePolicy: window.CNC_AI_TEACHER.sourcePolicy
    }));
    assert.equal(api.localOnly, true);
    assert.equal(api.externalModel, false);
    assert.equal(api.summary.weakest, '机床与坐标');
    assert.equal(api.summary.weakestScore, 64);
    assert.equal(api.summary.nextCourse, 5);
    assert.deepEqual(api.summary.abilityNames, ['安全操作', '机床与坐标', '装夹与对刀', '编程与读图', '刀具与工艺', '首件验证']);
    assert.match(api.alarmIntake, /ai-teacher-intake\.html\?source=ai-teacher&category=alarm$/);
    assert.match(api.unknownIntake, /category=other$/);
    assert.equal(api.normalG54.blocked, false);
    assert.equal(api.normalG54.intent, 'work-offset');
    assert.equal(api.parameterValue.blocked, true);
    assert.ok(api.parameterValue.matchedSignals.includes('parameter-write'));
    assert.equal(api.bypassInterlock.blocked, true);
    assert.ok(api.bypassInterlock.matchedSignals.includes('bypass-safety'));
    assert.equal(api.blindReset.blocked, true);
    assert.ok(api.blindReset.matchedSignals.includes('blind-reset'));
    assert.match(api.sourcePolicy.trust, /不得宣称可直接上机/);
    assert.match(api.sourcePolicy.evidence, /逐条复核记录/);
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
    assert.match(await page.locator('#answer-copy').textContent(), /优先补强“机床与坐标”/);
    assert.match(await page.locator('#answer-routes a').first().getAttribute('href'), /practice-wrong-review\.html/);
    assert.equal(await page.locator('#answer-sources .source-item').count(), 3);

    // 清掉错题后，AI老师必须沿当前固定12关数据模型继续真实最低未达标第5关，不能退回旧 completed/lessonScores 语义。
    await page.evaluate(() => {
      const practice = JSON.parse(localStorage.getItem('cnc_training_practice_v1'));
      practice.wrongQuestions = [];
      localStorage.setItem('cnc_training_practice_v1', JSON.stringify(practice));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-intent="next"]').click();
    assert.match(await page.locator('#answer-title').textContent(), /继续第 5 关主线课程/);
    const nextHref = await page.locator('#answer-routes a').first().getAttribute('href');
    assert.equal(nextHref, './course-machine-work-offset.html');

    // 恢复两道错题，继续覆盖原有受控问答与高风险阻断回归。
    await page.evaluate(() => {
      const practice = JSON.parse(localStorage.getItem('cnc_training_practice_v1'));
      practice.wrongQuestions = [
        { id: 'alarm-1', ability: '故障排查', risk: '高', title: '报警后连续复位' },
        { id: 'alarm-2', ability: '故障排查', risk: '高', title: '未记录报警原文' }
      ];
      localStorage.setItem('cnc_training_practice_v1', JSON.stringify(practice));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    await page.locator('[data-intent="alarm"]').click();
    assert.match(await page.locator('#answer-title').textContent(), /报警后第一步/);
    const alarmAnswer = await page.locator('#answer').textContent();
    assert.match(alarmAnswer, /停止继续运行/);
    assert.match(alarmAnswer, /记录完整报警号/);
    assert.match(alarmAnswer, /不要连续按复位/);
    assert.match(alarmAnswer, /核对原厂手册/);
    assert.match(alarmAnswer, /依据来源与可信状态/);
    assert.match(alarmAnswer, /未逐条复核内容不可直接上机/);
    const alarmRoutes = await page.locator('#answer-routes a').evaluateAll(nodes => nodes.map(node => ({ text: node.textContent.trim(), href: node.getAttribute('href') })));
    assert.equal(alarmRoutes[0].text, '先生成现场问诊单');
    assert.match(alarmRoutes[0].href, /ai-teacher-intake\.html\?source=ai-teacher&category=alarm$/);
    assert.match(alarmRoutes[1].href, /simulator-alarm-troubleshooting\.html/);
    const alarmSourceHrefs = await page.locator('#answer-sources a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    assert.ok(alarmSourceHrefs.includes('./content-trust-status.html'));
    assert.ok(alarmSourceHrefs.includes('./content-trust-evidence.html'));

    await page.locator('#question').fill('G54怎么找正');
    await page.locator('#ask-form button[type="submit"]').click();
    assert.match(await page.locator('#answer-title').textContent(), /G54/);
    const g54Answer = await page.locator('#answer').textContent();
    assert.match(g54Answer, /工件零点/);
    assert.match(g54Answer, /不要照抄别台机床的G54数值/);
    assert.match(g54Answer, /原厂手册/);
    const g54Hrefs = await page.locator('#answer-routes a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    assert.ok(g54Hrefs.some(href => /ai-teacher-intake\.html\?source=ai-teacher&category=coordinate$/.test(href)));

    await page.locator('#question').fill('FANUC 1815参数应该改成多少');
    await page.locator('#ask-form button[type="submit"]').click();
    assert.equal(await page.locator('#answer-status').textContent(), '已阻断高风险请求');
    assert.match(await page.locator('#answer-title').textContent(), /无法给出可直接上机/);
    const blockedAnswer = await page.locator('#answer').textContent();
    assert.match(blockedAnswer, /系统系列、机床型号、软件版本/);
    assert.match(blockedAnswer, /不要照抄网上数值/);
    assert.match(blockedAnswer, /不要屏蔽联锁/);
    assert.match(blockedAnswer, /可信度台账/);
    const blockedRoutes = await page.locator('#answer-routes a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    assert.ok(blockedRoutes.some(href => /ai-teacher-intake\.html\?source=ai-teacher&category=other$/.test(href)));
    assert.ok(blockedRoutes.includes('./content-trust-status.html'));
    assert.ok(blockedRoutes.includes('./content-trust-evidence.html'));

    await page.locator('#question').fill('我的现场情况说不清楚');
    await page.locator('#ask-form button[type="submit"]').click();
    assert.match(await page.locator('#answer-title').textContent(), /先把问题归类/);
    const unknownFirstRoute = page.locator('#answer-routes a').first();
    assert.equal(await unknownFirstRoute.textContent(), '先生成现场问诊单');
    assert.match(await unknownFirstRoute.getAttribute('href'), /category=other$/);

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
    fs.writeFileSync(`${OUT}/result.json`, JSON.stringify({ api, alarmRoutes, alarmSourceHrefs, g54Hrefs, blockedRoutes, nextHref, touchTargets, requests, errors }, null, 2));
    console.log('CNC AI teacher current profile semantics and trust boundary smoke passed');
  } finally {
    await browser.close();
  }
})().catch(error => {
  fs.writeFileSync(`${OUT}/error.txt`, `${error.stack || error}\n`);
  process.exit(1);
});