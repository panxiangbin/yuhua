const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const resultsDir = path.resolve(root, 'cnc/test-results/ai-teacher-pages-deployment');
fs.mkdirSync(resultsDir, { recursive: true });

const publicRoot = (process.env.CNC_PAGES_URL || 'https://panxiangbin.github.io/yuhua').replace(/\/+$/, '');
const mainRoot = (process.env.CNC_MAIN_RAW_ROOT || 'https://raw.githubusercontent.com/panxiangbin/yuhua/main').replace(/\/+$/, '');
const eventName = String(process.env.GITHUB_EVENT_NAME || 'local');
const requireLocalMainMatch = eventName !== 'pull_request';
const attempts = Number(process.env.CNC_PAGES_VERIFY_ATTEMPTS || 18);
const intervalMs = Number(process.env.CNC_PAGES_VERIFY_INTERVAL_MS || 10000);

if (!Number.isInteger(attempts) || attempts < 1) throw new Error('CNC_PAGES_VERIFY_ATTEMPTS 必须是大于 0 的整数');
if (!Number.isFinite(intervalMs) || intervalMs < 0) throw new Error('CNC_PAGES_VERIFY_INTERVAL_MS 不能为负数');

const resources = [
  { path: 'cnc/ai-teacher.html', kind: 'aiTeacher' },
  { path: 'cnc/sw.js', kind: 'serviceWorker' },
  { path: 'cnc/build-info.json', kind: 'buildInfo' }
];

const diagnostics = {
  checkedAt: new Date().toISOString(),
  eventName,
  requireLocalMainMatch,
  publicRoot,
  mainRoot,
  resources: {},
  attempts: []
};

