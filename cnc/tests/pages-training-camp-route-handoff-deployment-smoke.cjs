const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'cnc/test-results/training-camp-route-handoff-pages');
fs.mkdirSync(out, { recursive: true });

const publicRoot = (process.env.CNC_PAGES_URL || 'https://panxiangbin.github.io/yuhua').replace(/\/+$/, '');
const mainRoot = (process.env.CNC_MAIN_RAW_ROOT || 'https://raw.githubusercontent.com/panxiangbin/yuhua/main').replace(/\/+$/, '');
const expectedSiteBuild = '20260804-home-refresh1';
const expectedPwaBuild = '20260805-pwa13';
const previousPublicPwaBuild = '20260803-pwa9';
const attempts = Number(process.env.CNC_PAGES_VERIFY_ATTEMPTS || 18);
const intervalMs = Number(process.env.CNC_PAGES_VERIFY_INTERVAL_MS || 10000);
const eventName = process.env.GITHUB_EVENT_NAME || '';
const resources = ['cnc/training-camp.html', 'cnc/sw.js', 'cnc/build-info.json'];

if (!Number.isInteger(attempts) || attempts < 1) throw new Error('CNC_PAGES_VERIFY_ATTEMPTS必须是大于0的整数');
if (!Number.isFinite(intervalMs) || intervalMs < 0) throw new Error('CNC_PAGES_VERIFY_INTERVAL_MS不能为负数');

const report = {
  checkedAt: new Date().toISOString(),
  publicRoot,
  mainRoot,
  expectedSiteBuild,
  expectedPwaBuild,
  previousPublicPwaBuild,
  eventName,
  attempts: [],
  resources: {}
};

