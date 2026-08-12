const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { ensureControlled } = require('./pwa-controller-test-helper.cjs');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'cnc/test-results');
const CURRENT_PWA_BUILD = '20260812-pwa41';
const PREVIOUS_PWA_BUILD = '20260810-pwa35';
const CURRENT_CACHE_REVISION = '20260812-learning41';
const PREVIOUS_CACHE_REVISION = '20260810-learning35';
const CURRENT_STATIC_CACHE = `cnc-static-${CURRENT_CACHE_REVISION}`;
const CURRENT_RUNTIME_CACHE = `cnc-runtime-${CURRENT_CACHE_REVISION}`;
const PREVIOUS_STATIC_CACHE = `cnc-static-${PREVIOUS_CACHE_REVISION}`;
const PREVIOUS_RUNTIME_CACHE = `cnc-runtime-${PREVIOUS_CACHE_REVISION}`;
const UNRELATED_CACHE = 'other-app-cache-v1';
const PLACEMENT_HANDOFF_KEY = 'cnc_beginner_placement_route_handoff_v1';
const TRAINING_CORE_PATHS = ['./training-practice.js', './training-profile.js', './search-aliases.js', './gm-code-complete.js', './learning-content-data.js'];
const PLACEMENT_FIRST_STEP_COURSES = [
  { path: 'course-safety-foundation.html', title: '第1关 安全基础', required: ['先学会停，再学会动', '原厂手册', '授权人员'] },
  { path: 'course-coordinate-axes.html', title: '第3关 坐标轴与运动方向', required: ['坐标轴与运动方向', '原厂手册', '现场条件'] },
  { path: 'course-g00-g01-basics.html', title: '第9关 G00与G01', required: ['G00与G01', '不能直接用于真实加工', '原厂手册'] }
];
const DATA_KEYS = [
  'cnc_training_profile_v1',
  'cnc_training_practice_v1',
  'cnc_training_simulator_v1',
  'unrelated_keep_me'
];

fs.mkdirSync(out, { recursive: true });

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let requestPath = decodeURIComponent(req.url.split('?')[0]);
  if (requestPath === '/' || requestPath === '/cnc/') requestPath = '/cnc/index.html';
  const file = path.normalize(path.join(root, requestPath));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end('404');
    return;
  }
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

function observePage(page, errors) {
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', error => errors.push(error.message));
}

async function readOriginState(page) {
  return page.evaluate(async keys => {
    const local = Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)]));
    const session = sessionStorage.getItem('cnc_upgrade_session_probe');
    const indexedDb = await new Promise((resolve, reject) => {
      const request = indexedDB.open('cnc-upgrade-probe', 1);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('records')) {
          request.result.createObjectStore('records');
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('records', 'readonly');
        const getRequest = transaction.objectStore('records').get('growth');
        getRequest.onerror = () => reject(getRequest.error);
        getRequest.onsuccess = () => {
          resolve(getRequest.result || null);
          db.close();
        };
      };
    });
    return { local, session, indexedDb };
  }, DATA_KEYS);
}

