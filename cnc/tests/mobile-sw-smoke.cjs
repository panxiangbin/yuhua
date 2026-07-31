const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

const OUT = path.resolve(__dirname, '../test-artifacts/industrial-card-sample');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'allow'
    });
    const page = await context.newPage();
    const errors = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(error.message));

    await page.goto('http://127.0.0.1:4173/cnc/?smoke=sw', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForFunction(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const registrations = await navigator.serviceWorker.getRegistrations();
      const expectedScope = new URL('/cnc/', location.origin).href;
      const registration = registrations.find(item => item.scope === expectedScope);
      return registration?.active?.state === 'activated';
    }, { timeout: 30000 });

    if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(() => navigator.serviceWorker?.controller?.scriptURL.endsWith('/cnc/sw.js'), { timeout: 30000 });
    }

    const snapshot = await page.evaluate(async () => {
      const expectedScope = new URL('/cnc/', location.origin).href;
      const expectedScript = new URL('/cnc/sw.js', location.origin).href;
      const registrations = await navigator.serviceWorker.getRegistrations();
      const buildInfo = await fetch('./build-info.json', { cache: 'no-store' }).then(response => response.json());
      const workerBuild = await new Promise((resolve, reject) => {
        const controller = navigator.serviceWorker.controller;
        if (!controller) return reject(new Error('Service Worker controller missing'));
        const channel = new MessageChannel();
        const timer = setTimeout(() => reject(new Error('GET_BUILD timeout')), 10000);
        channel.port1.onmessage = event => {
          clearTimeout(timer);
          resolve(event.data?.build || '');
        };
        controller.postMessage({ type: 'GET_BUILD' }, [channel.port2]);
      });
      return {
        expectedScope,
        expectedScript,
        registrations: registrations.map(item => ({
          scope: item.scope,
          active: item.active?.state || '',
          activeScript: item.active?.scriptURL || '',
          waiting: item.waiting?.state || '',
          installing: item.installing?.state || ''
        })),
        controller: navigator.serviceWorker.controller?.scriptURL || '',
        workerBuild,
        pwaBuild: buildInfo.pwaBuild || '',
        caches: await caches.keys()
      };
    });

    assert.equal(snapshot.registrations.length, 1, `应只有一个CNC Service Worker注册：${JSON.stringify(snapshot.registrations)}`);
    assert.equal(snapshot.registrations[0].scope, snapshot.expectedScope, 'Service Worker作用域必须限定在/cnc/');
    assert.equal(snapshot.registrations[0].active, 'activated', 'Service Worker必须完成激活');
    assert.equal(snapshot.registrations[0].activeScript, snapshot.expectedScript, 'Service Worker脚本必须为/cnc/sw.js');
    assert.equal(snapshot.registrations[0].waiting, '', '不应残留等待中的旧Worker');
    assert.equal(snapshot.registrations[0].installing, '', '不应残留安装中的Worker');
    assert.equal(snapshot.controller, snapshot.expectedScript, '当前手机页面必须被/cnc/sw.js接管');
    assert.equal(snapshot.workerBuild, snapshot.pwaBuild, `Worker与build-info版本必须一致：${snapshot.workerBuild}/${snapshot.pwaBuild}`);
    assert.ok(snapshot.caches.includes(`cnc-static-${snapshot.pwaBuild}`), '缺少当前版本静态缓存');
    assert.ok(snapshot.caches.includes(`cnc-runtime-${snapshot.pwaBuild}`), '缺少当前版本运行时缓存');

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    const afterReload = await page.evaluate(async () => ({
      registrations: (await navigator.serviceWorker.getRegistrations()).map(item => item.scope),
      controller: navigator.serviceWorker.controller?.scriptURL || ''
    }));
    assert.deepEqual(afterReload.registrations, [snapshot.expectedScope], '刷新后不得重复注册Service Worker');
    assert.equal(afterReload.controller, snapshot.expectedScript, '刷新后页面仍应由当前Worker接管');
    assert.equal(errors.length, 0, errors.join(' | '));

    const result = { passed: true, snapshot, afterReload, errors };
    fs.writeFileSync(path.join(OUT, 'service-worker-status.json'), JSON.stringify(result, null, 2));
    console.log('Service Worker注册、接管、缓存与构建一致性通过', result);
  } finally {
    await browser.close();
  }
})().catch(error => {
  fs.writeFileSync(path.join(OUT, 'service-worker-error.txt'), `${error.stack || error}\n`);
  console.error(error);
  process.exit(1);
});
