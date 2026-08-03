const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');

const BASE = process.env.CNC_BASE_URL || 'http://127.0.0.1:4173';
const OUT = 'artifacts/ai-teacher-handoff-accessibility';
const HANDOFF_KEY = 'cnc_ai_teacher_explainability_handoff_v1';
fs.mkdirSync(OUT, { recursive: true });

function validPayload(question, intent = 'blocked') {
  const now = Date.now();
  return {
    schemaVersion: 1,
    source: 'ai-teacher',
    intent,
    question,
    createdAt: now,
    expiresAt: now + 120000
  };
}

async function createContext(browser, { blockSessionStorage = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    reducedMotion: 'reduce'
  });
  await context.route(`${new URL(BASE).origin}/favicon.ico`, route => route.fulfill({
    status: 204,
    contentType: 'image/x-icon',
    body: ''
  }));
  await context.addInitScript(({ blockStorage }) => {
    window.addEventListener('pageshow', event => {
      document.documentElement.dataset.testPageshowPersisted = String(event.persisted);
    });
    if (!blockStorage) return;
    const originals = {
      getItem: Storage.prototype.getItem,
      setItem: Storage.prototype.setItem,
      removeItem: Storage.prototype.removeItem
    };
    for (const method of Object.keys(originals)) {
      Object.defineProperty(Storage.prototype, method, {
        configurable: true,
        value: function (...args) {
          if (this === window.sessionStorage) {
            throw new DOMException('SessionStorage disabled by accessibility smoke', 'SecurityError');
          }
          return originals[method].apply(this, args);
        }
      });
    }
  }, { blockStorage: blockSessionStorage });
  return context;
}

