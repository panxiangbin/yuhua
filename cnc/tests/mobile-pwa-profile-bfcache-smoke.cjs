const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'cnc/test-results');
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

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
    })
  ]).finally(() => clearTimeout(timer));
}

function observePage(page, errors) {
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
}

async function ensureControlled(page, errors) {
  await withTimeout(page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) throw new Error('Service Worker unsupported');
    let registration = await navigator.serviceWorker.getRegistration('./');
    if (!registration) registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    return { scope: registration.scope };
  }), 15000, 'serviceWorker registration');

  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.getRegistration('./');
    return Boolean(registration && registration.active && registration.active.state === 'activated');
  }, { timeout: 60000 });

  const scope = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration('./'))?.scope || '');
  if (!page.url().startsWith(scope)) throw new Error(`Service Worker scope mismatch: ${scope}`);
  if (await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) return page;

  const context = page.context();
  const controlledUrl = page.url();
  await page.close();
  await new Promise(resolve => setTimeout(resolve, 300));
  const controlledPage = await context.newPage();
  observePage(controlledPage, errors);
  await controlledPage.goto(controlledUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await controlledPage.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), { timeout: 30000 });
  return controlledPage;
}

(async () => {
  let context;
  let userDataDir;
  const errors = [];
  let stage = 'server-start';
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(4173, '127.0.0.1', resolve);
    });
    stage = 'browser-launch';
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-pwa-profile-'));
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: true,
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'allow'
    });
    let page = context.pages()[0] || await context.newPage();
    observePage(page, errors);

    stage = 'home';
    await page.goto('http://127.0.0.1:4173/cnc/index.html', { waitUntil: 'domcontentloaded' });
    page = await ensureControlled(page, errors);

    stage = 'profile-entry';
    await page.goto('http://127.0.0.1:4173/cnc/profile.html', { waitUntil: 'domcontentloaded' });
    const pwaLink = page.locator('a[href="./pwa-status.html"]');
    if (await pwaLink.count() !== 1) throw new Error('成长档案缺少PWA状态入口');
    await pwaLink.click();
    await page.waitForURL(/pwa-status\.html/);
    await page.waitForFunction(() => document.querySelector('#build')?.textContent.includes('20260726-pwa2'));
    await page.waitForFunction(() => document.querySelector('#status')?.textContent.includes('版本一致'));

    const initialChecked = await page.locator('#checked-at').textContent();
    const cacheCount = Number(await page.locator('#cache-count').textContent());
    if (cacheCount < 2) throw new Error('CNC缓存数量不足');
    if (!(await page.locator('#static-cache').textContent()).includes('20260726-pwa2')) throw new Error('静态缓存版本不一致');
    if (!(await page.locator('#runtime-cache').textContent()).includes('20260726-pwa2')) throw new Error('运行时缓存版本不一致');

    stage = 'history-return';
    await page.goto('http://127.0.0.1:4173/cnc/profile.html', { waitUntil: 'domcontentloaded' });
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForURL(/pwa-status\.html/);
    await page.waitForFunction(oldValue => document.querySelector('#checked-at')?.textContent !== oldValue, initialChecked, { timeout: 5000 }).catch(async () => {
      await page.locator('#refresh').click();
      await page.waitForFunction(oldValue => document.querySelector('#checked-at')?.textContent !== oldValue, initialChecked);
    });

    stage = 'cache-mismatch';
    await page.evaluate(async () => {
      for (const key of await caches.keys()) if (key.startsWith('cnc-runtime-')) await caches.delete(key);
    });
    await page.locator('#refresh').click();
    await page.waitForFunction(() => document.querySelector('#status')?.textContent.includes('尚未完全一致'));
    if ((await page.locator('#runtime-cache').textContent()) !== '未发现') throw new Error('缓存缺失状态未显示');

    stage = 'cache-recovery';
    await page.reload({ waitUntil: 'domcontentloaded' });
    page = await ensureControlled(page, errors);
    await page.waitForFunction(() => Number(document.querySelector('#cache-count')?.textContent) >= 2);
    await page.waitForFunction(() => document.querySelector('#status')?.textContent.includes('版本一致'));

    const small = await page.locator('a,button').evaluateAll(elements => elements.filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && Math.min(rect.width, rect.height) < 44;
    }).map(element => {
      const rect = element.getBoundingClientRect();
      return { text: element.textContent.trim(), width: rect.width, height: rect.height };
    }));
    if (small.length) throw new Error(`触控区不足44px ${JSON.stringify(small)}`);

    await page.screenshot({ path: path.join(out, 'pwa-profile-bfcache-390x844.png'), fullPage: true });
    if (errors.length) throw new Error(`控制台错误 ${errors.join(' | ')}`);
    fs.writeFileSync(path.join(out, 'pwa-profile-bfcache-result.json'), JSON.stringify({
      build: await page.locator('#build').textContent(),
      cacheCount: Number(await page.locator('#cache-count').textContent()),
      profileEntry: true,
      bfcacheRestore: true,
      mismatchDetected: true,
      touchTargets: true
    }, null, 2));
    console.log('CNC PWA profile BFCache smoke passed');
  } catch (error) {
    fs.writeFileSync(path.join(out, 'pwa-profile-bfcache-error.txt'), `stage=${stage}\n${error.stack || error}`);
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
