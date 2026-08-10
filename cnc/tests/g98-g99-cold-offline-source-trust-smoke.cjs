const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ensureControlled } = require('./pwa-controller-test-helper.cjs');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'cnc/test-results');
const PWA_BUILD = '20260810-pwa33';
const CACHE_REVISION = '20260810-learning33';
fs.mkdirSync(out, { recursive: true });

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4'
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

async function writeDiagnostics(page, context, stage, errors, extra = {}) {
  const diagnostic = {
    stage,
    url: page ? page.url() : '',
    title: '',
    offline: null,
    controller: null,
    caches: [],
    consoleErrors: errors,
    ...extra
  };
  try { diagnostic.title = await page.title(); } catch {}
  try { diagnostic.offline = await context.isOffline(); } catch {}
  try {
    diagnostic.controller = await page.evaluate(() => navigator.serviceWorker.controller ? {
      scriptURL: navigator.serviceWorker.controller.scriptURL,
      state: navigator.serviceWorker.controller.state
    } : null);
  } catch {}
  try { diagnostic.caches = await page.evaluate(() => caches.keys()); } catch {}
  fs.writeFileSync(path.join(out, 'g98-g99-cold-offline-source-trust-diagnostic.json'), JSON.stringify(diagnostic, null, 2));
  try { await page.screenshot({ path: path.join(out, 'g98-g99-cold-offline-source-trust.png'), fullPage: true }); } catch {}
}

