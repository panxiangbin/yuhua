from pathlib import Path
import subprocess

ROOT = Path('.')
PWA_CURRENT = '20260810-pwa35'
CACHE_CURRENT = '20260810-learning35'
PWA_PREVIOUS = '20260810-pwa34'
CACHE_PREVIOUS = '20260810-learning34'
OLD_GUARD = 'g10-g28-g53-g92-g94-g96-g97-g98-g99-boundary-7'
NEW_GUARD = 'g10-g28-g53-g92-g94-g95-g96-g97-g98-g99-boundary-8'


def shift_workflow_versions(text: str) -> str:
    # Preserve the old current build as the new previous build while promoting PWA35/learning35.
    text = text.replace('20260810-pwa33', '__CNC_PREVIOUS_PWA__')
    text = text.replace('20260810-learning33', '__CNC_PREVIOUS_CACHE__')
    text = text.replace('20260810-pwa34', PWA_CURRENT)
    text = text.replace('20260810-learning34', CACHE_CURRENT)
    text = text.replace('__CNC_PREVIOUS_PWA__', PWA_PREVIOUS)
    text = text.replace('__CNC_PREVIOUS_CACHE__', CACHE_PREVIOUS)
    return text.replace(OLD_GUARD, NEW_GUARD)


# 1) Move every CNC-only workflow contract from PWA34->35 and previous PWA33->34.
for path in Path('.github/workflows').glob('cnc-*.yml'):
    text = path.read_text(encoding='utf-8')
    shifted = shift_workflow_versions(text)
    if shifted != text:
        path.write_text(shifted, encoding='utf-8')
        print('shifted workflow contract:', path)

# 2) Every CNC test that asserts the shared G/M content guard must follow boundary-8.
for path in Path('cnc/tests').glob('*.cjs'):
    text = path.read_text(encoding='utf-8')
    shifted = text.replace(OLD_GUARD, NEW_GUARD)
    if shifted != text:
        path.write_text(shifted, encoding='utf-8')
        print('shifted guard contract:', path)

# 3) Permanent G95 source/runtime trust workflow.
g95_trust_workflow = r'''name: CNC G95 dual semantic boundary trust smoke

on:
  pull_request:
    paths:
      - 'cnc/gm-code-complete.js'
      - 'cnc/search-aliases.js'
      - 'cnc/sw.js'
      - 'cnc/build-info.json'
      - 'cnc/tests/g95-dual-semantics-trust-smoke.cjs'
      - '.github/workflows/cnc-g95-dual-semantic-boundary-trust-smoke.yml'
  push:
    branches: [main]
    paths:
      - 'cnc/gm-code-complete.js'
      - 'cnc/search-aliases.js'
      - 'cnc/sw.js'
      - 'cnc/build-info.json'
      - 'cnc/tests/g95-dual-semantics-trust-smoke.cjs'
      - '.github/workflows/cnc-g95-dual-semantic-boundary-trust-smoke.yml'
  workflow_dispatch:

permissions:
  contents: read

jobs:
  g95-dual-semantic-boundary-trust:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha || github.sha }}
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - name: Validate exact-head identity and anti-bypass contract
        shell: bash
        run: |
          test "$(git rev-parse HEAD)" = "${{ github.event.pull_request.head.sha || github.sha }}"
          node <<'NODE'
          const fs = require('fs');
          const test = fs.readFileSync('cnc/tests/g95-dual-semantics-trust-smoke.cjs', 'utf8');
          const info = JSON.parse(fs.readFileSync('cnc/build-info.json', 'utf8'));
          if (info.pwaBuild !== '20260810-pwa35' || info.cacheRevision !== '20260810-learning35') throw new Error(`unexpected build ${info.pwaBuild}/${info.cacheRevision}`);
          for (const token of ['normalizeG95','车铣差异','铣床/加工中心','动力刀具','刚性攻丝','当前CNC','原厂手册','G95 F0.2','F0.2这类每转进给','boundary-8']) {
            if (!test.includes(token)) throw new Error(`G95 trust assertion missing: ${token}`);
          }
          for (const bypass of ['.skip(', 'process.exit(0)']) {
            if (test.includes(bypass)) throw new Error(`forbidden bypass in G95 test: ${bypass}`);
          }
          NODE
      - name: Check JavaScript syntax
        run: node --check cnc/tests/g95-dual-semantics-trust-smoke.cjs
      - name: Run G95 source and runtime trust smoke
        run: node cnc/tests/g95-dual-semantics-trust-smoke.cjs
'''
Path('.github/workflows/cnc-g95-dual-semantic-boundary-trust-smoke.yml').write_text(g95_trust_workflow, encoding='utf-8')

