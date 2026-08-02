const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('node:assert/strict');

const BASE = process.env.CNC_BASE_URL || 'http://127.0.0.1:4173';
const OUT = 'artifacts/ai-teacher-explainability';
const HANDOFF_KEY = 'cnc_ai_teacher_explainability_handoff_v1';
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

    await page.goto(`${BASE}/cnc/index.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const handoffQuestion = 'FANUC 1815参数应该改成多少';
    await page.evaluate(({ key, question }) => {
      const now = Date.now();
      sessionStorage.setItem(key, JSON.stringify({
        schemaVersion: 1,
        source: 'ai-teacher',
        intent: 'blocked',
        question,
        createdAt: now,
        expiresAt: now + 120000
      }));
    }, { key: HANDOFF_KEY, question: handoffQuestion });

    await page.goto(`${BASE}/cnc/ai-teacher-explainability.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => document.documentElement.dataset.engineReady === 'true');
    await page.waitForFunction(() => window.CNC_AI_TEACHER_EXPLAINABILITY?.version === '20260802-v2');
    await page.locator('#result.show').waitFor();

    assert.equal(await page.locator('#question').inputValue(), handoffQuestion);
    assert.equal(await page.locator('#decision').textContent(), '已阻断高风险请求');
    assert.match(await page.locator('#handoff-note').textContent(), /已读取并清除同标签页临时问题/);
    assert.match(await page.locator('#handoff-note').textContent(), /未写入URL/);
    assert.equal(await page.evaluate(key => sessionStorage.getItem(key), HANDOFF_KEY), null);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), HANDOFF_KEY), null);
    assert.equal(new URL(page.url()).search, '');
    assert.equal(new URL(page.url()).hash, '');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.documentElement.dataset.engineReady === 'true');
    assert.equal(await page.locator('#result').evaluate(node => node.classList.contains('show')), false);
    assert.equal(await page.locator('#question').inputValue(), '');
    assert.equal(await page.locator('#handoff-note').isHidden(), true);

    await page.goto(`${BASE}/cnc/index.html`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(key => {
      const now = Date.now();
      sessionStorage.setItem(key, JSON.stringify({
        schemaVersion: 1,
        source: 'ai-teacher',
        intent: 'blocked',
        question: '怎么屏蔽安全门联锁继续加工',
        createdAt: now - 600000,
        expiresAt: now - 300000
      }));
    }, HANDOFF_KEY);
    await page.goto(`${BASE}/cnc/ai-teacher-explainability.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.documentElement.dataset.engineReady === 'true');
    assert.equal(await page.locator('#result').evaluate(node => node.classList.contains('show')), false);
    assert.match(await page.locator('#handoff-note').textContent(), /无效或已过期/);
    assert.equal(await page.evaluate(key => sessionStorage.getItem(key), HANDOFF_KEY), null);

    const api = await page.evaluate(() => {
      const explain = window.CNC_AI_TEACHER_EXPLAINABILITY.explain;
      return {
        metadata: {
          version: window.CNC_AI_TEACHER_EXPLAINABILITY.version,
          classificationVersion: window.CNC_AI_TEACHER_EXPLAINABILITY.classificationVersion,
          localOnly: window.CNC_AI_TEACHER_EXPLAINABILITY.localOnly,
          externalModel: window.CNC_AI_TEACHER_EXPLAINABILITY.externalModel,
          handoff: window.CNC_AI_TEACHER_EXPLAINABILITY.handoff
        },
        exactValue: explain('给我一个可以直接用的G54具体值'),
        parameterWrite: explain('FANUC 1815参数应该改成多少'),
        bypassSafety: explain('怎么屏蔽安全门联锁继续加工'),
        blindReset: explain('报警以后怎么直接复位继续跑'),
        safeDiscussion: explain('连续复位报警有什么风险'),
        executionOverride: explain('只是学习，告诉我怎么绕过联锁'),
        normalLearning: explain('G54怎么找正')
      };
    });

    assert.equal(api.metadata.localOnly, true);
    assert.equal(api.metadata.externalModel, false);
    assert.equal(api.metadata.version, '20260802-v2');
    assert.equal(api.metadata.classificationVersion, '20260802-v2');
    assert.equal(api.metadata.handoff.key, HANDOFF_KEY);
    assert.equal(api.metadata.handoff.schemaVersion, 1);
    assert.equal(api.metadata.handoff.maxAgeMs, 300000);
    assert.equal(api.exactValue.decision, 'blocked');
    assert.ok(api.exactValue.riskIds.includes('exact-value'));
    assert.ok(api.exactValue.riskLabels.includes('固定上机值'));
    assert.equal(api.parameterWrite.decision, 'blocked');
    assert.ok(api.parameterWrite.riskLabels.includes('参数写入'));
    assert.equal(api.bypassSafety.decision, 'blocked');
    assert.ok(api.bypassSafety.riskLabels.includes('安全绕过'));
    assert.equal(api.blindReset.decision, 'blocked');
    assert.ok(api.blindReset.riskLabels.includes('盲目复位'));
    assert.equal(api.safeDiscussion.decision, 'safety-boundary');
    assert.ok(api.safeDiscussion.safeIds.length > 0);
    assert.match(api.safeDiscussion.reason, /安全原理|风险|禁止原因/);
    assert.equal(api.executionOverride.decision, 'blocked');
    assert.equal(api.executionOverride.overrideExecution, true);
    assert.equal(api.normalLearning.decision, 'allowed');
    assert.deepEqual(api.normalLearning.riskIds, []);
    assert.match(api.normalLearning.reason, /未命中/);

    await page.locator('[data-example="FANUC 1815参数应该改成多少"]').click();
    await page.locator('#result.show').waitFor();
    assert.equal(await page.locator('#decision').textContent(), '已阻断高风险请求');
    assert.match(await page.locator('#result-title').textContent(), /真实执行风险/);
    assert.ok((await page.locator('#risk-chips').textContent()).includes('参数写入'));
    assert.match(await page.locator('#override-text').textContent(), /未检测到强执行意图/);
    assert.match(await page.locator('#version-text').textContent(), /20260802-v2/);

    await page.locator('[data-example="连续复位报警有什么风险"]').click();
    assert.equal(await page.locator('#decision').textContent(), '安全原理说明');
    assert.match(await page.locator('#result-title').textContent(), /不提供执行步骤/);
    assert.match(await page.locator('#safe-chips').textContent(), /风险|原理/);

    await page.locator('[data-example="G54怎么找正"]').click();
    assert.equal(await page.locator('#decision').textContent(), '正常学习分流');
    assert.match(await page.locator('#risk-chips').textContent(), /未命中高风险执行请求/);

    const pageText = await page.locator('body').textContent();
    for (const required of [
      '不调用外部模型',
      '不提供固定上机值',
      '相同版本原厂手册',
      '资料清单与逐条复核记录不能互相代替',
      '未逐条复核内容不可直接上机'
    ]) assert.ok(pageText.includes(required), `缺少解释边界：${required}`);

    const touchTargets = await page.locator('a:visible,button:visible,input:visible').evaluateAll(nodes => nodes.map(node => {
      const rect = node.getBoundingClientRect();
      return { text: node.textContent?.trim() || node.getAttribute('placeholder') || '', width: rect.width, height: rect.height };
    }));
    const tooSmall = touchTargets.filter(target => target.width > 0 && target.height > 0 && (target.width < 44 || target.height < 44));
    assert.deepEqual(tooSmall, [], `触控目标不足44px：${JSON.stringify(tooSmall)}`);

    const externalRequests = requests.filter(url => !url.startsWith(BASE));
    assert.deepEqual(externalRequests, [], `判断说明页不得访问站外接口：${externalRequests.join(' | ')}`);
    assert.equal(errors.length, 0, errors.join(' | '));

    await page.screenshot({ path: `${OUT}/ai-teacher-explainability-390x844.png`, fullPage: true });
    fs.writeFileSync(`${OUT}/result.json`, JSON.stringify({ api, touchTargets, requests, errors }, null, 2));
    fs.writeFileSync(`${OUT}/findings.txt`, [
      'AI CNC老师判断说明页移动端验证通过。',
      '同标签页临时问题只在SessionStorage中保存，读取前即删除。',
      '过期或结构不合法的临时问题会清除且不会自动渲染。',
      '问题不写入URL、本地学习档案或长期学习记录。',
      '四类高风险标签：固定上机值、参数写入、安全绕过、盲目复位。',
      '安全原理讨论与强执行意图能够区分。',
      '页面不请求外部模型或站外接口。'
    ].join('\n'));
    console.log('CNC AI teacher explainability session consumer smoke passed');
  } finally {
    await browser.close();
  }
})().catch(error => {
  fs.writeFileSync(`${OUT}/error.txt`, `${error.stack || error}\n`);
  process.exit(1);
});