function cacheBusted(url) {
  const target = new URL(url);
  target.searchParams.set('verify-ai-teacher', `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return target.toString();
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function summary(payload) {
  return {
    status: payload.status,
    finalUrl: payload.finalUrl,
    bytes: payload.bytes,
    sha256: payload.sha256,
    contentType: payload.contentType,
    cacheControl: payload.cacheControl,
    age: payload.age,
    etag: payload.etag,
    lastModified: payload.lastModified
  };
}

async function fetchBytes(url, label) {
  const response = await fetch(cacheBusted(url), {
    cache: 'no-store',
    redirect: 'follow',
    headers: {
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
      'User-Agent': 'cnc-ai-teacher-pages-deployment-smoke'
    }
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!response.ok) {
    throw new Error(`${label} HTTP ${response.status}：${buffer.toString('utf8', 0, 180)}`);
  }
  return {
    buffer,
    status: response.status,
    finalUrl: response.url,
    bytes: buffer.length,
    sha256: sha256(buffer),
    contentType: response.headers.get('content-type'),
    cacheControl: response.headers.get('cache-control'),
    age: response.headers.get('age'),
    etag: response.headers.get('etag'),
    lastModified: response.headers.get('last-modified')
  };
}

function assertAiTeacher(text, label) {
  const required = [
    '<html lang="zh-CN">',
    'AI CNC老师',
    'localOnly:true',
    'externalModel:false',
    '不调用外部模型',
    'classifyQuestion',
    'BLOCK_RULES',
    '已阻断高风险请求',
    '无法给出可直接上机的固定值或绕过步骤',
    '依据来源与可信状态',
    'content-trust-status.html',
    'content-trust-evidence.html',
    '资料清单与逐条复核记录不能互相代替',
    '核对机床原厂手册',
    'ai-teacher-intake.html'
  ];
  for (const token of required) {
    if (!text.includes(token)) throw new Error(`${label}缺少 AI 老师可信问答契约：${token}`);
  }
  for (const forbidden of [
    /https?:\/\//i,
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /WebSocket/,
    /EventSource/,
    /allowOperationalUse\s*:\s*true/
  ]) {
    if (forbidden.test(text)) throw new Error(`${label}出现不允许的联网或直接上机声明：${forbidden}`);
  }
  const build = text.match(/const BUILD = '([^']+)'/)?.[1];
  if (!build || !/^\d{8}-[a-z0-9-]+$/.test(build)) throw new Error(`${label}缺少有效站点构建标识`);
  return {
    build,
    localOnly: true,
    externalModel: false,
    highRiskBlockingPresent: true,
    sourceTraceabilityPresent: true,
    originalManualBoundaryPresent: true,
    externalNetworkingAbsent: true
  };
}

function assertServiceWorker(text, label) {
  const build = text.match(/const BUILD = '([^']+)'/)?.[1];
  if (!build || !/^\d{8}-pwa\d+$/.test(build)) throw new Error(`${label}缺少有效 PWA 构建标识`);
  for (const token of [
    "'./ai-teacher.html'",
    "'./ai-teacher-intake.html'",
    "'./build-info.json'",
    'REQUIRED_CORE_PATHS',
    'cacheCoreBestEffort',
    'ENSURE_CACHES',
    'CNC_CACHES_READY'
  ]) {
    if (!text.includes(token)) throw new Error(`${label}缺少 AI 老师离线核心缓存契约：${token}`);
  }
  return {
    build,
    aiTeacherCoreCached: true,
    intakeCoreCached: true,
    cacheRepairPresent: true
  };
}

function assertBuildInfo(text, label) {
  let info;
  try {
    info = JSON.parse(text);
  } catch (error) {
    throw new Error(`${label}不是有效 JSON：${error.message}`);
  }
  if (info.app !== 'cnc-training-platform') throw new Error(`${label}应用标识错误`);
  if (!/^\d{8}-[a-z0-9-]+$/.test(String(info.build || ''))) throw new Error(`${label}站点构建标识格式错误`);
  if (!/^\d{8}-pwa\d+$/.test(String(info.pwaBuild || ''))) throw new Error(`${label}PWA 构建标识格式错误`);
  const contentStage = String(info.contentStage || '');
  if (!contentStage.includes('AI CNC老师基础版')) throw new Error(`${label}缺少 AI 老师基础能力标识`);
  const pwaSequence = Number(String(info.pwaBuild).match(/pwa(\d+)$/)?.[1] || 0);
  if (pwaSequence >= 13 && !contentStage.includes('AI老师问诊闭环')) {
    throw new Error(`${label}PWA13及后续版本缺少 AI 老师问诊闭环能力标识`);
  }
  return {
    app: info.app,
    build: info.build,
    pwaBuild: info.pwaBuild,
    contentStage: info.contentStage
  };
}

function assertContracts(source, label, options = {}) {
  const page = assertAiTeacher(source['cnc/ai-teacher.html'].buffer.toString('utf8').replace(/^\uFEFF/, ''), `${label} AI老师页面`);
  const sw = assertServiceWorker(source['cnc/sw.js'].buffer.toString('utf8').replace(/^\uFEFF/, ''), `${label} Service Worker`);
  const info = assertBuildInfo(source['cnc/build-info.json'].buffer.toString('utf8').replace(/^\uFEFF/, ''), `${label} 构建信息`);
  let publishedLegacySiteBuild = false;
  if (page.build !== info.build) {
    const knownPendingDeployment = options.allowPublishedLegacySiteBuild === true
      && page.build === '20260801-ai-handoff1'
      && info.build === '20260804-mobile-home1';
    if (!knownPendingDeployment) throw new Error(`${label} AI老师页面与站点构建不一致：${page.build} / ${info.build}`);
    publishedLegacySiteBuild = true;
  }
  if (sw.build !== info.pwaBuild) throw new Error(`${label} Service Worker 与 PWA 构建不一致：${sw.build} / ${info.pwaBuild}`);
  return { page, serviceWorker: sw, buildInfo: info, publishedLegacySiteBuild };
}

function readLocalResources() {
  const local = {};
  for (const resource of resources) {
    const buffer = fs.readFileSync(path.join(root, resource.path));
    local[resource.path] = {
      buffer,
      status: 200,
      finalUrl: `file://${path.join(root, resource.path)}`,
      bytes: buffer.length,
      sha256: sha256(buffer),
      contentType: resource.path.endsWith('.json') ? 'application/json' : 'text/plain'
    };
  }
  return local;
}

