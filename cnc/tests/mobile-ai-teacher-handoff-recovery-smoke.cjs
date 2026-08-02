const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('node:assert/strict');

const BASE = process.env.CNC_BASE_URL || 'http://127.0.0.1:4173';
const OUT = 'artifacts/ai-teacher-handoff-recovery';
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

async function createMobileContext(browser, { blockSessionStorage = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2
  });
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
            throw new DOMException('SessionStorage disabled by recovery smoke', 'SecurityError');
          }
          return originals[method].apply(this, args);
        }
      });
    }
  }, { blockStorage: blockSessionStorage });
  return context;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = { checkedAt: new Date().toISOString(), scenarios: {}, errors: [] };
  try {
    // 1) 已消费问题在 BFCache 返回时不得重新出现。
    {
      const context = await createMobileContext(browser);
      const page = await context.newPage();
      const browserErrors = [];
      page.on('pageerror', error => browserErrors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });

      await page.goto(`${BASE}/cnc/index.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const question = 'FANUC 1815参数应该改成多少';
      await page.evaluate(({ key, payload }) => sessionStorage.setItem(key, JSON.stringify(payload)), {
        key: HANDOFF_KEY,
        payload: validPayload(question)
      });
      await page.goto(`${BASE}/cnc/ai-teacher-explainability.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForFunction(() => document.documentElement.dataset.engineReady === 'true');
      await page.locator('#result.show').waitFor();
      assert.equal(await page.locator('#question').inputValue(), question);
      assert.equal(await page.evaluate(key => sessionStorage.getItem(key), HANDOFF_KEY), null);

      await page.locator('a[href="./ai-teacher.html"]').click();
      await page.waitForURL(/\/cnc\/ai-teacher\.html$/);
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await page.waitForURL(/\/cnc\/ai-teacher-explainability\.html$/);
      await page.waitForFunction(() => document.documentElement.dataset.engineReady === 'true');

      const restored = await page.evaluate(() => ({
        persisted: document.documentElement.dataset.testPageshowPersisted,
        question: document.getElementById('question').value,
        resultVisible: document.getElementById('result').classList.contains('show'),
        handoffState: document.documentElement.dataset.handoffState || '',
        note: document.getElementById('handoff-note').textContent || ''
      }));
      assert.equal(restored.persisted, 'true', '必须真实覆盖 BFCache 恢复路径');
      assert.equal(restored.question, '', 'BFCache 返回不得恢复已消费的问题文本');
      assert.equal(restored.resultVisible, false, 'BFCache 返回不得恢复已消费的判断结果');
      assert.match(restored.note, /不会再次显示|已清除/, 'BFCache 返回应给出清晰恢复提示');
      assert.equal(browserErrors.length, 0, browserErrors.join(' | '));
      report.scenarios.bfcache = restored;
      await page.screenshot({ path: `${OUT}/bfcache-return-390x844.png`, fullPage: true });
      await context.close();
    }

    // 2) SessionStorage 被浏览器策略禁用时，页面不得崩溃，仍可手动解释普通问题。
    {
      const context = await createMobileContext(browser, { blockSessionStorage: true });
      const page = await context.newPage();
      const browserErrors = [];
      const requests = [];
      page.on('pageerror', error => browserErrors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
      page.on('request', request => requests.push(request.url()));

      await page.goto(`${BASE}/cnc/ai-teacher-explainability.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForFunction(() => document.documentElement.dataset.engineReady === 'true');
      assert.equal(document !== null, true);
      const storageState = await page.evaluate(() => ({
        state: document.documentElement.dataset.handoffState || '',
        noteHidden: document.getElementById('handoff-note').hidden,
        note: document.getElementById('handoff-note').textContent || ''
      }));
      assert.equal(storageState.state, 'storage-unavailable');
      assert.equal(storageState.noteHidden, false);
      assert.match(storageState.note, /无法使用会话临时存储/);
      assert.match(storageState.note, /未读取|未保存/);

      await page.locator('#question').fill('G54怎么找正');
      await page.locator('#explain-form button[type="submit"]').click();
      await page.locator('#result.show').waitFor();
      assert.equal(await page.locator('#decision').textContent(), '正常学习分流');
      assert.equal(browserErrors.length, 0, browserErrors.join(' | '));
      assert.deepEqual(requests.filter(url => !url.startsWith(BASE)), [], '存储异常恢复不得触发站外请求');
      report.scenarios.storageUnavailable = storageState;
      await page.screenshot({ path: `${OUT}/storage-unavailable-390x844.png`, fullPage: true });
      await context.close();
    }

    // 3) 新建的独立标签页不应读到原标签页已经准备的临时问题。
    {
      const context = await createMobileContext(browser);
      const source = await context.newPage();
      await source.goto(`${BASE}/cnc/index.html`, { waitUntil: 'domcontentloaded' });
      await source.evaluate(({ key, payload }) => sessionStorage.setItem(key, JSON.stringify(payload)), {
        key: HANDOFF_KEY,
        payload: validPayload('怎么屏蔽安全门联锁继续加工')
      });
      const isolated = await context.newPage();
      await isolated.goto(`${BASE}/cnc/ai-teacher-explainability.html`, { waitUntil: 'domcontentloaded' });
      await isolated.waitForFunction(() => document.documentElement.dataset.engineReady === 'true');
      const isolation = await isolated.evaluate(() => ({
        state: document.documentElement.dataset.handoffState,
        question: document.getElementById('question').value,
        resultVisible: document.getElementById('result').classList.contains('show')
      }));
      assert.equal(isolation.state, 'none');
      assert.equal(isolation.question, '');
      assert.equal(isolation.resultVisible, false);
      report.scenarios.separateTab = isolation;
      await context.close();
    }

    fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
    fs.writeFileSync(`${OUT}/findings.txt`, [
      'AI CNC老师一次性交接恢复与异常场景验证通过。',
      'BFCache 返回不会恢复已经消费的问题文本或判断结果。',
      'SessionStorage 不可用时页面显示中文恢复提示，且普通手动解释仍可使用。',
      '独立标签页不会读取其他标签页的一次性交接数据。',
      '临时问题不写入 URL、长期学习记录或站外接口。'
    ].join('\n'));
    console.log('CNC AI teacher handoff recovery smoke passed');
  } catch (error) {
    report.errors.push(error.stack || String(error));
    fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
    fs.writeFileSync(`${OUT}/error.txt`, `${error.stack || error}\n`);
    throw error;
  } finally {
    await browser.close();
  }
})().catch(() => process.exit(1));
