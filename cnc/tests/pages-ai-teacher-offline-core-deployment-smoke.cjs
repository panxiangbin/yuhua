const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const resultsDir = path.join(root, 'cnc/test-results/ai-teacher-offline-core-pages');
fs.mkdirSync(resultsDir, { recursive: true });

const publicRoot = (process.env.CNC_PAGES_URL || 'https://panxiangbin.github.io/yuhua').replace(/\/+$/, '');
const mainRoot = (process.env.CNC_MAIN_RAW_ROOT || 'https://raw.githubusercontent.com/panxiangbin/yuhua/main').replace(/\/+$/, '');
const expectedPwaBuild = '20260802-pwa5';
const expectedSiteBuild = '20260801-ai-handoff1';
const attempts = Number(process.env.CNC_PAGES_VERIFY_ATTEMPTS || 18);
const intervalMs = Number(process.env.CNC_PAGES_VERIFY_INTERVAL_MS || 10000);

if (!Number.isInteger(attempts) || attempts < 1) throw new Error('CNC_PAGES_VERIFY_ATTEMPTS 必须是大于0的整数');
if (!Number.isFinite(intervalMs) || intervalMs < 0) throw new Error('CNC_PAGES_VERIFY_INTERVAL_MS 不能为负数');

const resources = [
  { path: 'cnc/sw.js', kind: 'service-worker' },
  { path: 'cnc/build-info.json', kind: 'build-info' },
  { path: 'cnc/pwa-status.html', kind: 'pwa-status' },
  { path: 'cnc/pwa-self-test.html', kind: 'pwa-self-test' }
];