function assertControlledPracticeMigration(beforeLocal, afterLocal) {
  for (const key of DATA_KEYS.filter(item => item !== 'cnc_training_practice_v1')) {
    assert.equal(afterLocal[key], beforeLocal[key], `离线导航错误修改非练习LocalStorage：${key}`);
  }

  const previous = JSON.parse(beforeLocal.cnc_training_practice_v1 || 'null');
  const current = JSON.parse(afterLocal.cnc_training_practice_v1 || 'null');
  assert(previous && previous.version === 1, `测试前练习状态必须是旧版v1：${JSON.stringify(previous)}`);
  assert(current && current.version === 2, `离线加载主学习页后练习状态必须受控迁移到v2：${JSON.stringify(current)}`);
  assert.equal(current.gateVersion, 2, `练习状态门禁版本错误：${JSON.stringify(current)}`);
  assert.deepStrictEqual(current.history, previous.history, '练习状态迁移丢失历史成绩');
  assert.deepStrictEqual(current.wrongQuestions, previous.wrongQuestions, '练习状态迁移丢失旧错题记录');
  assert.deepStrictEqual(current.legacyLessonScores, {}, '旧版样例不应凭空产生历史课程分数');
  assert.deepStrictEqual(current.lessonScores, {}, '旧版样例不应凭空产生新版课程分数');
  assert.deepStrictEqual(current.attempts, {}, '旧版样例不应凭空产生答题尝试');
  assert.deepStrictEqual(current.wrong, [], '旧版样例不应凭空产生新版错题ID');
  assert.deepStrictEqual(current.correct, [], '旧版样例不应凭空产生新版正确题ID');
  const allowedKeys = ['attempts','correct','gateVersion','history','legacyLessonScores','lessonScores','updatedAt','version','wrong','wrongQuestions'].sort();
  assert.deepStrictEqual(Object.keys(current).sort(), allowedKeys, `练习状态迁移出现未授权字段：${JSON.stringify(current)}`);
  assert(Number.isFinite(Date.parse(current.updatedAt)), `练习状态迁移缺少合法更新时间：${current.updatedAt}`);

  return {
    previousVersion: previous.version,
    currentVersion: current.version,
    gateVersion: current.gateVersion,
    historyCount: current.history.length,
    wrongQuestionCount: current.wrongQuestions.length,
    updatedAt: current.updatedAt
  };
}

async function captureDiagnostics(page, context, stage, errors) {
  const diagnostic = {
    stage,
    url: page ? page.url() : '',
    title: '',
    body: '',
    controller: null,
    registrations: [],
    caches: [],
    storage: null,
    offline: null,
    consoleErrors: errors
  };
  try { diagnostic.title = await page.title(); } catch {}
  try { diagnostic.body = (await page.locator('body').innerText()).slice(0, 4000); } catch {}
  try {
    diagnostic.controller = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL || '');
    diagnostic.registrations = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map(registration => ({
      scope: registration.scope,
      active: registration.active?.scriptURL || '',
      activeState: registration.active?.state || '',
      waiting: registration.waiting?.scriptURL || '',
      installing: registration.installing?.scriptURL || ''
    })));
  } catch {}
  try { diagnostic.caches = await page.evaluate(() => caches.keys()); } catch {}
  try { diagnostic.storage = await readOriginState(page); } catch {}
  try { diagnostic.offline = await context.isOffline(); } catch {}
  fs.writeFileSync(path.join(out, 'pwa-upgrade-data-diagnostic.json'), JSON.stringify(diagnostic, null, 2));
  try { await page.screenshot({ path: path.join(out, 'pwa-upgrade-data-failure.png'), fullPage: true }); } catch {}
}

async function completeCriticalSafetyPlacement(page) {
  const answers = [0, 2, 1, 1, 1, 1];
  for (let index = 0; index < answers.length; index += 1) {
    await page.locator(`#option-${index}-${answers[index]}`).click();
    await page.locator('#next').click();
  }
  await page.locator('#result[data-decision="critical-safety"]').waitFor({ state: 'visible' });
}

async function verifyColdOfflineCourse(page, course) {
  await page.goto(`http://127.0.0.1:4173/cnc/${course.path}`, { waitUntil: 'domcontentloaded' });
  assert((await page.title()).includes(course.title), `升级后${course.path}冷离线打开失败`);
  const body = await page.locator('body').innerText();
  for (const token of course.required) {
    assert(body.includes(token), `升级后${course.path}丢失可信或安全边界：${token}`);
  }
}

