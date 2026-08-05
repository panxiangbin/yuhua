const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { ensureControlled } = require('./pwa-controller-test-helper.cjs');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'cnc/test-results');
const CURRENT_PWA_BUILD = '20260804-pwa13';
const PREVIOUS_PWA_BUILD = '20260804-pwa12';
const CURRENT_CACHE_REVISION = '20260804-mobile13';
const PREVIOUS_CACHE_REVISION = '20260804-mobile12';
const CURRENT_STATIC_CACHE = `cnc-static-${CURRENT_CACHE_REVISION}`;
const CURRENT_RUNTIME_CACHE = `cnc-runtime-${CURRENT_CACHE_REVISION}`;
const PREVIOUS_STATIC_CACHE = `cnc-static-${PREVIOUS_CACHE_REVISION}`;
const PREVIOUS_RUNTIME_CACHE = `cnc-runtime-${PREVIOUS_CACHE_REVISION}`;
const UNRELATED_CACHE = 'other-app-cache-v1';
const PLACEMENT_HANDOFF_KEY = 'cnc_beginner_placement_route_handoff_v1';
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
          transaction.objectStore('records').put({ xp: 680, streak: 12, source: 'pwa12' }, 'growth');
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
    assert.deepStrictEqual(afterOfflineNavigation.local, before.local, '离线导航后LocalStorage发生变化');
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
      unrelatedCachePreserved: true,
      singleScopedRegistration: true,
      localStoragePreserved: true,
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
