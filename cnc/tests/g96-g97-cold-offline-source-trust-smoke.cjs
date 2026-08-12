const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ensureControlled } = require('./pwa-controller-test-helper.cjs');

const root = path.resolve(__dirname, '../..');
const outDir = path.join(root, 'cnc/test-results/g96-g97-cold-offline-source-trust');
const PWA_BUILD = '20260812-pwa40';
const CACHE_REVISION = '20260812-learning40';
let offlineProbeHits = 0;
let originServerStopped = false;
let coldOfflineConsoleWindow = false;
const expectedOfflineConsoleErrors = [];
const offline504Responses = [];
fs.mkdirSync(outDir, { recursive: true });

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4'
};

const EXPECTED_OFFLINE_CONSOLE_ERROR = /^Failed to load resource: the server responded with a status of 504 \(Offline\)$/;
const CRITICAL_OFFLINE_PATHS = new Set([
  '/cnc/index.html',
  '/cnc/search-aliases.js',
  '/cnc/gm-code-complete.js',
  '/cnc/sw.js'
]);

const server = http.createServer((req, res) => {
  let requestPath = decodeURIComponent(req.url.split('?')[0]);
  if (requestPath === '/cnc/__g96_g97_offline_probe__') {
    offlineProbeHits += 1;
    res.writeHead(204, { 'Cache-Control': 'no-store' });
    res.end();
    return;
  }
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

async function stopOriginServerForOfflineProof() {
  if (!server.listening) {
    originServerStopped = true;
    return;
  }
  await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
  });
  originServerStopped = true;
}

function observePage(page, errors) {
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (coldOfflineConsoleWindow && EXPECTED_OFFLINE_CONSOLE_ERROR.test(text)) {
      expectedOfflineConsoleErrors.push(text);
      return;
    }
    errors.push(text);
  });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (coldOfflineConsoleWindow && response.status() === 504) {
      offline504Responses.push({ url: response.url(), status: response.status() });
    }
  });
}

async function writeDiagnostics(page, stage, errors, extra = {}) {
  const diagnostic = {
    stage,
    url: page ? page.url() : '',
    title: '',
    controller: null,
    caches: [],
    consoleErrors: errors,
    expectedOfflineConsoleErrors,
    offline504Responses,
    ...extra
  };
  try { diagnostic.title = await page.title(); } catch {}
  try {
    diagnostic.controller = await page.evaluate(() => navigator.serviceWorker.controller ? {
      scriptURL: navigator.serviceWorker.controller.scriptURL,
      state: navigator.serviceWorker.controller.state
    } : null);
  } catch {}
  try { diagnostic.caches = await page.evaluate(() => caches.keys()); } catch {}
  fs.writeFileSync(path.join(outDir, 'diagnostic.json'), JSON.stringify(diagnostic, null, 2));
  try { await page.screenshot({ path: path.join(outDir, 'diagnostic.png'), fullPage: true }); } catch {}
}