(async () => {
  let context;
  let userDataDir;
  let page;
  const errors = [];
  let stage = 'server-start';

  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(4173, '127.0.0.1', resolve);
    });

    stage = 'browser-launch';
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-pwa-upgrade-'));
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: true,
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'allow'
    });
    page = context.pages()[0] || await context.newPage();
    observePage(page, errors);

    stage = 'seed-previous-version';
    await page.goto('http://127.0.0.1:4173/cnc/offline.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(async ({ previousStatic, previousRuntime, currentStatic, currentRuntime, unrelated }) => {
      const existing = await navigator.serviceWorker.getRegistrations();
      await Promise.all(existing.map(registration => registration.unregister()));
      for (const name of [previousStatic, previousRuntime, currentStatic, currentRuntime, unrelated]) {
        await caches.delete(name);
      }

      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('cnc_training_profile_v1', JSON.stringify({
        version: 1,
        xp: 680,
        level: 6,
        abilities: { safety: 92, coordinates: 84 },
        achievements: ['first-perfect']
      }));
      localStorage.setItem('cnc_training_practice_v1', JSON.stringify({
        version: 1,
        history: [{ practiceId: 'safety-coordinate', score: 100, completedAt: '2026-07-31T12:00:00.000Z' }],
        wrongQuestions: [{ id: 'offset-risk-01', attempts: 2 }]
      }));
      localStorage.setItem('cnc_training_simulator_v1', JSON.stringify({
        version: 1,
        simulators: { homing: { passed: true, bestScore: 100 }, firstArticle: { passed: true, bestScore: 95 } }
      }));
      localStorage.setItem('unrelated_keep_me', '不得被PWA升级删除');
      sessionStorage.setItem('cnc_upgrade_session_probe', '同一标签页应保留');

      await new Promise((resolve, reject) => {
        const request = indexedDB.open('cnc-upgrade-probe', 1);
        request.onerror = () => reject(request.error);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains('records')) request.result.createObjectStore('records');
        };
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction('records', 'readwrite');
          transaction.objectStore('records').put({ xp: 680, streak: 12, source: 'pwa27' }, 'growth');
          transaction.onerror = () => reject(transaction.error);
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      });

      const response = new Response('legacy-cache-marker', { headers: { 'Content-Type': 'text/plain' } });
      const oldStatic = await caches.open(previousStatic);
      await oldStatic.put(new URL('./legacy-static.txt', location.href), response.clone());
      const oldRuntime = await caches.open(previousRuntime);
      await oldRuntime.put(new URL('./legacy-runtime.txt', location.href), response.clone());
      const unrelatedCache = await caches.open(unrelated);
      await unrelatedCache.put(new URL('/unrelated-probe.txt', location.origin), response.clone());
    }, {
      previousStatic: PREVIOUS_STATIC_CACHE,
      previousRuntime: PREVIOUS_RUNTIME_CACHE,
      currentStatic: CURRENT_STATIC_CACHE,
      currentRuntime: CURRENT_RUNTIME_CACHE,
      unrelated: UNRELATED_CACHE
    });

    const before = await readOriginState(page);
    const cachesBefore = await page.evaluate(() => caches.keys());
    assert(cachesBefore.includes(PREVIOUS_STATIC_CACHE), `旧静态缓存未建立: ${JSON.stringify(cachesBefore)}`);
    assert(cachesBefore.includes(PREVIOUS_RUNTIME_CACHE), `旧运行时缓存未建立: ${JSON.stringify(cachesBefore)}`);
    assert(cachesBefore.includes(UNRELATED_CACHE), `无关缓存未建立: ${JSON.stringify(cachesBefore)}`);

    stage = 'activate-current-worker';
    page = await ensureControlled(page, errors, observePage, {
      controlledUrl: 'http://127.0.0.1:4173/cnc/offline.html'
    });

    await page.waitForFunction(({ currentStatic, currentRuntime, previousStatic, previousRuntime, unrelated }) => caches.keys().then(names =>
      names.includes(currentStatic) &&
      names.includes(currentRuntime) &&
      !names.includes(previousStatic) &&
      !names.includes(previousRuntime) &&
      names.includes(unrelated)
    ), {
      currentStatic: CURRENT_STATIC_CACHE,
      currentRuntime: CURRENT_RUNTIME_CACHE,
      previousStatic: PREVIOUS_STATIC_CACHE,
      previousRuntime: PREVIOUS_RUNTIME_CACHE,
      unrelated: UNRELATED_CACHE
    });

    stage = 'verify-upgrade-contract';
    const registrations = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map(registration => ({
      scope: registration.scope,
      active: registration.active?.scriptURL || '',
      activeState: registration.active?.state || '',
      waiting: registration.waiting?.scriptURL || '',
      installing: registration.installing?.scriptURL || ''
    })));
    const expectedScope = 'http://127.0.0.1:4173/cnc/';
    const scopedRegistrations = registrations.filter(item => item.scope === expectedScope);
    assert.equal(scopedRegistrations.length, 1, `升级后必须只有一个/cnc/注册: ${JSON.stringify(registrations)}`);
    assert(scopedRegistrations[0].active.endsWith('/cnc/sw.js'), `激活Worker脚本错误: ${JSON.stringify(scopedRegistrations[0])}`);
    assert.equal(scopedRegistrations[0].activeState, 'activated', `Worker未激活: ${JSON.stringify(scopedRegistrations[0])}`);
    assert.equal(scopedRegistrations[0].waiting, '', `升级后不应残留waiting Worker: ${JSON.stringify(scopedRegistrations[0])}`);
    assert.equal(scopedRegistrations[0].installing, '', `升级后不应残留installing Worker: ${JSON.stringify(scopedRegistrations[0])}`);

    const workerState = await page.evaluate(() => new Promise((resolve, reject) => {
      const controller = navigator.serviceWorker.controller;
      if (!controller) return reject(new Error('页面未被Service Worker接管'));
      const channel = new MessageChannel();
      const timer = setTimeout(() => reject(new Error('读取Service Worker构建号超时')), 5000);
      channel.port1.onmessage = event => {
        clearTimeout(timer);
        resolve({ build: event.data?.build || '', cacheRevision: event.data?.cacheRevision || '' });
      };
      controller.postMessage({ type: 'GET_BUILD' }, [channel.port2]);
    }));
    assert.equal(workerState.build, CURRENT_PWA_BUILD, `Worker构建号错误: ${workerState.build}`);
    assert.equal(workerState.cacheRevision, CURRENT_CACHE_REVISION, `Worker缓存修订错误: ${workerState.cacheRevision}`);

    const cachesAfter = await page.evaluate(() => caches.keys());
    assert(!cachesAfter.includes(PREVIOUS_STATIC_CACHE), `旧静态缓存未清理: ${JSON.stringify(cachesAfter)}`);
    assert(!cachesAfter.includes(PREVIOUS_RUNTIME_CACHE), `旧运行时缓存未清理: ${JSON.stringify(cachesAfter)}`);
    assert(cachesAfter.includes(CURRENT_STATIC_CACHE), `新静态缓存缺失: ${JSON.stringify(cachesAfter)}`);
    assert(cachesAfter.includes(CURRENT_RUNTIME_CACHE), `新运行时缓存缺失: ${JSON.stringify(cachesAfter)}`);
    assert(cachesAfter.includes(UNRELATED_CACHE), `升级错误删除无关缓存: ${JSON.stringify(cachesAfter)}`);

    const trainingCoreMissing = await page.evaluate(async ({ cacheName, paths }) => {
      const cache = await caches.open(cacheName);
      const missing = [];
      for (const item of paths) if (!await cache.match(new URL(item, location.href))) missing.push(item);
      return missing;
    }, { cacheName: CURRENT_STATIC_CACHE, paths: TRAINING_CORE_PATHS });
    assert.deepStrictEqual(trainingCoreMissing, [], `升级后训练核心静态缓存缺失: ${JSON.stringify(trainingCoreMissing)}`);

    const after = await readOriginState(page);
    assert.deepStrictEqual(after.local, before.local, `LocalStorage在PWA升级中发生变化: ${JSON.stringify({ before, after })}`);
    assert.equal(after.session, before.session, 'SessionStorage在同一标签页升级中发生变化');
    assert.deepStrictEqual(after.indexedDb, before.indexedDb, `IndexedDB在PWA升级中发生变化: ${JSON.stringify({ before, after })}`);

    stage = 'cold-offline-after-upgrade';
    await context.setOffline(true);
    await page.goto('http://127.0.0.1:4173/cnc/beginner-placement.html', { waitUntil: 'domcontentloaded' });
    assert((await page.title()).includes('CNC新手起点测评'), '升级后起点测评冷离线打开失败');
    const placementBody = await page.locator('body').innerText();
    assert(placementBody.includes('测评只做推荐'), '升级后起点测评丢失推荐边界');
    assert(placementBody.includes('关键安全项是硬门禁'), '升级后起点测评丢失关键安全硬门禁');
    assert(placementBody.includes('相同版本原厂手册'), '升级后起点测评丢失原厂手册边界');
    assert(placementBody.includes('授权人员确认'), '升级后起点测评丢失授权人员边界');
    assert.equal(await page.locator('#progress[role="progressbar"]').count(), 1, '升级后起点测评丢失进度条语义');
    assert.equal(await page.locator('#options[role="radiogroup"]').count(), 1, '升级后起点测评丢失单选组语义');
    assert.equal(await page.locator('#result-diagnostics').count(), 1, '升级后起点测评丢失可解释判断区域');

    stage = 'cold-offline-route-handoff-after-upgrade';
    await completeCriticalSafetyPlacement(page);
    await page.locator('#handoff-link').click();
    await page.waitForURL(/\/cnc\/training-camp\.html$/);
    await page.locator('#placement-handoff[data-state="consumed"]').waitFor({ state: 'visible' });
    const routeHandoff = await page.evaluate(key => ({
      title: document.querySelector('#placement-handoff-title')?.textContent || '',
      stepCount: document.querySelectorAll('#placement-handoff-steps li').length,
      ctaHref: document.querySelector('#placement-handoff-cta')?.getAttribute('href') || '',
      sessionValue: sessionStorage.getItem(key),
      localValue: localStorage.getItem(key),
      sessionProbe: sessionStorage.getItem('cnc_upgrade_session_probe')
    }), PLACEMENT_HANDOFF_KEY);
    assert(routeHandoff.title.includes('安全基础'), `升级后离线路线标题错误: ${JSON.stringify(routeHandoff)}`);
    assert.equal(routeHandoff.stepCount, 3, `升级后离线路线步骤错误: ${JSON.stringify(routeHandoff)}`);
    assert.equal(routeHandoff.ctaHref, './course-safety-foundation.html', `升级后离线路线首步链接错误: ${JSON.stringify(routeHandoff)}`);
    assert.equal(routeHandoff.sessionValue, null, '升级后离线路线未立即清除');
    assert.equal(routeHandoff.localValue, null, '升级后离线路线泄露到LocalStorage');
    assert.equal(routeHandoff.sessionProbe, before.session, '路线交接错误清除其他SessionStorage数据');

    stage = 'cold-offline-first-step-click-after-upgrade';
    await page.locator('#placement-handoff-cta').click();
    await page.waitForURL(/\/cnc\/course-safety-foundation\.html$/);
    await verifyColdOfflineCourse(page, PLACEMENT_FIRST_STEP_COURSES[0]);

    stage = 'cold-offline-first-step-courses-after-upgrade';
    for (const course of PLACEMENT_FIRST_STEP_COURSES.slice(1)) {
      await verifyColdOfflineCourse(page, course);
    }

    stage = 'cold-offline-g28-directory-after-upgrade';
    const offlineG28Trust = await page.evaluate(async () => {
      const response = await fetch('./gm-code-complete.js');
      return { ok: response.ok, text: await response.text() };
    });
    assert(offlineG28Trust.ok, '升级后G/M可信目录冷离线读取失败');
    for (const token of ['高风险自动运动', 'G90/G91', '绝对或增量解释', '当前CNC和机床厂原厂手册', '刀具', '刀柄', '工件', '夹具', '完整计划运动空间', '授权操作规程']) {
      assert(offlineG28Trust.text.includes(token), `G28冷离线源目录缺少安全边界：${token}`);
    }
    for (const forbidden of ['G28常配合G91 Z0先回Z，减少撞机。', '必须先Z后XY', 'G91 G28 Z0一定安全']) {
      assert(!offlineG28Trust.text.includes(forbidden), `G28冷离线源目录仍含无适用范围防撞表述：${forbidden}`);
    }

    stage = 'cold-offline-g92-directory-after-upgrade';
    const offlineG92Trust = await page.evaluate(async () => {
      const response = await fetch('./gm-code-complete.js');
      return { ok: response.ok, text: await response.text() };
    });
    assert(offlineG92Trust.ok, '升级后G92可信目录冷离线读取失败');
    for (const token of ['车铣差异', '部分铣床/加工中心', '部分车床', '当前CNC与机床厂原厂手册', 'G52/G54-G59', 'X/Z或U/W', 'I/Q/F', '主轴同步', '安全退刀空间', '两类程序不能直接互抄']) {
      assert(offlineG92Trust.text.includes(token), `G92冷离线源目录缺少双语义安全边界：${token}`);
    }
    for (const forbidden of ['加工中心/旧系统可用于坐标设定，车床常用于简单螺纹循环。', '车床：G92 X20. Z-30. F1.5 表示螺纹循环。', 'G92就是螺纹循环', 'G92就是坐标设定']) {
      assert(!offlineG92Trust.text.includes(forbidden), `G92冷离线源目录仍含无适用范围表述：${forbidden}`);
    }

    stage = 'cold-offline-main-learning-content-after-upgrade';
    await page.goto('http://127.0.0.1:4173/cnc/index.html#view-study', { waitUntil: 'domcontentloaded' });
    const lesson8 = await page.evaluate(() => window.CNC_LEARNING_CONTENT?.lessons?.[8] || null);
    assert(lesson8, '升级后12关主课程数据冷离线加载失败');
    const lesson8Text = JSON.stringify(lesson8);
    assert(lesson8Text.includes('不能把“先Z后XY”当成所有机床通用规则'), '升级后第8关丢失安全撤离适用范围');
    assert(lesson8Text.includes('固定直线或固定折线'), '升级后第8关丢失G00轨迹适用范围');
    assert(lesson8Text.includes('原厂手册'), '升级后第8关丢失原厂手册核对边界');
    const lesson5 = await page.evaluate(() => window.CNC_LEARNING_CONTENT?.lessons?.[5] || null);
    assert(lesson5, '升级后第5关刀长补偿主课程数据冷离线加载失败');
    const lesson5Text = JSON.stringify(lesson5);
    assert(lesson5Text.includes('T/H 数字相同是常见约定，不是所有机床都必须遵守的硬规则'), '升级后第5关丢失T/H同号适用范围');
    assert(lesson5Text.includes('不能仅凭 T01 M06 后使用 G43 H02 就直接判错'), '升级后第5关仍可能把T01+H02无条件判错');
    assert(lesson5Text.includes('原厂手册'), '升级后第5关丢失T/H映射原厂手册核对边界');

    await page.goto('http://127.0.0.1:4173/cnc/ai-teacher.html', { waitUntil: 'domcontentloaded' });
    assert((await page.title()).includes('AI CNC老师'), '升级后AI CNC老师冷离线打开失败');
    await page.goto('http://127.0.0.1:4173/cnc/ai-teacher-intake.html', { waitUntil: 'domcontentloaded' });
    assert((await page.title()).includes('现场问诊单'), '升级后现场问诊单冷离线打开失败');
    await page.goto('http://127.0.0.1:4173/cnc/ai-teacher-explainability.html', { waitUntil: 'domcontentloaded' });
    assert((await page.title()).includes('AI老师判断说明'), '升级后AI老师判断说明页冷离线打开失败');
    const explainabilityBody = await page.locator('body').innerText();
    assert(explainabilityBody.includes('本页不提供固定上机值'), '升级后判断说明页丢失固定值边界');
    assert(explainabilityBody.includes('未逐条复核内容不可直接上机'), '升级后判断说明页丢失可信度边界');

    const afterOfflineNavigation = await readOriginState(page);
    const practiceMigration = assertControlledPracticeMigration(before.local, afterOfflineNavigation.local);
    assert.equal(afterOfflineNavigation.session, before.session, '离线导航后SessionStorage探针发生变化');
    assert.deepStrictEqual(afterOfflineNavigation.indexedDb, before.indexedDb, '离线导航后IndexedDB发生变化');

    await page.screenshot({ path: path.join(out, 'pwa-upgrade-data-390x844.png'), fullPage: true });
    if (errors.length) throw new Error(`控制台错误: ${errors.join(' | ')}`);

    fs.writeFileSync(path.join(out, 'pwa-upgrade-data-result.json'), JSON.stringify({
      previousPwaBuild: PREVIOUS_PWA_BUILD,
      currentPwaBuild: CURRENT_PWA_BUILD,
      previousCacheRevision: PREVIOUS_CACHE_REVISION,
      currentCacheRevision: CURRENT_CACHE_REVISION,
      oldCachesRemoved: true,
      currentCachesReady: true,
      trainingCoreStaticCacheReady: true,
      trainingCorePaths: TRAINING_CORE_PATHS,
      mainLearningContentColdOfflineAfterUpgrade: true,
      toolOffsetMappingColdOfflineAfterUpgrade: true,
      g28ReferenceReturnColdOfflineAfterUpgrade: true,
      unrelatedCachePreserved: true,
      singleScopedRegistration: true,
      localStoragePreserved: true,
      localStorageByteExactImmediatelyAfterWorkerUpgrade: true,
      nonPracticeLocalStorageByteExactAfterOfflineNavigation: true,
      practiceSchemaMigrationVerified: true,
      practiceSchemaMigration: practiceMigration,
      sessionStoragePreserved: true,
      indexedDbPreserved: true,
      beginnerPlacementColdOfflineAfterUpgrade: true,
      beginnerPlacementCriticalSafetyGateAfterUpgrade: true,
      trainingCampColdOfflineAfterUpgrade: true,
      placementRouteHandoffColdOfflineAfterUpgrade: true,
      placementRouteHandoffImmediateCleanup: true,
      placementFirstStepClickColdOfflineAfterUpgrade: true,
      placementFirstStepCoursesColdOfflineAfterUpgrade: true,
      placementFirstStepCoursePaths: PLACEMENT_FIRST_STEP_COURSES.map(item => item.path),
      aiTeacherColdOfflineAfterUpgrade: true,
      intakeColdOfflineAfterUpgrade: true,
      explainabilityColdOfflineAfterUpgrade: true,
      preservedKeys: DATA_KEYS,
      cachesBefore,
      cachesAfter,
      workerBuild: workerState.build,
      workerCacheRevision: workerState.cacheRevision
    }, null, 2));

    console.log(`CNC PWA upgrade data smoke passed: ${PREVIOUS_PWA_BUILD}/${PREVIOUS_CACHE_REVISION} -> ${CURRENT_PWA_BUILD}/${CURRENT_CACHE_REVISION}`);
  } catch (error) {
    if (page && context) await captureDiagnostics(page, context, stage, errors);
    fs.writeFileSync(path.join(out, 'pwa-upgrade-data-error.txt'), `stage=${stage}\n${error.stack || error}`);
    throw error;
  } finally {
    if (context) await context.close().catch(() => {});
    if (userDataDir) fs.rmSync(userDataDir, { recursive: true, force: true });
    await new Promise(resolve => server.close(resolve)).catch(() => {});
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
