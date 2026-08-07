const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ensureControlled } = require('./pwa-controller-test-helper.cjs');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'cnc/test-results');
const PWA_BUILD = '20260807-pwa17';
const CACHE_REVISION = '20260807-learning17';
const BFCACHE_PROBE_KEY = 'cnc_pwa_bfcache_probe_v1';
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

(async () => {
  let context;
  let userDataDir;
  let cdp;
  const errors = [];
  const bfcacheNotUsedEvents = [];
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
      serviceWorkers: 'allow',
      args: [
        // Playwright headless=true使用Chromium headless shell；其delegate仅在显式开关存在时支持BFCache。
        '--enable-bfcache',
        // 本门禁验证CNC站内同站点返回；显式打开Chromium的same-site BFCache参数，避免测试环境因BrowsingInstance不交换而假失败。
        '--enable-features=BackForwardCache:enable_same_site/true'
      ],
      // Playwright默认添加--disable-back-forward-cache。移除该默认参数，门禁才真正测试Chromium BFCache。
      ignoreDefaultArgs: ['--disable-back-forward-cache']
    });
    let page = context.pages()[0] || await context.newPage();
    observePage(page, errors);
    cdp = await context.newCDPSession(page);
    await cdp.send('Page.enable');
    cdp.on('Page.backForwardCacheNotUsed', event => bfcacheNotUsedEvents.push(event));

    stage = 'home';
    await page.goto('http://127.0.0.1:4173/cnc/index.html', { waitUntil: 'domcontentloaded' });
    page = await ensureControlled(page, errors, observePage);
    if (page !== context.pages()[0]) {
      // ensureControlled在首次Service Worker接管时可能重建页面，重新绑定CDP诊断。
      await cdp.detach().catch(() => {});
      cdp = await context.newCDPSession(page);
      await cdp.send('Page.enable');
      cdp.on('Page.backForwardCacheNotUsed', event => bfcacheNotUsedEvents.push(event));
    }

    stage = 'profile-entry';
    await page.goto('http://127.0.0.1:4173/cnc/profile.html', { waitUntil: 'domcontentloaded' });
    const pwaLink = page.locator('a[href="./pwa-status.html"]');
    if (await pwaLink.count() !== 1) throw new Error('成长档案缺少PWA状态入口');
    await pwaLink.click();
    await page.waitForURL(/pwa-status\.html/);
    await page.waitForFunction(expected => document.querySelector('#build')?.textContent.includes(expected), PWA_BUILD);
    await page.waitForFunction(() => document.querySelector('#status')?.textContent.includes('版本一致'));

    const initialChecked = await page.locator('#checked-at').textContent();
    const cacheCount = Number(await page.locator('#cache-count').textContent());
    if (cacheCount < 2) throw new Error('CNC缓存数量不足');
    if (!(await page.locator('#static-cache').textContent()).includes(CACHE_REVISION)) throw new Error('静态缓存修订不一致');
    if (!(await page.locator('#runtime-cache').textContent()).includes(CACHE_REVISION)) throw new Error('运行时缓存修订不一致');

    stage = 'arm-real-bfcache-probe';
    await page.evaluate(key => {
      sessionStorage.removeItem(key);
      window.__cncBfcachePageShowPersisted = false;
      window.addEventListener('pageshow', event => {
        if (!event.persisted) return;
        window.__cncBfcachePageShowPersisted = true;
        sessionStorage.setItem(key, JSON.stringify({
          persisted: true,
          href: location.href,
          restoredAt: Date.now()
        }));
      }, { once: true });
    }, BFCACHE_PROBE_KEY);
    // checked-at只有秒级显示；确保真正BFCache返回时pageshow触发的inspect可被区分。
    await page.waitForTimeout(1100);

    stage = 'history-return-real-bfcache';
    await page.goto('http://127.0.0.1:4173/cnc/profile.html', { waitUntil: 'domcontentloaded' });
    // 页面中可能存在名为history的DOM全局，不能用page.evaluate(() => history.back())触发返回。
    // 由Playwright直接驱动浏览器历史，只等待commit；真实BFCache是否发生仍必须由pageshow.persisted与CDP共同证明。
    await page.goBack({ waitUntil: 'commit', timeout: 5000 });
    if (!/\/cnc\/pwa-status\.html(?:[?#]|$)/.test(page.url())) {
      throw new Error(`浏览器历史返回目标错误：${page.url()}`);
    }
    await page.waitForFunction(key => {
      try {
        const value = JSON.parse(sessionStorage.getItem(key) || 'null');
        return Boolean(value && value.persisted === true && value.href.includes('pwa-status.html') && window.__cncBfcachePageShowPersisted === true);
      } catch {
        return false;
      }
    }, BFCACHE_PROBE_KEY, { timeout: 5000 }).catch(() => {
      throw new Error(`Chromium未通过pageshow.persisted=true从BFCache恢复；CDP诊断=${JSON.stringify(bfcacheNotUsedEvents)}`);
    });
    const bfcacheProbe = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key) || 'null'), BFCACHE_PROBE_KEY);
    if (!bfcacheProbe?.persisted) throw new Error(`BFCache探针未记录真实恢复：${JSON.stringify(bfcacheProbe)}`);
    await page.waitForFunction(oldValue => document.querySelector('#checked-at')?.textContent !== oldValue, initialChecked, { timeout: 5000 });

    stage = 'cache-mismatch';
    await page.evaluate(async () => {
      for (const key of await caches.keys()) if (key.startsWith('cnc-runtime-')) await caches.delete(key);
    });
    await page.locator('#refresh').click();
    await page.waitForFunction(() => document.querySelector('#status')?.textContent.includes('尚未完全一致'));
    if ((await page.locator('#runtime-cache').textContent()) !== '未发现') throw new Error('缓存缺失状态未显示');

    stage = 'cache-recovery';
    await page.reload({ waitUntil: 'domcontentloaded' });
    page = await ensureControlled(page, errors, observePage);
    await page.waitForFunction(expected => caches.keys().then(keys => keys.includes(`cnc-runtime-${expected}`)), CACHE_REVISION);
    await page.locator('#refresh').click();
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
      cacheRevision: CACHE_REVISION,
      cacheCount: Number(await page.locator('#cache-count').textContent()),
      profileEntry: true,
      chromiumBfcacheEnabled: true,
      headlessDelegateBfcacheEnabled: true,
      sameSiteBfcacheEnabled: true,
      pageshowPersisted: true,
      bfcacheRestore: true,
      bfcacheProbe,
      bfcacheNotUsedEvents,
      mismatchDetected: true,
      touchTargets: true
    }, null, 2));
    console.log('CNC PWA profile real BFCache smoke passed');
  } catch (error) {
    fs.writeFileSync(path.join(out, 'pwa-profile-bfcache-error.txt'), `stage=${stage}\n${error.stack || error}\nCDP.backForwardCacheNotUsed=${JSON.stringify(bfcacheNotUsedEvents, null, 2)}`);
    throw error;
  } finally {
    if (cdp) await cdp.detach().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (userDataDir) fs.rmSync(userDataDir, { recursive: true, force: true });
    await new Promise(resolve => server.close(resolve)).catch(() => {});
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});