(async () => {
  let context;
  let page;
  let userDataDir;
  let stage = 'server-start';
  const errors = [];
  let sourceEvidence = null;
  let runtimeEvidence = null;
  let offlineNetworkBlocked = false;
  let probeEvidence = null;
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(4173, '127.0.0.1', resolve);
    });

    stage = 'browser-launch';
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-g96-g97-offline-'));
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
      throw new Error(`PWA38静态缓存缺失：${JSON.stringify(cachesBefore)}`);
    }

    stage = 'verify-g96-g97-core-cache';
    const cacheEvidence = await page.evaluate(async revision => {
      const cache = await caches.open(`cnc-static-${revision}`);
      const result = {};
      for (const item of ['./search-aliases.js', './gm-code-complete.js']) {
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
      if (!evidence?.present || evidence.bytes <= 0) throw new Error(`G96/G97冷离线核心缺少：${item}`);
    }

    stage = 'prove-online-network-probe';
    const onlineHitsBefore = offlineProbeHits;
    await page.evaluate(async () => {
      const response = await fetch(`./__g96_g97_offline_probe__?phase=online&nonce=${Date.now()}`, { cache: 'no-store' });
      if (response.status !== 204) throw new Error(`在线网络探针状态异常：${response.status}`);
    });
    if (offlineProbeHits !== onlineHitsBefore + 1) {
      throw new Error(`在线网络探针未实际到达HTTP服务器：before=${onlineHitsBefore}, after=${offlineProbeHits}`);
    }
    if (errors.length) throw new Error(`联网安装阶段浏览器控制台出现错误：${errors.join(' | ')}`);

    stage = 'cold-offline-network-proof';
    coldOfflineConsoleWindow = true;
    await context.setOffline(true);
    await stopOriginServerForOfflineProof();
    if (!originServerStopped || server.listening) throw new Error('冷离线验证前未真正关闭HTTP源站');

    const offlineHitsBefore = offlineProbeHits;
    const offlineProbeResult = await page.evaluate(async () => {
      try {
        const response = await fetch(`./__g96_g97_offline_probe__?phase=offline&nonce=${Date.now()}`, { cache: 'no-store' });
        return { resolved: true, status: response.status, type: response.type };
      } catch (error) {
        return { resolved: false, error: String(error && error.message ? error.message : error) };
      }
    });
    await new Promise(resolve => setTimeout(resolve, 100));
    const offlineHitsAfter = offlineProbeHits;
    if (offlineHitsAfter !== offlineHitsBefore) {
      throw new Error(`关闭源站后离线网络探针仍到达HTTP服务器：before=${offlineHitsBefore}, after=${offlineHitsAfter}`);
    }
    if (offlineProbeResult.resolved && offlineProbeResult.status === 204) {
      throw new Error('关闭源站后离线网络探针仍返回在线204响应');
    }
    offlineNetworkBlocked = true;
    probeEvidence = { onlineHitsBefore, offlineHitsBefore, offlineHitsAfter, offlineProbeResult, originServerStopped };

    stage = 'cold-offline-g96-g97-source';
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
    if (!sourceEvidence.aliasesOk || !sourceEvidence.gmOk) throw new Error('G96/G97安全源首次安装后冷离线读取失败');

    for (const token of [
      '部分明确支持该车床语义',
      '当前CNC',
      '机床厂原厂手册',
      '单位制',
      'S',
      '最高允许主轴转速',
      '卡盘',
      '装夹',
      '工件',
      '刀具'
    ]) {
      if (!sourceEvidence.gmText.includes(token)) throw new Error(`G96/G97冷离线基础源缺少安全边界：${token}`);
    }
    for (const forbidden of [
      'G50 S2000；G96 S180',
      'G97 S800 M03',
      '用G96前先用G50限制最高转速',
      'G97后S就是转/分'
    ]) {
      if (sourceEvidence.gmText.includes(forbidden)) throw new Error(`G96/G97冷离线基础源仍含可直接照抄或跨系统口诀：${forbidden}`);
    }
    for (const token of [
      'g10-g28-g50-g51-g53-g92-g93-g94-g95-g96-g97-g98-g99-boundary-11',
      'normalizeG96',
      'normalizeG97'
    ]) {
      if (!sourceEvidence.aliasesText.includes(token)) throw new Error(`G96/G97冷离线归一化源缺少：${token}`);
    }

    stage = 'cold-offline-g96-g97-reload';
    if (!offlineNetworkBlocked || !originServerStopped) throw new Error('真实冷离线网络阻断证据缺失');
    await page.goto('http://127.0.0.1:4173/cnc/index.html', { waitUntil: 'domcontentloaded' });
    if (!(await page.title()).includes('CNC')) throw new Error('PWA38冷离线重载首页失败');

    runtimeEvidence = await page.evaluate(() => {
      const guard = window.CNC_GM_CONTENT_SAFETY;
      return {
        guardVersion: guard?.version || '',
        normalizeG96: typeof guard?.normalizeG96,
        normalizeG97: typeof guard?.normalizeG97,
        entries: ['G96', 'G97'].map(code => {
          const entry = (window.CNC_GM_CODES || []).find(item => item.code === code);
          return entry ? {
            code,
            risk: entry.risk,
            tags: entry.tags || [],
            text: [entry.title, entry.summary, entry.usage, entry.beginner, entry.warning, entry.example, ...(entry.tags || [])].join(' ')
          } : null;
        })
      };
    });
    if (runtimeEvidence.guardVersion !== 'g10-g28-g50-g51-g53-g92-g93-g94-g95-g96-g97-g98-g99-boundary-11') {
      throw new Error(`冷离线运行时安全守卫版本错误：${runtimeEvidence.guardVersion}`);
    }
    if (runtimeEvidence.normalizeG96 !== 'function' || runtimeEvidence.normalizeG97 !== 'function') {
      throw new Error('冷离线运行时缺少normalizeG96/normalizeG97');
    }
    for (const entry of runtimeEvidence.entries) {
      if (!entry) throw new Error('冷离线运行时缺少G96或G97条目');
      if (entry.risk !== '高') throw new Error(`${entry.code}冷离线风险等级必须为高`);
      for (const token of ['当前CNC', '原厂手册', '单位制', 'S', '最高允许主轴转速', '卡盘', '工件', '刀具']) {
        if (!entry.text.includes(token)) throw new Error(`${entry.code}冷离线运行时缺少安全上下文：${token}`);
      }
      for (const forbidden of ['G50 S2000；G96 S180', 'G97 S800 M03', '用G96前先用G50限制最高转速', 'G97后S就是转/分']) {
        if (entry.text.includes(forbidden)) throw new Error(`${entry.code}冷离线运行时仍含可直接照抄或跨系统口诀：${forbidden}`);
      }
    }

    const criticalOffline504 = offline504Responses.filter(item => {
      try { return CRITICAL_OFFLINE_PATHS.has(new URL(item.url).pathname); } catch { return true; }
    });
    if (criticalOffline504.length) throw new Error(`冷离线关键资源返回504：${criticalOffline504.map(item => item.url).join(' | ')}`);
    if (errors.length) throw new Error(`浏览器出现非预期错误：${errors.join(' | ')}`);

    const result = {
      testedAt: new Date().toISOString(),
      pwaBuild: PWA_BUILD,
      cacheRevision: CACHE_REVISION,
      viewport: { width: 390, height: 844 },
      offlineNetworkBlocked,
      originServerStopped,
      probeEvidence,
      g96G97ColdOfflineSourceTrust: true,
      g96G97ColdOfflineRuntimeTrust: true,
      g96G97ColdOfflineReload: true,
      cacheEvidence,
      runtimeEvidence,
      expectedOfflineConsoleErrorCount: expectedOfflineConsoleErrors.length,
      expectedOfflineConsoleErrors,
      offline504Responses,
      criticalOffline504,
      consoleErrors: errors
    };
    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(result, null, 2));
    await page.screenshot({ path: path.join(outDir, 'g96-g97-cold-offline-source-trust.png'), fullPage: true });
    console.log('CNC G96/G97真实冷离线源可信度门禁通过：PWA38首次安装后，关闭本地HTTP源站并进入离线模式，G96/G97安全归一化源与G/M基础目录仍可从静态缓存读取；冷离线重载继续保留当前CNC、原厂手册、单位制、S含义、最高允许主轴转速及卡盘/装夹/工件/刀具限制，固定教学数值不得直接照抄上机。');
  } catch (error) {
    errors.push(error.message);
    if (context && page) await writeDiagnostics(page, stage, errors, { sourceEvidence, runtimeEvidence, offlineNetworkBlocked, probeEvidence, offlineProbeHits, originServerStopped });
    console.error(error.stack || error.message || String(error));
    process.exitCode = 1;
  } finally {
    try { if (context) await context.close(); } catch {}
    try { if (server.listening) await stopOriginServerForOfflineProof(); } catch {}
    if (userDataDir) fs.rmSync(userDataDir, { recursive: true, force: true });
  }
})();