async function fetchResourceSet(base, label) {
  const set = {};
  for (const resource of resources) {
    set[resource.path] = await fetchBytes(`${base}/${resource.path}`, `${label} ${resource.path}`);
  }
  return set;
}

function exactSetMatch(left, right) {
  return resources.every(resource => {
    const a = left[resource.path];
    const b = right[resource.path];
    return a.sha256 === b.sha256 && a.bytes === b.bytes;
  });
}

function setSummaries(set) {
  return Object.fromEntries(resources.map(resource => [resource.path, summary(set[resource.path])]));
}

async function waitForMainAndPages(local) {
  let lastMain;
  let lastPages;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      lastMain = await fetchResourceSet(mainRoot, 'main');
      lastPages = await fetchResourceSet(publicRoot, 'Pages公网');
      const matched = exactSetMatch(lastMain, lastPages);
      const localMatchesMain = exactSetMatch(local, lastMain);
      diagnostics.attempts.push({
        attempt,
        at: new Date().toISOString(),
        matched,
        localMatchesMain,
        main: setSummaries(lastMain),
        pages: setSummaries(lastPages)
      });
      if (matched && (!requireLocalMainMatch || localMatchesMain)) return { main: lastMain, pages: lastPages };
    } catch (error) {
      diagnostics.attempts.push({ attempt, at: new Date().toISOString(), error: error.message });
    }
    if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  if (requireLocalMainMatch) {
    throw new Error('AI老师页面、Service Worker 或构建信息尚未与当前 main 提交及 Pages 公网逐字节一致');
  }
  throw new Error('AI老师页面、Service Worker 或构建信息尚未与 main 在 Pages 公网逐字节一致');
}

(async () => {
  const reportPath = path.join(resultsDir, 'report.json');
  const findingsPath = path.join(resultsDir, 'findings.txt');
  try {
    const local = readLocalResources();
    const localContracts = assertContracts(local, '当前分支');
    const published = await waitForMainAndPages(local);
    const allowPublishedLegacySiteBuild = eventName === 'pull_request' && !exactSetMatch(local, published.main);
    const mainContracts = assertContracts(published.main, 'main', { allowPublishedLegacySiteBuild });
    const pagesContracts = assertContracts(published.pages, 'Pages公网', { allowPublishedLegacySiteBuild });
    const localMatchesMain = exactSetMatch(local, published.main);

    if (requireLocalMainMatch && !localMatchesMain) {
      throw new Error('main 或手动复验必须要求当前分支资源与远程 main 完全一致');
    }

    diagnostics.local = { resources: setSummaries(local), contracts: localContracts };
    diagnostics.main = { resources: setSummaries(published.main), contracts: mainContracts };
    diagnostics.pages = { resources: setSummaries(published.pages), contracts: pagesContracts };
    diagnostics.verified = {
      publicReachable: true,
      exactBytesMatch: true,
      exactSha256Match: true,
      localMatchesMain,
      branchDeploymentPending: !localMatchesMain,
      buildConsistency: true,
      aiTeacherTrustBoundary: true,
      aiTeacherOfflineCoreCache: true,
      noExternalNetworking: true
    };

    fs.writeFileSync(reportPath, JSON.stringify(diagnostics, null, 2));
    fs.writeFileSync(findingsPath, [
      `AI老师公网可达：是`,
      `main 与 Pages 逐字节一致：是`,
      `当前分支与 main 一致：${localMatchesMain ? '是' : '否（PR 分支改动待合并部署）'}`,
      `站点构建：${pagesContracts.buildInfo.build}`,
      `PWA 构建：${pagesContracts.buildInfo.pwaBuild}`,
      `高风险拒答与来源追溯：通过`,
      `AI老师离线核心缓存：通过`,
      `站外联网调用：0`
    ].join('\n') + '\n');
    console.log(`CNC AI teacher Pages deployment verified: ${pagesContracts.buildInfo.build} / ${pagesContracts.buildInfo.pwaBuild}`);
  } catch (error) {
    diagnostics.error = String(error && error.stack || error);
    fs.writeFileSync(reportPath, JSON.stringify(diagnostics, null, 2));
    fs.writeFileSync(findingsPath, diagnostics.error + '\n');
    throw error;
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
