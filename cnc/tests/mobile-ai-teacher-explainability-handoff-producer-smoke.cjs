const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('node:assert/strict');

const BASE = process.env.CNC_BASE_URL || 'http://127.0.0.1:4173';
const OUT = 'artifacts/ai-teacher-explainability-handoff-producer';
const HANDOFF_KEY = 'cnc_ai_teacher_explainability_handoff_v1';
fs.mkdirSync(OUT, { recursive: true });

async function submitQuestion(page, question) {
  await page.locator('#question').fill(question);
  await page.locator('#ask-form button[type="submit"]').click();
  await page.locator('#answer.show').waitFor();
}

async function handoffPayload(page) {
  return page.evaluate(key => {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, HANDOFF_KEY);
}

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
    await page.waitForFunction(() => window.CNC_AI_TEACHER?.classificationVersion === '20260802-v2');

    const producerContract = await page.evaluate(() => {
      const handoff = window.CNC_AI_TEACHER.handoff;
      return {
        key: handoff?.key,
        schemaVersion: handoff?.schemaVersion,
        maxAgeMs: handoff?.maxAgeMs,
        hasPrepare: typeof handoff?.prepare === 'function',
        hasClear: typeof handoff?.clear === 'function'
      };
    });
    assert.deepEqual(producerContract, {
      key: HANDOFF_KEY,
      schemaVersion: 1,
      maxAgeMs: 300000,
      hasPrepare: true,
      hasClear: true
    });

    const blockedQuestion = 'FANUC 1815参数应该改成多少';
    await submitQuestion(page, blockedQuestion);
    assert.equal(await page.locator('#answer-status').textContent(), '已阻断高风险请求');
    const blockedExplainLink = page.locator('#answer-routes a', { hasText: '查看本次判断说明' });
    assert.equal(await blockedExplainLink.count(), 1);
    const blockedPayload = await handoffPayload(page);
    assert.equal(blockedPayload.schemaVersion, 1);
    assert.equal(blockedPayload.source, 'ai-teacher');
    assert.equal(blockedPayload.intent, 'blocked');
    assert.equal(blockedPayload.question, blockedQuestion);
    assert.ok(Number.isFinite(blockedPayload.createdAt));
    assert.ok(Number.isFinite(blockedPayload.expiresAt));
    assert.ok(blockedPayload.expiresAt > blockedPayload.createdAt);
    assert.ok(blockedPayload.expiresAt - blockedPayload.createdAt <= 300000);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), HANDOFF_KEY), null);
    assert.equal(new URL(page.url()).search, '');
    assert.equal(new URL(page.url()).hash, '');

    await blockedExplainLink.click();
    await page.waitForURL('**/cnc/ai-teacher-explainability.html');
    await page.waitForFunction(() => document.documentElement.dataset.engineReady === 'true');
    await page.locator('#result.show').waitFor();
    assert.equal(await page.locator('#question').inputValue(), blockedQuestion);
    assert.equal(await page.locator('#decision').textContent(), '已阻断高风险请求');
    assert.match(await page.locator('#handoff-note').textContent(), /已读取并清除同标签页临时问题/);
    assert.equal(await page.evaluate(key => sessionStorage.getItem(key), HANDOFF_KEY), null);
    assert.equal(new URL(page.url()).search, '');
    assert.equal(new URL(page.url()).hash, '');

    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.CNC_AI_TEACHER?.handoff?.key === 'cnc_ai_teacher_explainability_handoff_v1');
    assert.equal(await page.evaluate(key => sessionStorage.getItem(key), HANDOFF_KEY), null);

    const safetyQuestion = '连续复位报警有什么风险';
    await submitQuestion(page, safetyQuestion);
    assert.equal(await page.locator('#answer-status').textContent(), '安全原理说明');
    const safetyExplainLink = page.locator('#answer-routes a', { hasText: '查看本次判断说明' });
    assert.equal(await safetyExplainLink.count(), 1);
    const safetyPayload = await handoffPayload(page);
    assert.equal(safetyPayload.intent, 'safety-boundary');
    assert.equal(safetyPayload.question, safetyQuestion);

    await page.evaluate(key => {
      const now = Date.now();
      sessionStorage.setItem(key, JSON.stringify({
        schemaVersion: 1,
        source: 'ai-teacher',
        intent: 'blocked',
        question: '旧的高风险问题',
        createdAt: now,
        expiresAt: now + 300000
      }));
    }, HANDOFF_KEY);
    await submitQuestion(page, 'G54怎么找正');
    assert.equal(await page.locator('#answer-status').textContent(), '受控基础建议');
    assert.equal(await page.locator('#answer-routes a', { hasText: '查看本次判断说明' }).count(), 0);
    assert.equal(await page.evaluate(key => sessionStorage.getItem(key), HANDOFF_KEY), null);

    await page.evaluate(key => sessionStorage.setItem(key, 'stale'), HANDOFF_KEY);
    await page.locator('[data-intent="next"]').click();
    await page.locator('#answer.show').waitFor();
    assert.equal(await page.locator('#answer-routes a', { hasText: '查看本次判断说明' }).count(), 0);
    assert.equal(await page.evaluate(key => sessionStorage.getItem(key), HANDOFF_KEY), null);

    const touchTargets = await page.locator('a:visible,button:visible,input:visible').evaluateAll(nodes => nodes.map(node => {
      const rect = node.getBoundingClientRect();
      return { text: node.textContent?.trim() || node.getAttribute('placeholder') || '', width: rect.width, height: rect.height };
    }));
    const tooSmall = touchTargets.filter(target => target.width > 0 && target.height > 0 && (target.width < 44 || target.height < 44));
    assert.deepEqual(tooSmall, [], `触控目标不足44px：${JSON.stringify(tooSmall)}`);

    const externalRequests = requests.filter(url => !url.startsWith(BASE));
    assert.deepEqual(externalRequests, [], `一次性交接不得访问站外接口：${externalRequests.join(' | ')}`);
    assert.equal(errors.length, 0, errors.join(' | '));

    await page.screenshot({ path: `${OUT}/ai-teacher-handoff-producer-390x844.png`, fullPage: true });
    fs.writeFileSync(`${OUT}/result.json`, JSON.stringify({ producerContract, blockedPayload, safetyPayload, touchTargets, requests, errors }, null, 2));
    fs.writeFileSync(`${OUT}/findings.txt`, [
      'AI CNC老师判断说明一次性交接生产端验证通过。',
      '只有高风险阻断和安全原理说明会生成查看本次判断说明入口。',
      '临时问题只写入同标签页SessionStorage，不进入URL、LocalStorage或长期学习记录。',
      '判断说明页读取后立即清除临时问题，返回AI老师后不会恢复已消费数据。',
      '普通学习问题与快捷问题会清理旧交接数据且不显示说明入口。',
      '390×844移动端触控目标、零站外请求和浏览器错误门禁通过。'
    ].join('\n'));
    console.log('CNC AI teacher explainability handoff producer smoke passed');
  } finally {
    await browser.close();
  }
})().catch(error => {
  fs.writeFileSync(`${OUT}/error.txt`, `${error.stack || error}\n`);
  process.exit(1);
});