# 4) True source-off cold offline trust test, using a real 390x844 Chromium context.
g95_cold_test = r'''const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ensureControlled } = require('./pwa-controller-test-helper.cjs');

const root = path.resolve(__dirname, '../..');
const outDir = path.join(root, 'cnc/test-results/g95-cold-offline-source-trust');
const PWA_BUILD = '20260810-pwa35';
const CACHE_REVISION = '20260810-learning35';
let probeHits = 0;
let originServerStopped = false;
let coldOfflineConsoleWindow = false;
const expectedOfflineConsoleErrors = [];
const offline504Responses = [];
fs.mkdirSync(outDir, { recursive: true });

const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.webmanifest':'application/manifest+json', '.svg':'image/svg+xml', '.mp4':'video/mp4' };
const EXPECTED_OFFLINE_CONSOLE_ERROR = /^Failed to load resource: the server responded with a status of 504 \(Offline\)$/;
const CRITICAL_OFFLINE_PATHS = new Set(['/cnc/index.html','/cnc/search-aliases.js','/cnc/gm-code-complete.js','/cnc/sw.js']);

const server = http.createServer((req, res) => {
  let requestPath = decodeURIComponent(req.url.split('?')[0]);
  if (requestPath === '/cnc/__g95_offline_probe__') {
    probeHits += 1;
    res.writeHead(204, { 'Cache-Control':'no-store' });
    res.end();
    return;
  }
  if (requestPath === '/' || requestPath === '/cnc/') requestPath = '/cnc/index.html';
  const file = path.normalize(path.join(root, requestPath));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('404'); return;
  }
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

async function stopOriginServerForOfflineProof() {
  if (!server.listening) { originServerStopped = true; return; }
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
      expectedOfflineConsoleErrors.push(text); return;
    }
    errors.push(text);
  });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (coldOfflineConsoleWindow && response.status() === 504) offline504Responses.push({ url: response.url(), status: 504 });
  });
}

async function writeDiagnostics(page, stage, errors, extra = {}) {
  const diagnostic = { stage, url: page ? page.url() : '', title:'', controller:null, caches:[], consoleErrors:errors, expectedOfflineConsoleErrors, offline504Responses, ...extra };
  try { diagnostic.title = await page.title(); } catch {}
  try { diagnostic.controller = await page.evaluate(() => navigator.serviceWorker.controller ? { scriptURL:navigator.serviceWorker.controller.scriptURL, state:navigator.serviceWorker.controller.state } : null); } catch {}
  try { diagnostic.caches = await page.evaluate(() => caches.keys()); } catch {}
  fs.writeFileSync(path.join(outDir, 'diagnostic.json'), JSON.stringify(diagnostic, null, 2));
  try { await page.screenshot({ path:path.join(outDir, 'diagnostic.png'), fullPage:true }); } catch {}
}

(async () => {
  let context, page, userDataDir;
  let stage = 'preflight';
  const errors = [];
  let sourceEvidence = null;
  let runtimeEvidence = null;
  let cacheEvidence = null;
  let probeEvidence = null;
  try {
    const info = JSON.parse(fs.readFileSync(path.join(root, 'cnc/build-info.json'), 'utf8'));
    if (info.pwaBuild !== PWA_BUILD || info.cacheRevision !== CACHE_REVISION) throw new Error(`构建标记不一致：${info.pwaBuild}/${info.cacheRevision}`);

    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(4173, '127.0.0.1', resolve); });
    stage = 'browser-launch';
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-g95-offline-'));
    context = await chromium.launchPersistentContext(userDataDir, { headless:true, viewport:{width:390,height:844}, serviceWorkers:'allow' });
    page = context.pages()[0] || await context.newPage();
    observePage(page, errors);

    stage = 'online-install';
    await page.goto('http://127.0.0.1:4173/cnc/index.html', { waitUntil:'domcontentloaded' });
    page = await ensureControlled(page, errors, observePage);
    const cachesBefore = await page.evaluate(() => caches.keys());
    if (!cachesBefore.includes(`cnc-static-${CACHE_REVISION}`)) throw new Error(`PWA35静态缓存缺失：${JSON.stringify(cachesBefore)}`);

    stage = 'verify-g95-core-cache';
    cacheEvidence = await page.evaluate(async revision => {
      const cache = await caches.open(`cnc-static-${revision}`);
      const result = {};
      for (const item of ['./search-aliases.js','./gm-code-complete.js']) {
        const response = await cache.match(new URL(item, location.href));
        result[item] = response ? { present:true, bytes:(await response.clone().arrayBuffer()).byteLength, contentType:response.headers.get('content-type') || '' } : { present:false, bytes:0, contentType:'' };
      }
      return result;
    }, CACHE_REVISION);
    for (const item of ['./search-aliases.js','./gm-code-complete.js']) if (!cacheEvidence[item]?.present || cacheEvidence[item].bytes <= 0) throw new Error(`G95冷离线核心缺少：${item}`);

    stage = 'prove-online-network-probe';
    const onlineBefore = probeHits;
    await page.evaluate(async () => {
      const response = await fetch(`./__g95_offline_probe__?phase=online&nonce=${Date.now()}`, { cache:'no-store' });
      if (response.status !== 204) throw new Error(`在线探针状态异常：${response.status}`);
    });
    if (probeHits !== onlineBefore + 1) throw new Error(`在线探针未实际到达HTTP服务器：before=${onlineBefore}, after=${probeHits}`);
    if (errors.length) throw new Error(`联网安装阶段控制台错误：${errors.join(' | ')}`);

    stage = 'cold-offline-network-proof';
    coldOfflineConsoleWindow = true;
    await context.setOffline(true);
    await stopOriginServerForOfflineProof();
    if (!originServerStopped || server.listening) throw new Error('冷离线前未真正关闭HTTP源站');
    const offlineBefore = probeHits;
    const offlineProbeResult = await page.evaluate(async () => {
      try {
        const response = await fetch(`./__g95_offline_probe__?phase=offline&nonce=${Date.now()}`, { cache:'no-store' });
        return { resolved:true, status:response.status, type:response.type };
      } catch (error) {
        return { resolved:false, error:String(error && error.message ? error.message : error) };
      }
    });
    await new Promise(resolve => setTimeout(resolve, 100));
    const offlineAfter = probeHits;
    if (offlineAfter !== offlineBefore) throw new Error(`关闭源站后探针仍到达HTTP服务器：before=${offlineBefore}, after=${offlineAfter}`);
    if (offlineProbeResult.resolved && offlineProbeResult.status === 204) throw new Error('关闭源站后离线探针仍返回在线204');
    probeEvidence = { onlineBefore, offlineBefore, offlineAfter, offlineProbeResult, originServerStopped };

    stage = 'cold-offline-g95-source';
    sourceEvidence = await page.evaluate(async () => {
      const [aliases, gm] = await Promise.all([fetch('./search-aliases.js'), fetch('./gm-code-complete.js')]);
      return { aliasesOk:aliases.ok, gmOk:gm.ok, aliasesText:await aliases.text(), gmText:await gm.text() };
    });
    if (!sourceEvidence.aliasesOk || !sourceEvidence.gmOk) throw new Error('G95安全源冷离线读取失败');
    const start = sourceEvidence.gmText.indexOf('"id": "kb-gcode-g95"');
    const end = sourceEvidence.gmText.indexOf('"id": "kb-gcode-g96"');
    if (start < 0 || end <= start) throw new Error('冷离线基础源无法定位G95条目');
    const g95Block = sourceEvidence.gmText.slice(start, end);
    for (const token of ['车铣差异','铣床/加工中心','动力刀具','刚性攻丝','当前CNC','原厂手册','"risk": "高"']) if (!g95Block.includes(token)) throw new Error(`G95冷离线基础源缺少：${token}`);
    for (const forbidden of ['G95 F0.2','F0.2这类每转进给']) if (g95Block.includes(forbidden)) throw new Error(`G95冷离线基础源含固定教学值：${forbidden}`);
    for (const token of ['g10-g28-g53-g92-g94-g95-g96-g97-g98-g99-boundary-8','normalizeG95']) if (!sourceEvidence.aliasesText.includes(token)) throw new Error(`G95冷离线归一化源缺少：${token}`);

    stage = 'cold-offline-g95-reload';
    if (!originServerStopped) throw new Error('真实断源证据缺失');
    await page.goto('http://127.0.0.1:4173/cnc/index.html', { waitUntil:'domcontentloaded' });
    if (!(await page.title()).includes('CNC')) throw new Error('PWA35冷离线重载首页失败');
    runtimeEvidence = await page.evaluate(() => {
      const guard = window.CNC_GM_CONTENT_SAFETY;
      const entry = (window.CNC_GM_CODES || []).find(item => item && item.id === 'kb-gcode-g95');
      return { guardVersion:guard?.version || '', normalizeG95:typeof guard?.normalizeG95, entry:entry ? { risk:entry.risk, text:[entry.title,entry.summary,entry.usage,entry.beginner,entry.warning,entry.example,...(entry.tags||[])].join(' ') } : null };
    });
    if (runtimeEvidence.guardVersion !== 'g10-g28-g53-g92-g94-g95-g96-g97-g98-g99-boundary-8') throw new Error(`冷离线G95守卫版本错误：${runtimeEvidence.guardVersion}`);
    if (runtimeEvidence.normalizeG95 !== 'function') throw new Error('冷离线运行时缺少normalizeG95');
    if (!runtimeEvidence.entry || runtimeEvidence.entry.risk !== '高') throw new Error('冷离线运行时G95必须为高风险');
    for (const token of ['车铣差异','铣床/加工中心','动力刀具','刚性攻丝','当前CNC','原厂手册']) if (!runtimeEvidence.entry.text.includes(token)) throw new Error(`冷离线运行时G95缺少：${token}`);
    if (runtimeEvidence.entry.text.includes('F0.2')) throw new Error('冷离线运行时G95恢复了固定F0.2教学值');

    const criticalOffline504 = offline504Responses.filter(item => { try { return CRITICAL_OFFLINE_PATHS.has(new URL(item.url).pathname); } catch { return true; } });
    if (criticalOffline504.length) throw new Error(`冷离线关键资源返回504：${criticalOffline504.map(x => x.url).join(' | ')}`);
    if (errors.length) throw new Error(`浏览器出现非预期错误：${errors.join(' | ')}`);

    const result = { testedAt:new Date().toISOString(), pwaBuild:PWA_BUILD, cacheRevision:CACHE_REVISION, viewport:{width:390,height:844}, originServerStopped, probeEvidence, g95ColdOfflineSourceTrust:true, g95ColdOfflineRuntimeTrust:true, g95ColdOfflineReload:true, cacheEvidence, runtimeEvidence, expectedOfflineConsoleErrorCount:expectedOfflineConsoleErrors.length, expectedOfflineConsoleErrors, offline504Responses, criticalOffline504, consoleErrors:errors };
    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(result, null, 2));
    await page.screenshot({ path:path.join(outDir, 'g95-cold-offline-source-trust.png'), fullPage:true });
    console.log('CNC G95真实断源冷离线可信度门禁通过：PWA35首次安装后关闭HTTP源站，G95车铣双语义安全源与运行时仍从离线核心读取，并持续要求核对当前CNC与机床厂原厂手册。');
  } catch (error) {
    errors.push(error.message);
    if (page) await writeDiagnostics(page, stage, errors, { sourceEvidence, runtimeEvidence, cacheEvidence, probeEvidence, originServerStopped });
    console.error(error);
    process.exitCode = 1;
  } finally {
    try { if (context) await context.close(); } catch {}
    try { await stopOriginServerForOfflineProof(); } catch {}
    try { if (userDataDir) fs.rmSync(userDataDir, { recursive:true, force:true }); } catch {}
  }
})();
'''
Path('cnc/tests/g95-cold-offline-source-trust-smoke.cjs').write_text(g95_cold_test, encoding='utf-8')

