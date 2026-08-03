const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'cnc/test-results');
fs.mkdirSync(out, { recursive: true });

const pageHtml = `<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>PWA browser capability probe</title>
<body><main>Service Worker capability probe</main></body>
</html>`;

const workerSource = `self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});`;

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  if (pathname === '/probe/sw.js') {
    res.writeHead(200, {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
      'Service-Worker-Allowed': '/probe/'
    });
    res.end(workerSource);
    return;
  }
  if (pathname === '/probe/' || pathname === '/probe/index.html') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(pageHtml);
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404');
});

function waitForController(page, timeoutMs) {
  return page.evaluate(ms => new Promise(resolve => {
    if (navigator.serviceWorker.controller) return resolve(true);
    const finish = value => {
      clearTimeout(timer);
      navigator.serviceWorker.removeEventListener('controllerchange', onChange);
      resolve(value);
    };
    const onChange = () => finish(Boolean(navigator.serviceWorker.controller));
    const timer = setTimeout(() => finish(Boolean(navigator.serviceWorker.controller)), ms);
    navigator.serviceWorker.addEventListener('controllerchange', onChange);
  }), timeoutMs);
}

(async () => {
  let browser;
  let context;
  const report = {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    chromiumExecutable: chromium.executablePath(),
    browserVersion: '',
    serviceWorkerEvents: [],
    pageState: null,
    registrationState: null,
    passed: false
  };

  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(4174, '127.0.0.1', resolve);
    });

    browser = await chromium.launch({ channel: 'chromium', headless: false });
    report.browserVersion = browser.version();
    context = await browser.newContext({ serviceWorkers: 'allow' });
    context.on('serviceworker', worker => {
      report.serviceWorkerEvents.push({ type: 'created', url: worker.url(), at: new Date().toISOString() });
      worker.on('close', () => report.serviceWorkerEvents.push({ type: 'closed', url: worker.url(), at: new Date().toISOString() }));
    });

    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4174/probe/', { waitUntil: 'domcontentloaded' });

    report.pageState = await page.evaluate(() => ({
      href: location.href,
      isSecureContext,
      serviceWorkerSupported: 'serviceWorker' in navigator
    }));

    if (!report.pageState.isSecureContext) throw new Error('localhost probe is not a secure context');
    if (!report.pageState.serviceWorkerSupported) throw new Error('navigator.serviceWorker is unavailable');

    report.registrationState = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.register('/probe/sw.js', {
        scope: '/probe/',
        updateViaCache: 'none'
      });
      const worker = registration.installing || registration.waiting || registration.active;
      if (worker && !['activated', 'redundant'].includes(worker.state)) {
        await new Promise(resolve => {
          const timer = setTimeout(resolve, 15000);
          worker.addEventListener('statechange', () => {
            if (['activated', 'redundant'].includes(worker.state)) {
              clearTimeout(timer);
              resolve();
            }
          });
        });
      }
      return {
        scope: registration.scope,
        installing: registration.installing?.state || '',
        waiting: registration.waiting?.state || '',
        active: registration.active?.state || '',
        workerState: worker?.state || ''
      };
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    const controlled = await waitForController(page, 15000);
    const finalState = await page.evaluate(async () => ({
      controller: navigator.serviceWorker.controller?.scriptURL || '',
      registrations: (await navigator.serviceWorker.getRegistrations()).map(item => ({
        scope: item.scope,
        active: item.active?.state || '',
        activeScript: item.active?.scriptURL || ''
      }))
    }));
    report.finalState = finalState;

    if (!controlled || finalState.controller !== 'http://127.0.0.1:4174/probe/sw.js') {
      throw new Error(`isolated Service Worker did not control the probe page: ${JSON.stringify(finalState)}`);
    }

    report.passed = true;
    fs.writeFileSync(path.join(out, 'pwa-browser-capability-probe.json'), JSON.stringify(report, null, 2));
    console.log('PWA browser capability probe passed');
  } catch (error) {
    report.error = error.stack || String(error);
    fs.writeFileSync(path.join(out, 'pwa-browser-capability-probe.json'), JSON.stringify(report, null, 2));
    throw error;
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    await new Promise(resolve => server.close(resolve)).catch(() => {});
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
