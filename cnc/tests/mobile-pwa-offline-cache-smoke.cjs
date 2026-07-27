const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
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

  const controlledPage = await page.context().newPage();
  observePage(controlledPage, errors);
  await controlledPage.goto(page.url(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await controlledPage.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), { timeout: 30000 });
  await page.close();
  return controlledPage;
}

(async () => {
  let browser;
  const errors = [];
  let stage = 'server-start';
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(4173, '127.0.0.1', resolve);
    });
    stage = 'browser-launch';
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
    let page = await context.newPage();
    observePage(page, errors);

    stage = 'home';
    await page.goto('http://127.0.0.1:4173/cnc/index.html', { waitUntil: 'domcontentloaded' });
    stage = 'controller';
    page = await ensureControlled(page, errors);

    const registration = await page.evaluate(() => navigator.serviceWorker.getRegistration('./'));
    if (!registration) throw new Error('Service Worker未注册');
    const cachesBefore = await page.evaluate(() => caches.keys());
    if (!cachesBefore.includes('cnc-static-20260726-pwa2')) throw new Error('静态缓存版本缺失');
    if (!cachesBefore.includes('cnc-runtime-20260726-pwa2')) throw new Error('运行时缓存版本缺失');

    stage = 'status-page';
    await page.goto('http://127.0.0.1:4173/cnc/pwa-status.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#worker')?.textContent.includes('已启用'));
    await page.waitForFunction(() => document.querySelector('#build')?.textContent.includes('20260726-pwa2'));
    const build = await page.locator('#build').textContent();
    const small = await page.locator('a,button').evaluateAll(elements => elements.filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && Math.min(rect.width, rect.height) < 44;
    }).map(element => {
      const rect = element.getBoundingClientRect();
      return { text: element.textContent.trim(), width: rect.width, height: rect.height };
    }));
    if (small.length) throw new Error(`触控区不足44px ${JSON.stringify(small)}`);

    stage = 'warm-runtime-route';
    await page.goto('http://127.0.0.1:4173/cnc/training-camp.html', { waitUntil: 'domcontentloaded' });
    if (!(await page.title()).includes('训练')) throw new Error('训练营在线预热失败');
    await page.goto('http://127.0.0.1:4173/cnc/pwa-status.html', { waitUntil: 'domcontentloaded' });

    stage = 'cached-offline-route';
    await context.setOffline(true);
    await page.goto('http://127.0.0.1:4173/cnc/training-camp.html', { waitUntil: 'domcontentloaded' });
    if (!(await page.title()).includes('训练')) throw new Error('离线训练营未打开');

    stage = 'offline-fallback';
    await page.goto(`http://127.0.0.1:4173/cnc/not-cached-${Date.now()}.html`, { waitUntil: 'domcontentloaded' });
    if (!(await page.locator('body').innerText()).includes('网络暂时不可用')) throw new Error('离线回退页未生效');

    await page.screenshot({ path: path.join(out, 'pwa-offline-390x844.png'), fullPage: true });
    if (errors.length) throw new Error(`控制台错误 ${errors.join(' | ')}`);
    fs.writeFileSync(path.join(out, 'pwa-offline-result.json'), JSON.stringify({ build, caches: cachesBefore, offlineFallback: true, runtimeWarmup: true, touchTargets: true }, null, 2));
    console.log('CNC PWA offline cache smoke passed');
  } catch (error) {
    fs.writeFileSync(path.join(out, 'pwa-offline-error.txt'), `stage=${stage}\n${error.stack || error}`);
    throw error;
  } finally {
    if (browser) await browser.close().catch(() => {});
    await new Promise(resolve => server.close(resolve)).catch(() => {});
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