g95_cold_workflow = r'''name: CNC G95 cold offline source trust smoke

on:
  pull_request:
    paths:
      - 'cnc/search-aliases.js'
      - 'cnc/gm-code-complete.js'
      - 'cnc/sw.js'
      - 'cnc/build-info.json'
      - 'cnc/pwa-status.html'
      - 'cnc/pwa-self-test.html'
      - 'cnc/tests/g95-cold-offline-source-trust-smoke.cjs'
      - '.github/workflows/cnc-g95-cold-offline-source-trust-smoke.yml'
  push:
    branches: [main]
    paths:
      - 'cnc/search-aliases.js'
      - 'cnc/gm-code-complete.js'
      - 'cnc/sw.js'
      - 'cnc/build-info.json'
      - 'cnc/pwa-status.html'
      - 'cnc/pwa-self-test.html'
      - 'cnc/tests/g95-cold-offline-source-trust-smoke.cjs'
      - '.github/workflows/cnc-g95-cold-offline-source-trust-smoke.yml'
  workflow_dispatch:

permissions:
  contents: read

jobs:
  g95-cold-offline-source-trust:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha || github.sha }}
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - name: Validate PWA35 exact-head and anti-bypass contract
        shell: bash
        run: |
          test "$(git rev-parse HEAD)" = "${{ github.event.pull_request.head.sha || github.sha }}"
          node <<'NODE'
          const fs = require('fs');
          const info = JSON.parse(fs.readFileSync('cnc/build-info.json', 'utf8'));
          const test = fs.readFileSync('cnc/tests/g95-cold-offline-source-trust-smoke.cjs', 'utf8');
          if (info.pwaBuild !== '20260810-pwa35' || info.cacheRevision !== '20260810-learning35') throw new Error(`unexpected build: ${info.pwaBuild}/${info.cacheRevision}`);
          for (const token of ['context.setOffline(true)','stopOriginServerForOfflineProof','server.closeAllConnections','originServerStopped','__g95_offline_probe__','CRITICAL_OFFLINE_PATHS','normalizeG95','boundary-8','车铣差异','当前CNC','原厂手册','G95 F0.2','F0.2这类每转进给']) {
            if (!test.includes(token)) throw new Error(`anti-bypass token missing: ${token}`);
          }
          for (const bypass of ['.skip(', 'process.exit(0)']) if (test.includes(bypass)) throw new Error(`forbidden bypass: ${bypass}`);
          NODE
      - name: Check JavaScript syntax
        run: node --check cnc/tests/g95-cold-offline-source-trust-smoke.cjs
      - name: Install Playwright Chromium
        run: |
          npm install --no-save playwright@1.54.1
          npx playwright install --with-deps chromium
      - name: Run 390x844 true source-off cold offline trust
        run: node cnc/tests/g95-cold-offline-source-trust-smoke.cjs
      - name: Upload G95 cold offline diagnostics
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: cnc-g95-cold-offline-${{ github.run_id }}
          path: cnc/test-results/g95-cold-offline-source-trust/
          if-no-files-found: warn
          retention-days: 14
'''
Path('.github/workflows/cnc-g95-cold-offline-source-trust-smoke.yml').write_text(g95_cold_workflow, encoding='utf-8')

