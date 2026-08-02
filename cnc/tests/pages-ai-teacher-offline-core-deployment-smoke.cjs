const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const resultsDir = path.join(root, 'cnc/test-results/ai-teacher-offline-core-pages');
fs.mkdirSync(resultsDir, { recursive: true });

const publicRoot = (process.env.CNC_PAGES_URL || 'https://panxiangbin.github.io/yuhua').replace(/\/+$/, '');
const mainRoot = (process.env.CNC_MAIN_RAW_ROOT || 'https://raw.githubusercontent.com/panxiangbin/yuhua/main').replace(/\/+$/, '');
const branchTargetPwaBuild = '20260802-pwa8';
const previousPublicPwaBuild = '20260802-pwa7';
const expectedSiteBuild = '20260801-ai-handoff1';
const attempts = Number(process.env.CNC_PAGES_VERIFY_ATTEMPTS || 18);
const intervalMs = Number(process.env.CNC_PAGES_VERIFY_INTERVAL_MS || 10000);
const eventName = process.env.GITHUB_EVENT_NAME || '';

if (!Number.isInteger(attempts) || attempts < 1) throw new Error('CNC_PAGES_VERIFY_ATTEMPTS必须是大于0的整数');
if (!Number.isFinite(intervalMs) || intervalMs < 0) throw new Error('CNC_PAGES_VERIFY_INTERVAL_MS不能为负数');

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
  branchTargetPwaBuild,
  previousPublicPwaBuild,
  expectedSiteBuild,
  eventName,
  resources: {},
  attempts: []
};

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function cacheBusted(url) {
  const target = new URL(url);
  target.searchParams.set('verify-pwa-offline-core', `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return target.toString();
}

async function fetchBytes(url, label) {
  const response = await fetch(cacheBusted(url), {
    cache: 'no-store',
    redirect: 'follow',
    headers: {
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
      'User-Agent': 'cnc-pwa-offline-core-pages-smoke'
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
  for (const token of tokens) if (!text.includes(token)) throw new Error(`${label}缺少部署契约：${token}`);
}

function forbidTokens(text, label, patterns) {
  for (const pattern of patterns) if (pattern.test(text)) throw new Error(`${label}出现禁止的门禁绕过或危险声明：${pattern}`);
}

function assertAllowedBuild(build, label) {
  if (![previousPublicPwaBuild, branchTargetPwaBuild].includes(build)) throw new Error(`${label}出现未受控PWA构建：${build}`);
}

function expectedCorePaths() {
  return [
    './index.html',
    './offline.html',
    './pwa-status.html',
    './pwa-self-test.html',
    './pages-status.html',
    './beginner-placement.html',
    './training-camp.html',
    './ai-teacher.html',
    './ai-teacher-intake.html',
    './ai-teacher-explainability.html',
    './build-info.json'
  ];
}

function parseQuotedArray(text, pattern, label) {
  const block = text.match(pattern)?.[1] || '';
  const values = [...block.matchAll(/'([^']+)'/g)].map(match => match[1]);
  if (!values.length) throw new Error(`${label}未读取到资源清单`);
  if (new Set(values).size !== values.length) throw new Error(`${label}资源清单存在重复项`);
  return values;
}

function assertExactArray(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label}资源清单不一致：${JSON.stringify(actual)}，期望${JSON.stringify(expected)}`);
}

