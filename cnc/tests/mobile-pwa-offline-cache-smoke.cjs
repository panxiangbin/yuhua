const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ensureControlled } = require('./pwa-controller-test-helper.cjs');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'cnc/test-results');
const PWA_BUILD = '20260804-pwa10';
const PLACEMENT_FIRST_STEP_COURSES = [
  {
    path: './course-safety-foundation.html',
    title: '第1关 安全基础',
    required: ['先学会停，再学会动', '原厂手册', '授权人员']
  },
  {
    path: './course-coordinate-axes.html',
    title: '第3关 坐标轴与运动方向',
    required: ['坐标轴与运动方向', '原厂手册', '现场条件']
  },
  {
    path: './course-g00-g01-basics.html',
    title: '第9关 G00与G01',
    required: ['G00与G01', '不能直接用于真实加工', '原厂手册']
  }
];
const CORE_OFFLINE_PATHS = [
  './beginner-placement.html',
  './training-camp.html',
  ...PLACEMENT_FIRST_STEP_COURSES.map(item => item.path),
  './ai-teacher.html',
  './ai-teacher-intake.html',
  './ai-teacher-explainability.html'
];
const PLACEMENT_HANDOFF_KEY = 'cnc_beginner_placement_route_handoff_v1';
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
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
}

async function captureDiagnostics(page, context, stage, errors) {
  const diagnostic = {
    stage,
    url: page ? page.url() : '',
    title: '',
    body: '',
    controller: null,
    registration: null,
    caches: [],
    staticEntries: [],
    offline: null,
    consoleErrors: errors
  };
  try { diagnostic.title = await page.title(); } catch {}
  try { diagnostic.body = (await page.locator('body').innerText()).slice(0, 4000); } catch {}
  try {
    diagnostic.controller = await page.evaluate(() => navigator.serviceWorker.controller ? {
      scriptURL: navigator.serviceWorker.controller.scriptURL,
      state: navigator.serviceWorker.controller.state
    } : null);
  } catch {}
  try {
    diagnostic.registration = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration('./');
      if (!reg) return null;
      return {
        scope: reg.scope,
        active: reg.active ? { scriptURL: reg.active.scriptURL, state: reg.active.state } : null,
        waiting: reg.waiting ? { scriptURL: reg.waiting.scriptURL, state: reg.waiting.state } : null,
        installing: reg.installing ? { scriptURL: reg.installing.scriptURL, state: reg.installing.state } : null
      };
    });
  } catch {}
  try {
    diagnostic.caches = await page.evaluate(() => caches.keys());
    diagnostic.staticEntries = await page.evaluate(async expected => {
      const cache = await caches.open(`cnc-static-${expected}`);
      return (await cache.keys()).map(request => request.url);
    }, PWA_BUILD);
  } catch {}
  try { diagnostic.offline = await context.isOffline(); } catch {}
  fs.writeFileSync(path.join(out, 'pwa-offline-diagnostic.json'), JSON.stringify(diagnostic, null, 2));
  try { await page.screenshot({ path: path.join(out, 'pwa-offline-failure.png'), fullPage: true }); } catch {}
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
  await page.goto(`http://127.0.0.1:4173/cnc/${course.path.slice(2)}`, { waitUntil: 'domcontentloaded' });
  const title = await page.title();
  if (!title.includes(course.title)) throw new Error(`${course.path}首次安装后离线打开失败：${title}`);
  const body = await page.locator('body').innerText();
  for (const token of course.required) {
    if (!body.includes(token)) throw new Error(`${course.path}离线页缺少可信或安全边界：${token}`);
  }
  const small = await page.locator('a,button').evaluateAll(elements => elements.filter(element => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && Math.min(rect.width, rect.height) < 44;
  }).map(element => {
    const rect = element.getBoundingClientRect();
    return { text: element.textContent.trim(), width: rect.width, height: rect.height };
  }));
  if (small.length) throw new Error(`${course.path}触控区不足44px：${JSON.stringify(small)}`);
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
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-pwa-offline-'));
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: true,
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'allow'
    });
    page = context.pages()[0] || await context.newPage();
    observePage(page, errors);

    stage = 'home';
    await page.goto('http://127.0.0.1:4173/cnc/index.html', { waitUntil: 'domcontentloaded' });
    stage = 'controller';
    page = await ensureControlled(page, errors, observePage);

    const registration = await page.evaluate(() => navigator.serviceWorker.getRegistration('./'));
    if (!registration) throw new Error('Service Worker未注册');
    const cachesBefore = await page.evaluate(() => caches.keys());
    if (!cachesBefore.includes(`cnc-static-${PWA_BUILD}`)) throw new Error(`静态缓存版本缺失: ${JSON.stringify(cachesBefore)}`);
    if (!cachesBefore.includes(`cnc-runtime-${PWA_BUILD}`)) throw new Error(`运行时缓存版本缺失: ${JSON.stringify(cachesBefore)}`);

    stage = 'core-precache';
    const missingCore = await page.evaluate(async ({ build, paths }) => {
      const cache = await caches.open(`cnc-static-${build}`);
      const missing = [];
      for (const item of paths) {
        if (!await cache.match(new URL(item, location.href))) missing.push(item);
      }
      return missing;
    }, { build: PWA_BUILD, paths: CORE_OFFLINE_PATHS });
    if (missingCore.length) throw new Error(`核心预缓存缺失: ${missingCore.join('、')}`);

    stage = 'cold-offline-beginner-placement';
    await context.setOffline(true);
    await page.goto('http://127.0.0.1:4173/cnc/beginner-placement.html', { waitUntil: 'domcontentloaded' });
    if (!(await page.title()).includes('CNC新手起点测评')) throw new Error('起点测评首次安装后离线打开失败');
    const placementBody = await page.locator('body').innerText();
    if (!placementBody.includes('测评只做推荐') || !placementBody.includes('关键安全项是硬门禁') || !placementBody.includes('相同版本原厂手册') || !placementBody.includes('授权人员确认')) {
      throw new Error('起点测评离线页丢失安全硬门禁、推荐或原厂手册边界');
    }
    if (await page.locator('#progress[role="progressbar"]').count() !== 1) throw new Error('起点测评离线页丢失进度条语义');
    if (await page.locator('#options[role="radiogroup"]').count() !== 1) throw new Error('起点测评离线页丢失单选组语义');
    if (await page.locator('#result-diagnostics').count() !== 1) throw new Error('起点测评离线页丢失可解释判断区域');

    stage = 'cold-offline-placement-route-handoff';
    await completeCriticalSafetyPlacement(page);
    await page.locator('#handoff-link').click();
    await page.waitForURL(/\/cnc\/training-camp\.html$/);
    await page.locator('#placement-handoff[data-state="consumed"]').waitFor({ state: 'visible' });
    const routeHandoff = await page.evaluate(key => ({
      title: document.querySelector('#placement-handoff-title')?.textContent || '',
      steps: [...document.querySelectorAll('#placement-handoff-steps li')].map(item => item.textContent),
      ctaHref: document.querySelector('#placement-handoff-cta')?.getAttribute('href') || '',
      sessionValue: sessionStorage.getItem(key),
      localValue: localStorage.getItem(key)
    }), PLACEMENT_HANDOFF_KEY);
    if (!routeHandoff.title.includes('安全基础') || routeHandoff.steps.length !== 3) throw new Error(`离线路线交接内容不完整: ${JSON.stringify(routeHandoff)}`);
    if (routeHandoff.ctaHref !== './course-safety-foundation.html') throw new Error(`离线路线第1步链接错误: ${JSON.stringify(routeHandoff)}`);
    if (routeHandoff.sessionValue !== null || routeHandoff.localValue !== null) throw new Error('离线路线交接未立即清除或泄露到长期存储');

    stage = 'cold-offline-placement-first-step-click';
    await page.locator('#placement-handoff-cta').click();
    await page.waitForURL(/\/cnc\/course-safety-foundation\.html$/);
    await verifyColdOfflineCourse(page, PLACEMENT_FIRST_STEP_COURSES[0]);

    stage = 'cold-offline-placement-first-step-courses';
    for (const course of PLACEMENT_FIRST_STEP_COURSES.slice(1)) {
      await verifyColdOfflineCourse(page, course);
    }

    stage = 'cold-offline-ai-teacher';
    await page.goto('http://127.0.0.1:4173/cnc/ai-teacher.html', { waitUntil: 'domcontentloaded' });
    if (!(await page.title()).includes('AI CNC老师')) throw new Error('AI CNC老师首次安装后离线打开失败');
    const teacherBody = await page.locator('body').innerText();
    if (!teacherBody.includes('不需要API Key') || !teacherBody.includes('不上传学习数据')) {
      throw new Error('AI CNC老师离线页丢失本地安全说明');
    }

    stage = 'cold-offline-intake';
    await page.goto('http://127.0.0.1:4173/cnc/ai-teacher-intake.html', { waitUntil: 'domcontentloaded' });
    if (!(await page.title()).includes('现场问诊单')) throw new Error('现场问诊单首次安装后离线打开失败');
    const intakeBody = await page.locator('body').innerText();
    if (!intakeBody.includes('不需要API Key') || !intakeBody.includes('不会替你修改参数')) {
      throw new Error('现场问诊单离线页丢失安全边界');
    }

    stage = 'cold-offline-explainability';
    await page.goto('http://127.0.0.1:4173/cnc/ai-teacher-explainability.html', { waitUntil: 'domcontentloaded' });
    if (!(await page.title()).includes('AI老师判断说明')) throw new Error('AI老师判断说明页首次安装后离线打开失败');
    const explainabilityBody = await page.locator('body').innerText();
    if (!explainabilityBody.includes('本页不提供固定上机值') || !explainabilityBody.includes('未逐条复核内容不可直接上机')) {
      throw new Error('判断说明离线页丢失固定值或可信度边界');
    }

    stage = 'status-page';
    await context.setOffline(false);
    await page.goto('http://127.0.0.1:4173/cnc/pwa-status.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#worker')?.textContent.includes('已启用'));
    await page.waitForFunction(expected => document.querySelector('#build')?.textContent.includes(expected), PWA_BUILD);
    const build = await page.locator('#build').textContent();
    const small = await page.locator('a,button').evaluateAll(elements => elements.filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && Math.min(rect.width, rect.height) < 44;
    }).map(element => {
      const rect = element.getBoundingClientRect();
      return { text: element.textContent.trim(), width: rect.width, height: rect.height };
    }));
    if (small.length) throw new Error(`触控区不足44px ${JSON.stringify(small)}`);

    stage = 'offline-fallback';
    await context.setOffline(true);
    await page.goto(`http://127.0.0.1:4173/cnc/not-cached-${Date.now()}.html`, { waitUntil: 'domcontentloaded' });
    if (!(await page.locator('body').innerText()).includes('网络暂时不可用')) throw new Error('离线回退页未生效');

    await page.screenshot({ path: path.join(out, 'pwa-offline-390x844.png'), fullPage: true });
    if (errors.length) throw new Error(`控制台错误 ${errors.join(' | ')}`);
    fs.writeFileSync(path.join(out, 'pwa-offline-result.json'), JSON.stringify({
      build,
      caches: cachesBefore,
      offlineFallback: true,
      beginnerPlacementColdOffline: true,
      beginnerPlacementCriticalSafetyGateColdOffline: true,
      trainingCampColdOffline: true,
      placementRouteHandoffColdOffline: true,
      placementRouteHandoffImmediateCleanup: true,
      placementFirstStepClickColdOffline: true,
      placementFirstStepCoursesColdOffline: true,
      placementFirstStepCoursePaths: PLACEMENT_FIRST_STEP_COURSES.map(item => item.path),
      aiTeacherColdOffline: true,
      intakeColdOffline: true,
      explainabilityColdOffline: true,
      coreOfflinePaths: CORE_OFFLINE_PATHS,
      touchTargets: true
    }, null, 2));
    console.log('CNC PWA offline cache smoke passed');
  } catch (error) {
    if (page && context) await captureDiagnostics(page, context, stage, errors);
    fs.writeFileSync(path.join(out, 'pwa-offline-error.txt'), `stage=${stage}\n${error.stack || error}`);
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