# 5) Keep committed diagnostics clean: the migration must not rewrite old report evidence.
for report in ['cnc/test-results/pwa-build-reference-audit/report.json','cnc/test-results/g96-g97-spindle-mode-boundary-trust/report.json']:
    subprocess.run(['git','checkout','origin/main','--',report], check=True)

# 6) Prove static contracts before producing the final commit.
subprocess.run(['node','--check','cnc/tests/g95-dual-semantics-trust-smoke.cjs'], check=True)
subprocess.run(['node','cnc/tests/g95-dual-semantics-trust-smoke.cjs'], check=True)
subprocess.run(['node','--check','cnc/tests/g95-cold-offline-source-trust-smoke.cjs'], check=True)
for path in [Path('cnc/gm-code-complete.js'), Path('cnc/search-aliases.js'), Path('cnc/build-info.json'), Path('cnc/sw.js')]:
    text = path.read_text(encoding='utf-8')
    if path.name != 'gm-code-complete.js' and '20260810-pwa34' in text and path.name in {'build-info.json','sw.js'}:
        raise SystemExit(f'current build file still references old PWA34: {path}')

# 7) Remove one-shot migration machinery from the final branch state.
for temp in ['.github/workflows/cnc-g95-runtime-migration.yml','cnc/tools/g95-runtime-migrate.py','cnc/tools/g95-finalize-migration.py']:
    p = Path(temp)
    if p.exists():
        p.unlink()
        print('removed one-shot helper:', p)

print('G95 PWA35 finalization prepared')