(async () => {
  let context;
  let page;
  let userDataDir;
  let stage = 'server-start';
  const errors = [];
  let sourceEvidence = null;
  let runtimeEvidence = null;
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(4173, '127.0.0.1', resolve);
    });

    stage = 'browser-launch';
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-g98-g99-offline-'));
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: true,
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'allow'
    });
    page = context.pages()[0] || await context.newPage();
    observePage(page, errors);

    stage = 'online-install';
    await page.goto('http://127.0.0.1:4173/cnc/index.html', { waitUntil: 'domcontentloaded' });
    page = await ensureControlled(page, errors, observePage);

    const cachesBefore = await page.evaluate(() => caches.keys());
    if (!cachesBefore.includes(`cnc-static-${CACHE_REVISION}`)) {
      throw new Error(`PWA33静态缓存缺失：${JSON.stringify(cachesBefore)}`);
    }

    stage = 'verify-g98-g99-core-cache';
    const cacheEvidence = await page.evaluate(async revision => {
      const cache = await caches.open(`cnc-static-${revision}`);
      const paths = ['./search-aliases.js', './gm-code-complete.js'];
      const result = {};
      for (const item of paths) {
        const response = await cache.match(new URL(item, location.href));
        result[item] = response ? {
          present: true,
          bytes: (await response.clone().arrayBuffer()).byteLength,
          contentType: response.headers.get('content-type') || ''
        } : { present: false, bytes: 0, contentType: '' };
      }
      return result;
    }, CACHE_REVISION);
    for (const item of ['./search-aliases.js', './gm-code-complete.js']) {
      const evidence = cacheEvidence[item];
      if (!evidence?.present || evidence.bytes <= 0) throw new Error(`G98/G99冷离线核心缺少：${item}`);
    }

    stage = 'cold-offline-g98-g99-source';
    await context.setOffline(true);
    sourceEvidence = await page.evaluate(async () => {
      const [aliasResponse, gmResponse] = await Promise.all([
        fetch('./search-aliases.js'),
        fetch('./gm-code-complete.js')
      ]);
      return {
        aliasesOk: aliasResponse.ok,
        gmOk: gmResponse.ok,
        aliasesText: await aliasResponse.text(),
        gmText: await gmResponse.text()
      };
    });
    if (!sourceEvidence.aliasesOk || !sourceEvidence.gmOk) {
      throw new Error('G98/G99安全源首次安装后冷离线读取失败');
    }

    for (const token of [
      'G98不是跨机型同一含义',
      'G99不是跨机型同一含义',
      '初始Z平面',
      'R平面',
      '每分钟进给',
      '每转进给',
      '原厂手册',
      '完整计划运动空间'
    ]) {
      if (!sourceEvidence.gmText.includes(token)) throw new Error(`G98/G99冷离线源缺少安全边界：${token}`);
    }
    for (const forbidden of [
      'G98比G99退得更高',
      'G99效率高，但要求R平面绝对安全',
      'G99效率高',
      'R平面绝对安全'
    ]) {
      if (sourceEvidence.gmText.includes(forbidden)) throw new Error(`G98/G99冷离线源仍含误导性通用口诀：${forbidden}`);
    }
    for (const token of [
      'g10-g28-g53-g92-g94-g98-g99-boundary-6',
      'normalizeG98',
      'normalizeG99'
    ]) {
      if (!sourceEvidence.aliasesText.includes(token)) throw new Error(`G98/G99冷离线归一化源缺少：${token}`);
    }

    stage = 'cold-offline-g98-g99-reload';
    await page.goto('http://127.0.0.1:4173/cnc/index.html', { waitUntil: 'domcontentloaded' });
    if (!(await context.isOffline())) throw new Error('浏览器未保持离线状态');
    if (!(await page.title()).includes('CNC')) throw new Error('PWA33冷离线重载首页失败');

    runtimeEvidence = await page.evaluate(() => {
      const guard = window.CNC_GM_CONTENT_SAFETY;
      return {
        guardVersion: guard?.version || '',
        normalizeG98: typeof guard?.normalizeG98,
        normalizeG99: typeof guard?.normalizeG99,
        entries: ['G98', 'G99'].map(code => {
          const entry = (window.CNC_GM_CODES || []).find(item => item.code === code);
          return entry ? {
            code,
            risk: entry.risk,
            tags: entry.tags || [],
            summary: entry.summary || '',
            warning: entry.warning || ''
          } : null;
        })
      };
    });
    if (runtimeEvidence.guardVersion !== 'g10-g28-g53-g92-g94-g98-g99-boundary-6') {
      throw new Error(`冷离线运行时安全守卫版本错误：${runtimeEvidence.guardVersion}`);
    }
    if (runtimeEvidence.normalizeG98 !== 'function' || runtimeEvidence.normalizeG99 !== 'function') {
      throw new Error('冷离线运行时缺少normalizeG98/normalizeG99');
    }
    for (const entry of runtimeEvidence.entries) {
      if (!entry) throw new Error('冷离线运行时缺少G98或G99条目');
      if (entry.risk !== '高') throw new Error(`${entry.code}冷离线风险等级必须为高`);
      for (const tag of ['车铣差异', '原厂手册']) {
        if (!entry.tags.includes(tag)) throw new Error(`${entry.code}冷离线运行时缺少标签：${tag}`);
      }
      if (!entry.summary.includes('不是跨机型同一含义')) throw new Error(`${entry.code}冷离线摘要未区分车铣语义`);
      if (!entry.warning.includes('原厂手册')) throw new Error(`${entry.code}冷离线警告未要求核对原厂手册`);
    }
    if (errors.length) throw new Error(`浏览器控制台出现错误：${errors.join(' | ')}`);

    const result = {
      pwaBuild: PWA_BUILD,
      cacheRevision: CACHE_REVISION,
      viewport: { width: 390, height: 844 },
      g98G99ColdOfflineSourceTrust: true,
      g98G99ColdOfflineRuntimeTrust: true,
      g98G99ColdOfflineReload: true,
      cacheEvidence,
      runtimeEvidence,
      consoleErrors: errors
    };
    fs.writeFileSync(path.join(out, 'g98-g99-cold-offline-source-trust-result.json'), JSON.stringify(result, null, 2));
    await page.screenshot({ path: path.join(out, 'g98-g99-cold-offline-source-trust.png'), fullPage: true });
    console.log('CNC G98/G99冷离线源可信度门禁通过：PWA33首次安装后，安全归一化源与G/M基础目录可从静态缓存冷离线读取；离线重载后G98/G99仍保持车铣双语义边界、高风险标记和原厂手册核对要求。');
  } catch (error) {
    errors.push(error.message);
    if (context && page) await writeDiagnostics(page, context, stage, errors, { sourceEvidence, runtimeEvidence });
    console.error(error.stack || error.message);
    process.exitCode = 1;
  } finally {
    if (context) await context.close().catch(() => {});
    if (userDataDir) fs.rmSync(userDataDir, { recursive: true, force: true });
    server.close();
  }
})();