function digest(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function withNonce(url) {
  const target = new URL(url);
  target.searchParams.set('verify-training-camp-route-handoff', `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return target.toString();
}

async function fetchBytes(url, label) {
  const response = await fetch(withNonce(url), {
    cache: 'no-store',
    redirect: 'follow',
    headers: {
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
      'User-Agent': 'cnc-training-camp-route-handoff-pages-smoke'
    }
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!response.ok) throw new Error(`${label} HTTP ${response.status}: ${buffer.toString('utf8', 0, 180)}`);
  return {
    buffer,
    status: response.status,
    bytes: buffer.length,
    sha256: digest(buffer),
    finalUrl: response.url,
    cacheControl: response.headers.get('cache-control'),
    lastModified: response.headers.get('last-modified'),
    etag: response.headers.get('etag')
  };
}

function summary(value) {
  return {
    status: value.status,
    bytes: value.bytes,
    sha256: value.sha256,
    finalUrl: value.finalUrl,
    cacheControl: value.cacheControl,
    lastModified: value.lastModified,
    etag: value.etag
  };
}

function exact(left, right) {
  return left.bytes === right.bytes && left.sha256 === right.sha256;
}

function requireTokens(text, label, tokens) {
  for (const token of tokens) {
    if (!text.includes(token)) throw new Error(`${label}缺少契约：${token}`);
  }
}

function assertTrainingCamp(text, label) {
  requireTokens(text, label, [
    '<title>12关CNC新手训练营',
    'id="placement-handoff"',
    'role="region"',
    'aria-live="polite"',
    'aria-atomic="true"',
    'aria-labelledby="placement-handoff-title"',
    "const PLACEMENT_HANDOFF_KEY='cnc_beginner_placement_route_handoff_v1'",
    'const PLACEMENT_HANDOFF_TTL_MS=5*60*1000',
    'const PLACEMENT_ROUTE_CATALOG=Object.freeze({',
    "'critical-safety':Object.freeze({title:'从第1关：安全基础开始'",
    "'low-score':Object.freeze({title:'从第1关：安全基础开始'",
    "'foundation-gap':Object.freeze({title:'从坐标、对刀与刀补开始'",
    "'advanced-ready':Object.freeze({title:'进入程序验证与首件检查'",
    'function payloadMatchesCanonicalRoute(data,canonical)',
    'const canonical=PLACEMENT_ROUTE_CATALOG[data.decision]',
    "if(!payloadMatchesCanonicalRoute(data,canonical))return handoffOutcome('invalid')",
    "return handoffOutcome('consumed',{decision:data.decision,title:canonical.title,route:canonical.route,href:canonical.href",
    'sessionStorage.getItem(PLACEMENT_HANDOFF_KEY)',
    'sessionStorage.removeItem(PLACEMENT_HANDOFF_KEY)',
    'steps.replaceChildren()',
    'document.createTextNode(step.title)',
    'title.textContent=outcome.data.title',
    'copy.textContent=outcome.data.route',
    "window.addEventListener('pagehide',clearConsumedHandoffView)",
    'event.persisted&&placementHandoffConsumed',
    '不会写入成绩、XP、成长档案或错题记录',
    '测评推荐不代表现场上机许可',
    '不能替代机床原厂手册',
    '上机授权和现场监护'
  ]);

  const removeIndex = text.indexOf('sessionStorage.removeItem(PLACEMENT_HANDOFF_KEY)');
  const parseIndex = text.indexOf('JSON.parse(raw)');
  if (removeIndex < 0 || parseIndex < 0 || removeIndex > parseIndex) {
    throw new Error(`${label}必须在解析前删除一次性交接键`);
  }

  const renderStart = text.indexOf('function renderHandoffSteps');
  const renderEnd = text.indexOf('function clearConsumedHandoffView');
  if (renderStart < 0 || renderEnd <= renderStart) throw new Error(`${label}无法定位临时路线渲染区`);
  const renderBlock = text.slice(renderStart, renderEnd);
  if (renderBlock.includes('.innerHTML')) throw new Error(`${label}临时路线渲染不得使用innerHTML`);
  requireTokens(renderBlock, `${label}临时路线渲染区`, [
    'replaceChildren',
    'document.createElement',
    'document.createTextNode',
    '.textContent'
  ]);

  for (const forbidden of [
    'localStorage.getItem(PLACEMENT_HANDOFF_KEY)',
    'localStorage.setItem(PLACEMENT_HANDOFF_KEY',
    'indexedDB.open(PLACEMENT_HANDOFF_KEY',
    'sessionStorage.setItem(PLACEMENT_HANDOFF_KEY',
    'location.search=PLACEMENT_HANDOFF_KEY',
    'location.hash=PLACEMENT_HANDOFF_KEY',
    '绕过安全门联锁',
    '固定上机值'
  ]) {
    if (text.includes(forbidden)) throw new Error(`${label}出现禁止内容：${forbidden}`);
  }
}

function hasCourseCore(build) {
  return [previousPublicPwaBuild, expectedPwaBuild].includes(build);
}

function expectedCore(build) {
  const core = [
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
  if (hasCourseCore(build)) {
    core.splice(7, 0,
      './course-safety-foundation.html',
      './course-coordinate-axes.html',
      './course-g00-g01-basics.html'
    );
  }
  if (build === expectedPwaBuild) core.push('./learning-sublesson-catalog.js', './learning-depth.css', './learning-detail.html');
  return core;
}

function assertServiceWorker(text, label, build) {
  requireTokens(text, label, [
    `const BUILD = '${build}'`,
    "const STATIC_CACHE = `cnc-static-${BUILD}`",
    "const RUNTIME_CACHE = `cnc-runtime-${BUILD}`",
    'const REQUIRED_CORE_PATHS = [',
    "'./training-camp.html'",
    "name.startsWith('cnc-') && !name.endsWith(BUILD)"
  ]);
  if (hasCourseCore(build)) {
    requireTokens(text, label, [
      "'./course-safety-foundation.html'",
      "'./course-coordinate-axes.html'",
      "'./course-g00-g01-basics.html'"
    ]);
  }
  const block = text.match(/const REQUIRED_CORE_PATHS = \[([\s\S]*?)\];/)?.[1] || '';
  const core = [...block.matchAll(/'([^']+)'/g)].map(match => match[1]);
  const expected = expectedCore(build);
  if (JSON.stringify(core) !== JSON.stringify(expected) || new Set(core).size !== expected.length) {
    throw new Error(`${label}核心资源不一致：${JSON.stringify(core)}，期望${JSON.stringify(expected)}`);
  }
}

function parseBuildInfo(text, label) {
  let data;
  try {
    data = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new Error(`${label}不是合法JSON：${error.message}`);
  }
  if (data.app !== 'cnc-training-platform') throw new Error(`${label}应用标识错误`);
  if (data.scope !== '/cnc/') throw new Error(`${label}作用域错误：${data.scope}`);
  if (data.build !== expectedSiteBuild) throw new Error(`${label}站点构建错误：${data.build}`);
  if (![previousPublicPwaBuild, expectedPwaBuild].includes(data.pwaBuild)) throw new Error(`${label}PWA构建未受控：${data.pwaBuild}`);
  requireTokens(String(data.contentStage || ''), label, ['测评路线一次性交接', '训练营路线离线核心', 'PWA可靠性']);
  if (data.pwaBuild === expectedPwaBuild) requireTokens(String(data.contentStage || ''), label, ['测评首步课程离线核心', '正式课程开发占位清零']);
  return data;
}

function assertContract(resource, text, label, build) {
  if (resource.endsWith('training-camp.html')) return assertTrainingCamp(text, label);
  if (resource.endsWith('sw.js')) return assertServiceWorker(text, label, build);
  if (resource.endsWith('build-info.json')) {
    const data = parseBuildInfo(text, label);
    if (data.pwaBuild !== build) throw new Error(`${label}PWA构建错误：${data.pwaBuild}，期望${build}`);
    return data;
  }
  throw new Error(`未知资源：${resource}`);
}

async function waitForMainPagesMatch() {
  let latest = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const record = { attempt, at: new Date().toISOString(), resources: {} };
    try {
      let allMatch = true;
      const values = {};
      for (const resource of resources) {
        const main = await fetchBytes(`${mainRoot}/${resource}`, `main ${resource}`);
        const pages = await fetchBytes(`${publicRoot}/${resource}`, `Pages ${resource}`);
        const matched = exact(main, pages);
        values[resource] = { main, pages, matched };
        record.resources[resource] = { matched, main: summary(main), pages: summary(pages) };
        if (!matched) allMatch = false;
      }
      report.attempts.push(record);
      latest = values;
      if (allMatch) return values;
    } catch (error) {
      record.error = error.message;
      report.attempts.push(record);
    }
    if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  report.latest = latest
    ? Object.fromEntries(Object.entries(latest).map(([key, value]) => [key, {
        matched: value.matched,
        main: summary(value.main),
        pages: summary(value.pages)
      }]))
    : null;
  throw new Error('训练营一次性路线资源尚未与main在Pages公网逐字节一致');
}

(async () => {
  const reportPath = path.join(out, 'report.json');
  const findingsPath = path.join(out, 'findings.txt');
  try {
    const deployed = await waitForMainPagesMatch();
    const findings = [];
    let localMatchesMain = true;

    const mainBuildData = parseBuildInfo(deployed['cnc/build-info.json'].main.buffer.toString('utf8'), 'main cnc/build-info.json');
    const pagesBuildData = parseBuildInfo(deployed['cnc/build-info.json'].pages.buffer.toString('utf8'), 'Pages cnc/build-info.json');
    if (mainBuildData.pwaBuild !== pagesBuildData.pwaBuild) throw new Error('main与Pages PWA构建标记不一致');
    const publicPwaBuild = mainBuildData.pwaBuild;

    for (const resource of resources) {
      const localBuffer = fs.readFileSync(path.join(root, resource));
      const local = {
        buffer: localBuffer,
        bytes: localBuffer.length,
        sha256: digest(localBuffer),
        status: 200,
        finalUrl: `file://${path.join(root, resource)}`
      };
      const pair = deployed[resource];
      assertContract(resource, localBuffer.toString('utf8'), `当前分支 ${resource}`, expectedPwaBuild);
      assertContract(resource, pair.main.buffer.toString('utf8'), `main ${resource}`, publicPwaBuild);
      assertContract(resource, pair.pages.buffer.toString('utf8'), `Pages ${resource}`, publicPwaBuild);

      const localMatch = exact(local, pair.main);
      if (!localMatch) localMatchesMain = false;
      report.resources[resource] = {
        local: { bytes: local.bytes, sha256: local.sha256 },
        main: summary(pair.main),
        pages: summary(pair.pages),
        mainPagesExactBytesMatch: true,
        mainPagesExactSha256Match: true,
        localMatchesMain: localMatch
      };
      findings.push(`${resource}｜Pages ${pair.pages.bytes} bytes｜${pair.pages.sha256}｜分支与main一致=${localMatch}`);
    }

    const branchDeploymentPending = !localMatchesMain;
    if (eventName !== 'pull_request' && branchDeploymentPending) {
      throw new Error('main正式验收不允许当前分支与main/Pages仍不一致');
    }
    if (!branchDeploymentPending && publicPwaBuild !== expectedPwaBuild) throw new Error('分支与main一致时公网必须已经是PWA10');

    report.verified = {
      publicReachable: true,
      mainPagesExactBytesMatch: true,
      mainPagesExactSha256Match: true,
      localMatchesMain,
      branchDeploymentPending,
      siteBuild: expectedSiteBuild,
      pwaBuild: expectedPwaBuild,
      publicPwaBuild,
      trainingCampPublic: true,
      oneTimeRouteConsumerPresent: true,
      consumeBeforeParsePresent: true,
      canonicalRouteIntegrityPresent: true,
      plainTextRenderingPresent: true,
      bfcacheClearingPresent: true,
      sessionStorageOnlyHandoffPresent: true,
      noLongTermHandoffWrite: true,
      trainingCampInCoreCache: true,
      placementFirstStepCoursesInCoreCache: true,
      coreResourceCount: expectedCore(expectedPwaBuild).length,
      recommendationBoundaryVisible: true,
      manualBoundaryVisible: true,
      authorizationBoundaryVisible: true
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(findingsPath, [
      '训练营Pages公网可达：是',
      'main与Pages三项资源逐字节一致：是',
      `站点构建：${expectedSiteBuild}`,
      `分支PWA构建：${expectedPwaBuild}`,
      `公网PWA构建：${publicPwaBuild}`,
      `分支待合并或待部署：${branchDeploymentPending ? '是' : '否'}`,
      '一次性交接键先删除后解析：已验证',
      '四种分类与唯一受控路线完整匹配：已验证',
      '临时路线纯文本渲染、无innerHTML：已验证',
      'BFCache返回清理与SessionStorage-only：已验证',
      '训练营与三类测评首步课程进入14项核心预缓存：已验证',
      '原厂手册、上机授权与现场监护边界：可见',
      ...findings
    ].join('\n') + '\n');

    console.log(`CNC training camp route handoff Pages verified: ${expectedSiteBuild} / branch ${expectedPwaBuild} / public ${publicPwaBuild} / pending=${branchDeploymentPending}`);
  } catch (error) {
    report.error = String(error && error.stack || error);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(findingsPath, report.error + '\n');
    throw error;
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