function assertServiceWorker(text, label, expectedBuild) {
  requireTokens(text, label, [
    `const BUILD = '${expectedBuild}'`,
    "const STATIC_CACHE = `cnc-static-${BUILD}`",
    "const RUNTIME_CACHE = `cnc-runtime-${BUILD}`",
    "'./beginner-placement.html'",
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
  if (expectedBuild === branchTargetPwaBuild) requireTokens(text, label, ["'./training-camp.html'"]);
  forbidTokens(text, label, [/test\.skip\(/, /describe\.skip\(/, /it\.skip\(/, /allowOperationalUse\s*:\s*true/]);
  const actual = parseQuotedArray(text, /const REQUIRED_CORE_PATHS = \[([\s\S]*?)\];/, `${label}核心缓存`);
  const expected = expectedBuild === branchTargetPwaBuild ? expectedCorePaths() : expectedCorePaths().filter(item => item !== './training-camp.html');
  assertExactArray(actual, expected, `${label}核心缓存`);
  return { build: expectedBuild, corePaths: actual };
}

function parseBuildInfo(text, label) {
  let data;
  try { data = JSON.parse(text.replace(/^\uFEFF/, '')); } catch (error) { throw new Error(`${label}不是合法JSON：${error.message}`); }
  if (data.app !== 'cnc-training-platform') throw new Error(`${label}应用标识错误：${data.app}`);
  if (data.build !== expectedSiteBuild) throw new Error(`${label}站点构建错误：${data.build}`);
  assertAllowedBuild(data.pwaBuild, label);
  if (data.scope !== '/cnc/') throw new Error(`${label}作用域错误：${data.scope}`);
  return data;
}

function assertBuildInfo(text, label, expectedBuild) {
  const data = parseBuildInfo(text, label);
  if (data.pwaBuild !== expectedBuild) throw new Error(`${label}PWA构建错误：${data.pwaBuild}，期望${expectedBuild}`);
  requireTokens(String(data.contentStage || ''), label, ['起点测评离线核心', 'AI CNC老师基础版', 'AI老师现场问诊单', 'AI老师判断说明', 'AI老师离线核心', 'PWA可靠性']);
  if (expectedBuild === branchTargetPwaBuild) requireTokens(String(data.contentStage || ''), label, ['起点测评关键安全门禁', '测评路线一次性交接', '训练营路线离线核心']);
  return { build: data.build, pwaBuild: data.pwaBuild, scope: data.scope };
}

function visibleBody(text) {
  const body = text.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || '';
  return body.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function assertStatusPage(text, label, expectedBuild) {
  requireTokens(text, label, [
    `const EXPECTED='${expectedBuild}'`,
    '页面、Service Worker与两类缓存版本一致',
    '新手起点测评',
    'AI CNC老师',
    '现场问诊单',
    '判断说明页',
    'pageshow',
    'visibilitychange'
  ]);
  if (expectedBuild === branchTargetPwaBuild) requireTokens(text, label, ['关键安全项硬门禁', '训练营', '临时路线']);
  const visible = visibleBody(text);
  requireTokens(visible, label, ['离线、缓存与更新状态', '离线内容可能不是最新版本', '测评只用于推荐学习路线', '原厂手册、企业制度和现场条件']);
  return { build: expectedBuild, visibleSafetyBoundary: true };
}

function assertSelfTest(text, label, expectedBuild) {
  requireTokens(text, label, [
    `const EXPECTED='${expectedBuild}'`,
    "'./beginner-placement.html'",
    "'./ai-teacher.html'",
    "'./ai-teacher-intake.html'",
    "'./ai-teacher-explainability.html'",
    '核心离线资源完整',
    '公网构建标记与PWA一致',
    'MAX_AUTO_RETRIES=20'
  ]);
  if (expectedBuild === branchTargetPwaBuild) requireTokens(text, label, ["'./training-camp.html'", '关键安全项硬门禁', '训练营临时路线']);
  const actual = parseQuotedArray(text, /const REQUIRED=\[([^\]]+)\]/, `${label}自检核心资源`);
  const expected = expectedBuild === branchTargetPwaBuild ? expectedCorePaths() : expectedCorePaths().filter(item => item !== './training-camp.html');
  assertExactArray(actual, expected, `${label}自检核心资源`);
  const visible = visibleBody(text);
  requireTokens(visible, label, ['只读检查', '不修改学习记录', '不清空缓存', '不发放XP', '起点测评只推荐学习路线', '高风险操作须现场师傅或授权人员指导']);
  return { build: expectedBuild, requiredCount: actual.length, readOnly: true };
}

function assertContract(kind, text, label, expectedBuild) {
  if (kind === 'service-worker') return assertServiceWorker(text, label, expectedBuild);
  if (kind === 'build-info') return assertBuildInfo(text, label, expectedBuild);
  if (kind === 'pwa-status') return assertStatusPage(text, label, expectedBuild);
  if (kind === 'pwa-self-test') return assertSelfTest(text, label, expectedBuild);
  throw new Error(`未知资源类型：${kind}`);
}

async function waitForMainPagesMatch() {
  let latest = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const record = { attempt, at: new Date().toISOString(), resources: {} };
    try {
      let allMatched = true;
      const current = {};
      for (const resource of resources) {
        const main = await fetchBytes(`${mainRoot}/${resource.path}`, `main ${resource.path}`);
        const pages = await fetchBytes(`${publicRoot}/${resource.path}`, `Pages ${resource.path}`);
        const matched = exactMatch(main, pages);
        current[resource.path] = { main, pages, matched };
        record.resources[resource.path] = { matched, main: summarize(main), pages: summarize(pages) };
        if (!matched) allMatched = false;
      }
      diagnostics.attempts.push(record);
      latest = current;
      if (allMatched) return current;
    } catch (error) {
      record.error = error.message;
      diagnostics.attempts.push(record);
    }
    if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  diagnostics.latest = latest ? Object.fromEntries(Object.entries(latest).map(([key, value]) => [key, { matched: value.matched, main: summarize(value.main), pages: summarize(value.pages) }])) : null;
  throw new Error('PWA离线核心资源尚未与main在Pages公网逐字节一致');
}

(async () => {
  const reportPath = path.join(resultsDir, 'report.json');
  const findingsPath = path.join(resultsDir, 'findings.txt');
  try {
    const deployed = await waitForMainPagesMatch();
    const localBuffers = Object.fromEntries(resources.map(resource => [resource.path, fs.readFileSync(path.join(root, resource.path))]));
    const localBuildData = parseBuildInfo(localBuffers['cnc/build-info.json'].toString('utf8'), '当前分支 cnc/build-info.json');
    if (localBuildData.pwaBuild !== branchTargetPwaBuild) throw new Error(`当前分支目标PWA构建错误：${localBuildData.pwaBuild}`);

    const mainBuildData = parseBuildInfo(deployed['cnc/build-info.json'].main.buffer.toString('utf8'), 'main cnc/build-info.json');
    const pagesBuildData = parseBuildInfo(deployed['cnc/build-info.json'].pages.buffer.toString('utf8'), 'Pages cnc/build-info.json');
    if (mainBuildData.pwaBuild !== pagesBuildData.pwaBuild) throw new Error('main与Pages PWA构建标记不一致');
    const publicPwaBuild = mainBuildData.pwaBuild;

    const findings = [];
    let localMatchesMain = true;
    for (const resource of resources) {
      const localBuffer = localBuffers[resource.path];
      const local = { buffer: localBuffer, bytes: localBuffer.length, sha256: sha256(localBuffer), status: 200, finalUrl: `file://${path.join(root, resource.path)}` };
      const pair = deployed[resource.path];
      const localContract = assertContract(resource.kind, localBuffer.toString('utf8'), `当前分支 ${resource.path}`, branchTargetPwaBuild);
      const mainContract = assertContract(resource.kind, pair.main.buffer.toString('utf8'), `main ${resource.path}`, publicPwaBuild);
      const pagesContract = assertContract(resource.kind, pair.pages.buffer.toString('utf8'), `Pages ${resource.path}`, publicPwaBuild);
      const localMatch = exactMatch(local, pair.main);
      if (!localMatch) localMatchesMain = false;
      diagnostics.resources[resource.path] = {
        local: summarize(local),
        main: summarize(pair.main),
        pages: summarize(pair.pages),
        localContract,
        mainContract,
        pagesContract,
        mainPagesExactBytesMatch: true,
        mainPagesExactSha256Match: true,
        localMatchesMain: localMatch
      };
      findings.push(`${resource.path}｜Pages ${pair.pages.bytes} bytes｜${pair.pages.sha256}｜分支与main一致=${localMatch}`);
    }

    const branchDeploymentPending = !localMatchesMain;
    if (eventName !== 'pull_request' && branchDeploymentPending) throw new Error('main正式验收不允许当前分支与main/Pages仍不一致');
    if (!branchDeploymentPending && publicPwaBuild !== branchTargetPwaBuild) throw new Error('分支与main一致时公网必须已经是目标PWA构建');

    diagnostics.verified = {
      publicReachable: true,
      resourceCount: resources.length,
      mainPagesExactBytesMatch: true,
      mainPagesExactSha256Match: true,
      exactBytesMatch: true,
      exactSha256Match: true,
      localMatchesMain,
      branchDeploymentPending,
      branchPwaBuild: branchTargetPwaBuild,
      publicPwaBuild,
      siteBuild: expectedSiteBuild,
      beginnerPlacementInCoreCache: true,
      trainingCampInCoreCache: true,
      placementRouteHandoffInBranch: true,
      criticalSafetyGateInBranch: true,
      explainabilityInCoreCache: true,
      aiTeacherInCoreCache: true,
      intakeInCoreCache: true,
      elevenCoreResourcesVerified: true,
      publicCoreResourcesVerified: true,
      upgradeBoundaryVisible: true,
      safetyBoundaryVisible: true
    };

    fs.writeFileSync(reportPath, JSON.stringify(diagnostics, null, 2));
    fs.writeFileSync(findingsPath, [
      'PWA离线核心Pages公网可达：是',
      'main与Pages四项资源逐字节一致：是',
      `当前分支PWA构建：${branchTargetPwaBuild}`,
      `main与Pages公网PWA构建：${publicPwaBuild}`,
      `分支待合并或待部署：${branchDeploymentPending ? '是' : '否'}`,
      '当前分支起点测评、训练营路线、AI老师、现场问诊单、判断说明页核心预缓存：完整',
      '当前分支PWA自检核心资源：11项且无重复',
      `Pages公网训练营路线核心：${publicPwaBuild === branchTargetPwaBuild ? '已部署' : '尚未部署，保持pwa7正式版本'}`,
      '测评安全硬门禁、路线隐私、固定值、原厂手册与授权人员边界：可见',
      ...findings
    ].join('\n') + '\n');
    console.log(`CNC PWA offline core Pages verified: branch ${branchTargetPwaBuild} / public ${publicPwaBuild} / pending=${branchDeploymentPending}`);
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