const diagnostics = {
  checkedAt: new Date().toISOString(),
  publicRoot,
  mainRoot,
  expectedPwaBuild,
  expectedSiteBuild,
  resources: {},
  attempts: []
};

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function cacheBusted(url) {
  const target = new URL(url);
  target.searchParams.set('verify-ai-offline-core', `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return target.toString();
}

async function fetchBytes(url, label) {
  const response = await fetch(cacheBusted(url), {
    cache: 'no-store',
    redirect: 'follow',
    headers: {
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
      'User-Agent': 'cnc-ai-teacher-offline-core-pages-smoke'
    }
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!response.ok) throw new Error(`${label} HTTP ${response.status}：${buffer.toString('utf8', 0, 180)}`);
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

function summarize(payload) {
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

function exactMatch(left, right) {
  return left.bytes === right.bytes && left.sha256 === right.sha256;
}

function requireTokens(text, label, tokens) {
  for (const token of tokens) {
    if (!text.includes(token)) throw new Error(`${label}缺少部署契约：${token}`);
  }
}

function forbidTokens(text, label, patterns) {
  for (const pattern of patterns) {
    if (pattern.test(text)) throw new Error(`${label}出现禁止的门禁绕过或危险声明：${pattern}`);
  }
}

function assertServiceWorker(text, label) {
  requireTokens(text, label, [
    "const BUILD = '20260802-pwa5'",
    "const STATIC_CACHE = `cnc-static-${BUILD}`",
    "const RUNTIME_CACHE = `cnc-runtime-${BUILD}`",
    "'./ai-teacher.html'",
    "'./ai-teacher-intake.html'",
    "'./ai-teacher-explainability.html'",
    "'./pwa-self-test.html'",
    "'./pwa-status.html'",
    "'./build-info.json'",
    "name.startsWith('cnc-') && !name.endsWith(BUILD)",
    "event.data.type === 'GET_BUILD'",
    "event.data.type === 'ENSURE_CACHES'"
  ]);
  forbidTokens(text, label, [
    /test\.skip\(/,
    /describe\.skip\(/,
    /it\.skip\(/,
    /allowOperationalUse\s*:\s*true/
  ]);
  const requiredBlock = text.match(/const REQUIRED_CORE_PATHS = \[([\s\S]*?)\];/)?.[1] || '';
  const corePaths = [...requiredBlock.matchAll(/'([^']+)'/g)].map(match => match[1]);
  const expected = [
    './index.html',
    './offline.html',
    './pwa-status.html',
    './pwa-self-test.html',
    './pages-status.html',
    './ai-teacher.html',
    './ai-teacher-intake.html',
    './ai-teacher-explainability.html',
    './build-info.json'
  ];
  if (JSON.stringify(corePaths) !== JSON.stringify(expected)) {
    throw new Error(`${label}核心缓存清单不一致：${JSON.stringify(corePaths)}`);
  }
  return { build: expectedPwaBuild, corePaths };
}

function assertBuildInfo(text, label) {
  let data;
  try { data = JSON.parse(text.replace(/^\uFEFF/, '')); } catch (error) { throw new Error(`${label}不是合法JSON：${error.message}`); }
  if (data.app !== 'cnc-training-platform') throw new Error(`${label}应用标识错误：${data.app}`);
  if (data.build !== expectedSiteBuild) throw new Error(`${label}站点构建错误：${data.build}`);
  if (data.pwaBuild !== expectedPwaBuild) throw new Error(`${label}PWA构建错误：${data.pwaBuild}`);
  requireTokens(String(data.contentStage || ''), label, ['AI CNC老师基础版', 'AI老师现场问诊单', 'AI老师判断说明', 'AI老师离线核心', 'PWA可靠性']);
  if (data.scope !== '/cnc/') throw new Error(`${label}作用域错误：${data.scope}`);
  return { build: data.build, pwaBuild: data.pwaBuild, scope: data.scope };
}

function visibleBody(text) {
  const body = text.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || '';
  return body.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function assertStatusPage(text, label) {
  requireTokens(text, label, [
    "const EXPECTED='20260802-pwa5'",
    'AI CNC老师、现场问诊单和“为什么被阻断”判断说明页',
    'AI老师判断说明页可冷离线打开',
    '页面、Service Worker与两类缓存版本一致',
    'pageshow',
    'visibilitychange'
  ]);
  const visible = visibleBody(text);
  requireTokens(visible, label, [
    '离线、缓存与更新状态',
    '离线内容可能不是最新版本',
    '原厂手册、企业制度和现场条件'
  ]);
  return { build: expectedPwaBuild, visibleSafetyBoundary: true };
}

function assertSelfTest(text, label) {
  requireTokens(text, label, [
    "const EXPECTED='20260802-pwa5'",
    "'./ai-teacher.html'",
    "'./ai-teacher-intake.html'",
    "'./ai-teacher-explainability.html'",
    '核心离线资源完整',
    '公网构建标记与PWA一致',
    '已核对${REQUIRED.length}项（含AI老师、问诊单与判断说明页）',
    'MAX_AUTO_RETRIES=20'
  ]);
  const requiredBlock = text.match(/const REQUIRED=\[([^\]]+)\]/)?.[1] || '';
  const required = [...requiredBlock.matchAll(/'([^']+)'/g)].map(match => match[1]);
  if (required.length !== 9) throw new Error(`${label}应核对9项核心资源，实际${required.length}项`);
  if (new Set(required).size !== required.length) throw new Error(`${label}核心资源存在重复项`);
  const visible = visibleBody(text);
  requireTokens(visible, label, ['只读检查', '不修改学习记录', '不清空缓存', '不发放XP', '高风险操作须现场师傅或授权人员指导']);
  return { build: expectedPwaBuild, requiredCount: required.length, readOnly: true };
}

function assertContract(kind, text, label) {
  if (kind === 'service-worker') return assertServiceWorker(text, label);
  if (kind === 'build-info') return assertBuildInfo(text, label);
  if (kind === 'pwa-status') return assertStatusPage(text, label);
  if (kind === 'pwa-self-test') return assertSelfTest(text, label);
  throw new Error(`未知资源类型：${kind}`);
}

async function waitForDeployment() {
  let latest = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const attemptRecord = { attempt, at: new Date().toISOString(), resources: {} };
    try {
      let allMatched = true;
      const current = {};
      for (const resource of resources) {
        const main = await fetchBytes(`${mainRoot}/${resource.path}`, `main ${resource.path}`);
        const pages = await fetchBytes(`${publicRoot}/${resource.path}`, `Pages ${resource.path}`);
        const matched = exactMatch(main, pages);
        current[resource.path] = { main, pages, matched };
        attemptRecord.resources[resource.path] = { matched, main: summarize(main), pages: summarize(pages) };
        if (!matched) allMatched = false;
      }
      diagnostics.attempts.push(attemptRecord);
      latest = current;
      if (allMatched) return current;
    } catch (error) {
      attemptRecord.error = error.message;
      diagnostics.attempts.push(attemptRecord);
    }
    if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  diagnostics.latest = latest ? Object.fromEntries(Object.entries(latest).map(([key, value]) => [key, {
    matched: value.matched,
    main: summarize(value.main),
    pages: summarize(value.pages)
  }])) : null;
  throw new Error('AI老师离线核心资源尚未与main在Pages公网逐字节一致');
}

(async () => {
  const reportPath = path.join(resultsDir, 'report.json');
  const findingsPath = path.join(resultsDir, 'findings.txt');
  try {
    const deployed = await waitForDeployment();
    const findings = [];
    for (const resource of resources) {
      const localBuffer = fs.readFileSync(path.join(root, resource.path));
      const local = { buffer: localBuffer, bytes: localBuffer.length, sha256: sha256(localBuffer), status: 200, finalUrl: `file://${path.join(root, resource.path)}` };
      const pair = deployed[resource.path];
      const localText = localBuffer.toString('utf8').replace(/^\uFEFF/, '');
      const mainText = pair.main.buffer.toString('utf8').replace(/^\uFEFF/, '');
      const pagesText = pair.pages.buffer.toString('utf8').replace(/^\uFEFF/, '');
      const localContract = assertContract(resource.kind, localText, `当前分支 ${resource.path}`);
      const mainContract = assertContract(resource.kind, mainText, `main ${resource.path}`);
      const pagesContract = assertContract(resource.kind, pagesText, `Pages ${resource.path}`);
      if (!exactMatch(local, pair.main)) throw new Error(`当前分支与main不一致：${resource.path}`);
      diagnostics.resources[resource.path] = {
        local: summarize(local),
        main: summarize(pair.main),
        pages: summarize(pair.pages),
        localContract,
        mainContract,
        pagesContract,
        exactBytesMatch: true,
        exactSha256Match: true,
        localMatchesMain: true
      };
      findings.push(`${resource.path}｜${pair.pages.bytes} bytes｜${pair.pages.sha256}`);
    }

    diagnostics.verified = {
      publicReachable: true,
      resourceCount: resources.length,
      exactBytesMatch: true,
      exactSha256Match: true,
      localMatchesMain: true,
      pwaBuild: expectedPwaBuild,
      siteBuild: expectedSiteBuild,
      explainabilityInCoreCache: true,
      aiTeacherInCoreCache: true,
      intakeInCoreCache: true,
      nineCoreResourcesVerified: true,
      upgradeBoundaryVisible: true,
      safetyBoundaryVisible: true
    };

    fs.writeFileSync(reportPath, JSON.stringify(diagnostics, null, 2));
    fs.writeFileSync(findingsPath, [
      'AI老师离线核心Pages公网可达：是',
      'main、当前分支与Pages四项资源逐字节一致：是',
      `站点构建：${expectedSiteBuild}`,
      `PWA构建：${expectedPwaBuild}`,
      'AI老师、现场问诊单、判断说明页核心预缓存：完整',
      'PWA自检核心资源：9项',
      '固定值、原厂手册与授权人员边界：可见',
      ...findings
    ].join('\n') + '\n');
    console.log(`CNC AI teacher offline core Pages verified: ${expectedSiteBuild} / ${expectedPwaBuild}`);
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