function watchPage(page) {
  const browserErrors = [];
  const requests = [];
  page.on('pageerror', error => browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`);
  });
  page.on('request', request => requests.push(request.url()));
  return { browserErrors, requests };
}

async function focusSnapshot(page, id) {
  await page.waitForFunction(expected => document.activeElement?.id === expected, id);
  return page.evaluate(expected => {
    const node = document.getElementById(expected);
    const style = getComputedStyle(node);
    return {
      activeId: document.activeElement?.id || '',
      recordedFocus: document.documentElement.dataset.accessibilityFocus || '',
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineOffset: style.outlineOffset
    };
  }, id);
}

function assertVisibleFocus(snapshot, label) {
  assert.equal(snapshot.activeId, snapshot.recordedFocus, `${label}焦点记录必须与真实活动元素一致`);
  assert.notEqual(snapshot.outlineStyle, 'none', `${label}缺少可见焦点轮廓`);
  assert.ok(Number.parseFloat(snapshot.outlineWidth) >= 2, `${label}焦点轮廓应至少 2px`);
}

function assertNoExternalRequests(requests, label) {
  const external = requests.filter(url => !url.startsWith(BASE));
  assert.deepEqual(external, [], `${label}不得触发站外请求：${external.join(' | ')}`);
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chromium',
    ignoreDefaultArgs: ['--disable-back-forward-cache']
  });
  const report = {
    checkedAt: new Date().toISOString(),
    browserVersion: browser.version(),
    viewport: { width: 390, height: 844 },
    reducedMotion: true,
    scenarios: {},
    errors: []
  };

  try {
    // 1) 一次性交接成功后，焦点必须落在判断标题，读屏可区分结果区域及判断理由。
    {
      const context = await createContext(browser);
      const page = await context.newPage();
      const observed = watchPage(page);
      const question = 'FANUC 1815参数应该改成多少';
      await page.goto(`${BASE}/cnc/index.html`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(({ key, payload }) => sessionStorage.setItem(key, JSON.stringify(payload)), {
        key: HANDOFF_KEY,
        payload: validPayload(question)
      });
      await page.goto(`${BASE}/cnc/ai-teacher-explainability.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.documentElement.dataset.engineReady === 'true');
      await page.locator('#result.show').waitFor();
      const focus = await focusSnapshot(page, 'result-title');
      const semantics = await page.evaluate(() => ({
        resultRole: document.getElementById('result').getAttribute('role'),
        resultLive: document.getElementById('result').getAttribute('aria-live'),
        resultAtomic: document.getElementById('result').getAttribute('aria-atomic'),
        labelledBy: document.getElementById('result').getAttribute('aria-labelledby'),
        describedBy: document.getElementById('result').getAttribute('aria-describedby'),
        titleTabindex: document.getElementById('result-title').getAttribute('tabindex'),
        noteRole: document.getElementById('handoff-note').getAttribute('role'),
        noteLive: document.getElementById('handoff-note').getAttribute('aria-live'),
        noteAtomic: document.getElementById('handoff-note').getAttribute('aria-atomic'),
        noteTabindex: document.getElementById('handoff-note').getAttribute('tabindex'),
        questionDescribedBy: document.getElementById('question').getAttribute('aria-describedby'),
        question: document.getElementById('question').value,
        handoffState: document.documentElement.dataset.handoffState,
        decision: document.getElementById('decision').textContent
      }));
      assertVisibleFocus(focus, '一次性交接判断标题');
      assert.equal(semantics.resultRole, 'region');
      assert.equal(semantics.resultLive, 'polite');
      assert.equal(semantics.resultAtomic, 'true');
      assert.equal(semantics.labelledBy, 'result-title');
      assert.equal(semantics.describedBy, 'result-reason');
      assert.equal(semantics.titleTabindex, '-1');
      assert.equal(semantics.noteRole, 'status');
      assert.equal(semantics.noteLive, 'polite');
      assert.equal(semantics.noteAtomic, 'true');
      assert.equal(semantics.noteTabindex, '-1');
      assert.equal(semantics.questionDescribedBy, 'question-help');
      assert.equal(semantics.question, question);
      assert.equal(semantics.handoffState, 'consumed');
      assert.equal(semantics.decision, '已阻断高风险请求');
      assert.equal(observed.browserErrors.length, 0, observed.browserErrors.join(' | '));
      assertNoExternalRequests(observed.requests, '一次性交接判断');
      report.scenarios.consumed = { focus, semantics };
      await page.screenshot({ path: `${OUT}/consumed-focus-390x844.png`, fullPage: true });
      await context.close();
    }

    // 2) SessionStorage 不可用时，焦点必须落在恢复状态；手动判断后再落到结果标题。
    {
      const context = await createContext(browser, { blockSessionStorage: true });
      const page = await context.newPage();
      const observed = watchPage(page);
      await page.goto(`${BASE}/cnc/ai-teacher-explainability.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.documentElement.dataset.engineReady === 'true');
      const statusFocus = await focusSnapshot(page, 'handoff-note');
      const status = await page.evaluate(() => ({
        state: document.documentElement.dataset.handoffState,
        hidden: document.getElementById('handoff-note').hidden,
        text: document.getElementById('handoff-note').textContent
      }));
      assertVisibleFocus(statusFocus, '存储不可用恢复状态');
      assert.equal(status.state, 'storage-unavailable');
      assert.equal(status.hidden, false);
      assert.match(status.text, /无法使用会话临时存储/);
      assert.match(status.text, /未读取|未保存/);

      await page.locator('#question').fill('G54怎么找正');
      await page.locator('#explain-form button[type="submit"]').click();
      await page.locator('#result.show').waitFor();
      const resultFocus = await focusSnapshot(page, 'result-title');
      assertVisibleFocus(resultFocus, '手动判断标题');
      assert.equal(await page.locator('#decision').textContent(), '正常学习分流');
      assert.equal(observed.browserErrors.length, 0, observed.browserErrors.join(' | '));
      assertNoExternalRequests(observed.requests, '存储不可用恢复');
      report.scenarios.storageUnavailable = { statusFocus, status, resultFocus };
      await page.screenshot({ path: `${OUT}/storage-unavailable-focus-390x844.png`, fullPage: true });
      await context.close();
    }

    // 3) 无交接数据时不得抢焦点；点击示例后必须把焦点送到判断标题。
    {
      const context = await createContext(browser);
      const page = await context.newPage();
      const observed = watchPage(page);
      await page.goto(`${BASE}/cnc/ai-teacher-explainability.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.documentElement.dataset.engineReady === 'true');
      const initialActive = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName.toLowerCase() || '');
      assert.notEqual(initialActive, 'handoff-note', '没有交接数据时不得把焦点送到隐藏状态');
      assert.notEqual(initialActive, 'result-title', '没有判断结果时不得把焦点送到隐藏标题');
      await page.locator('[data-example="连续复位报警有什么风险"]').click();
      await page.locator('#result.show').waitFor();
      const exampleFocus = await focusSnapshot(page, 'result-title');
      assertVisibleFocus(exampleFocus, '示例判断标题');
      assert.equal(await page.locator('#decision').textContent(), '安全原理说明');
      assert.equal(observed.browserErrors.length, 0, observed.browserErrors.join(' | '));
      assertNoExternalRequests(observed.requests, '普通页面与示例判断');
      report.scenarios.noHandoff = { initialActive, exampleFocus };
      await context.close();
    }

    // 4) 真实 BFCache 返回时，已消费内容保持清空，焦点落到恢复状态而不是旧判断标题。
    {
      const context = await createContext(browser);
      const page = await context.newPage();
      const observed = watchPage(page);
      const bfcacheNotUsed = [];
      const cdp = await context.newCDPSession(page);
      await cdp.send('Page.enable');
      cdp.on('Page.backForwardCacheNotUsed', event => bfcacheNotUsed.push(event));
      const question = '怎么屏蔽安全门联锁继续加工';
      await page.goto(`${BASE}/cnc/index.html`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(({ key, payload }) => sessionStorage.setItem(key, JSON.stringify(payload)), {
        key: HANDOFF_KEY,
        payload: validPayload(question)
      });
      await page.goto(`${BASE}/cnc/ai-teacher-explainability.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.documentElement.dataset.engineReady === 'true');
      await focusSnapshot(page, 'result-title');
      await page.locator('a[href="./ai-teacher.html"]').click();
      await page.waitForURL(/\/cnc\/ai-teacher\.html$/);
      await page.evaluate(() => history.back());
      await page.waitForFunction(() => location.pathname.endsWith('/cnc/ai-teacher-explainability.html'));
      await page.waitForFunction(() => document.documentElement.dataset.testPageshowPersisted === 'true');
      const restoredFocus = await focusSnapshot(page, 'handoff-note');
      const restored = await page.evaluate(() => ({
        persisted: document.documentElement.dataset.testPageshowPersisted,
        state: document.documentElement.dataset.handoffState,
        question: document.getElementById('question').value,
        resultVisible: document.getElementById('result').classList.contains('show'),
        note: document.getElementById('handoff-note').textContent,
        stored: sessionStorage.getItem('cnc_ai_teacher_explainability_handoff_v1')
      }));
      assertVisibleFocus(restoredFocus, 'BFCache恢复状态');
      assert.equal(restored.persisted, 'true', `必须真实使用 BFCache；未使用原因：${JSON.stringify(bfcacheNotUsed)}`);
      assert.equal(restored.state, 'consumed-cleared');
      assert.equal(restored.question, '');
      assert.equal(restored.resultVisible, false);
      assert.match(restored.note, /不会再次显示|已清除/);
      assert.equal(restored.stored, null);
      assert.equal(observed.browserErrors.length, 0, observed.browserErrors.join(' | '));
      assertNoExternalRequests(observed.requests, 'BFCache恢复');
      report.scenarios.bfcache = { restoredFocus, restored, notUsedReasons: bfcacheNotUsed };
      await page.screenshot({ path: `${OUT}/bfcache-focus-390x844.png`, fullPage: true });
      await context.close();
    }

    fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
    fs.writeFileSync(`${OUT}/findings.txt`, [
      'AI CNC老师一次性交接无障碍焦点与状态播报验证通过。',
      '交接成功、手动判断和示例判断均把焦点送到判断标题，并提供可见焦点轮廓。',
      '存储不可用、交接失效与BFCache恢复状态使用role=status和polite播报。',
      '无交接数据时不会抢占焦点，隐藏结果不会被误聚焦。',
      'BFCache返回继续清空问题与结果，不重复消费，也不泄露到长期存储或站外接口。',
      '具体参数、报警、刀补和恢复操作仍需核对相同版本原厂手册及现场受控条件。'
    ].join('\n'));
    console.log('CNC AI teacher handoff accessibility smoke passed');
  } catch (error) {
    report.errors.push(error.stack || String(error));
    fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
    fs.writeFileSync(`${OUT}/error.txt`, `${error.stack || error}\n`);
    throw error;
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
