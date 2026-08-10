const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const resultsDir = path.join(root, 'cnc/test-results/ai-teacher-offline-core-pages');
fs.mkdirSync(resultsDir, { recursive: true });

const publicRoot = (process.env.CNC_PAGES_URL || 'https://panxiangbin.github.io/yuhua').replace(/\/+$/, '');
const mainRoot = (process.env.CNC_MAIN_RAW_ROOT || 'https://raw.githubusercontent.com/panxiangbin/yuhua/main').replace(/\/+$/, '');
const branchTargetPwaBuild = '20260810-pwa34';
const previousPublicPwaBuild = '20260810-pwa33';
const expectedSiteBuild = '20260806-learning-depth1';
const previousPublicSiteBuild = '20260806-learning-depth1';
const cacheRevisionByBuild = {
  [branchTargetPwaBuild]: '20260810-learning34',
  [previousPublicPwaBuild]: '20260810-learning33'
};
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

const BASE_CORE_PATHS = [
  './index.html',
  './homepage-refresh.css',
  './homepage-refresh-desktop-legacy.css',
  './mobile-home-refactor.css',
  './personal-home.js',
  './training-practice.js',
  './training-profile.js',
  './search-aliases.js',
  './gm-code-complete.js',
  './learning-content-data.js',
  './learning-sublesson-catalog.js','./learning-sublesson-specificity.js',
  './learning-depth.css',
  './learning-detail.html',
  './mobile-trust-nav.js',
  './featured-images-supplement.js',
  './offline.html',
  './pwa-status.html',
  './pwa-self-test.html',
  './pages-status.html',
  './beginner-placement.html',
  './training-camp.html',
  './course-safety-foundation.html',
  './course-coordinate-axes.html',
  './course-g00-g01-basics.html',
  './ai-teacher.html',
  './ai-teacher-intake.html',
  './ai-teacher-explainability.html',
  './build-info.json',
  './assets/images/batch01_core/beginner-machine-zero-vs-work-zero-001.webp',
  './assets/images/batch02_operation_basics/machine-init-flow-001.webp',
  './assets/images/batch04_milling_tooling/milling-process-overview-001.webp',
  './assets/images/batch01_core/measure-reading-set-001.webp',
  './assets/images/batch05_alarm_drawing_material/dial-indicator-detail-001.webp',
  './assets/images/batch04_milling_tooling/vise-clamping-basic-001.webp',
  './assets/images/batch04_milling_tooling/tool-selection-beginner-001.webp',
  './assets/images/batch04_milling_tooling/bt-er-holder-overview-001.webp',
  './assets/images/batch02_operation_basics/single-block-dry-run-001.webp',
  './assets/images/batch04_milling_tooling/milling-contour-001.webp',
  './assets/images/batch02_operation_basics/canned-cycle-overview-001.webp',
  './assets/images/batch05_alarm_drawing_material/first-piece-inspection-001.webp'
];
const VIDEO_CORE_PATHS = [
  './assets/videos/learning/stage01_safety.mp4',
  './assets/videos/learning/stage02_xyz.mp4',
  './assets/videos/learning/stage03_z_tool.mp4',
  './assets/videos/learning/stage04_program.mp4',
  './assets/videos/learning/stage05_g90_g91.mp4',
  './assets/videos/learning/stage06_g00_g01.mp4',
  './assets/videos/learning/stage07_sf.mp4',
  './assets/videos/learning/stage08_g02_g03.mp4',
  './assets/videos/learning/stage09_milling_direction.mp4',
  './assets/videos/learning/stage10_g41_g42.mp4',
  './assets/videos/learning/stage11_g81_g83.mp4',
  './assets/videos/learning/stage12_first_part.mp4'
];
const EXACT_CORE_PATHS = [...BASE_CORE_PATHS, ...VIDEO_CORE_PATHS];
const PREVIOUS_PUBLIC_CORE_PATHS = EXACT_CORE_PATHS;

const LEARNING_DEPTH_CORE_PATHS = new Set([
  './learning-sublesson-catalog.js',
  './learning-depth.css',
  './learning-detail.html'
]);

function expectedCoreForBuild(build, label) {
  if (build === branchTargetPwaBuild) return EXACT_CORE_PATHS;
  if (build === previousPublicPwaBuild) return PREVIOUS_PUBLIC_CORE_PATHS;
  throw new Error(`${label}出现未受控核心资源构建：${build}`);
}

const PREVIOUS_PUBLIC_SELF_TEST_PATHS = PREVIOUS_PUBLIC_CORE_PATHS;

const diagnostics = {
  checkedAt: new Date().toISOString(),
  publicRoot,
  mainRoot,
  branchTargetPwaBuild,
  previousPublicPwaBuild,
  expectedSiteBuild,
  previousPublicSiteBuild,
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

function expectedCacheRevision(build, label) {
  const revision = cacheRevisionByBuild[build];
  if (!revision) throw new Error(`${label}出现未受控缓存修订对应关系：${build}`);
  return revision;
}

function expectedSiteBuildFor(build, label) {
  if (build === branchTargetPwaBuild) return expectedSiteBuild;
  if (build === previousPublicPwaBuild) return previousPublicSiteBuild;
  throw new Error(`${label}出现未受控站点/PWA构建组合：${build}`);
}

function parseQuotedArray(text, pattern, label) {
  const block = text.match(pattern)?.[1] || '';
  const values = [...block.matchAll(/(['"])(.*?)\1/g)].map(match => match[2]);
  if (!values.length) throw new Error(`${label}未读取到资源清单`);
  if (new Set(values).size !== values.length) throw new Error(`${label}资源清单存在重复项`);
  return values;
}

function assertExactArray(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label}资源清单不一致：${JSON.stringify(actual)}，期望${JSON.stringify(expected)}`);
}

function assertServiceWorker(text, label, expectedBuild) {
  const expectedCache = expectedCacheRevision(expectedBuild, label);
  requireTokens(text, label, [
    `const BUILD = '${expectedBuild}'`,
    `const CACHE_REVISION = '${expectedCache}'`,
    "const STATIC_CACHE = `cnc-static-${CACHE_REVISION}`",
    "const RUNTIME_CACHE = `cnc-runtime-${CACHE_REVISION}`",
    './beginner-placement.html',
    './training-camp.html',
    './ai-teacher.html',
    './ai-teacher-intake.html',
    './ai-teacher-explainability.html',
    "'./pwa-self-test.html'",
    "'./pwa-status.html'",
    "'./build-info.json'",
    "name.startsWith('cnc-') && name !== STATIC_CACHE && name !== RUNTIME_CACHE",
    "event.data.type === 'GET_BUILD'",
    'cacheRevision: CACHE_REVISION',
    "event.data.type === 'ENSURE_CACHES'"
  ]);
  if (expectedBuild === branchTargetPwaBuild) requireTokens(text, label, ["'./training-practice.js'", "'./training-profile.js'", "'./learning-content-data.js'", ...VIDEO_CORE_PATHS.map(item => `'${item}'`)]);
  forbidTokens(text, label, [/test\.skip\(/, /describe\.skip\(/, /it\.skip\(/, /allowOperationalUse\s*:\s*true/]);
  const actual = parseQuotedArray(text, /const REQUIRED_CORE_PATHS = \[([\s\S]*?)\];/, `${label}核心缓存`);
  assertExactArray(actual, expectedCoreForBuild(expectedBuild, label), `${label}核心缓存`);
  return { build: expectedBuild, cacheRevision: expectedCache, corePaths: actual };
}

function parseBuildInfo(text, label) {
  let data;
  try { data = JSON.parse(text.replace(/^\uFEFF/, '')); } catch (error) { throw new Error(`${label}不是合法JSON：${error.message}`); }
  if (data.app !== 'cnc-training-platform') throw new Error(`${label}应用标识错误：${data.app}`);
  assertAllowedBuild(data.pwaBuild, label);
  const controlledSiteBuild = expectedSiteBuildFor(data.pwaBuild, label);
  if (data.build !== controlledSiteBuild) throw new Error(`${label}站点构建错误：${data.build}，期望${controlledSiteBuild}`);
  const expectedCache = expectedCacheRevision(data.pwaBuild, label);
  if (data.cacheRevision !== expectedCache) throw new Error(`${label}缓存修订错误：${data.cacheRevision}，期望${expectedCache}`);
  if (data.scope !== '/cnc/') throw new Error(`${label}作用域错误：${data.scope}`);
  return data;
}

function assertBuildInfo(text, label, expectedBuild) {
  const data = parseBuildInfo(text, label);
  if (data.pwaBuild !== expectedBuild) throw new Error(`${label}PWA构建错误：${data.pwaBuild}，期望${expectedBuild}`);
  const stage = String(data.contentStage || '');
  requireTokens(stage, label, ['课程12关', '起点测评', '手机首页一屏化', 'AI CNC老师基础版', 'PWA可靠性']);
  if (expectedBuild === branchTargetPwaBuild) {
    requireTokens(stage, label, ['起点测评关键安全门禁', '起点测评离线核心', '测评路线一次性交接', '训练营路线离线核心', '测评首步课程离线核心', '正式课程开发占位清零', 'AI老师现场问诊单', 'AI老师判断说明', 'AI老师离线核心', 'AI老师学习档案异常保护', '80个图文小课', '学习目录紧凑布局', '80课现场动作与风险针对性', '训练题库与成长档案离线核心', '手机构建标记一致性', '固定12关能力映射与真实薄弱课推荐', 'AI老师与固定12关成长档案语义一致', '每日训练薄弱课错题精准回流', '固定12关60题真实80分与关键题硬门禁', 'AI老师课程完成以真实完成记录为准', '成长档案今日训练奖励以真实课程完成记录为准', 'G00快速定位与安全撤离适用范围', '12关主课程数据首次安装离线核心', 'T/H刀长补偿映射适用范围','G10可编程数据写入适用范围','G/M代码首次安装离线核心','G28参考点返回适用范围','G53机床坐标定位适用范围','G92车铣双语义适用范围']);
  }
  return { build: data.build, pwaBuild: data.pwaBuild, cacheRevision: data.cacheRevision, scope: data.scope };
}

function visibleBody(text) {
  const body = text.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || '';
  return body.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function assertStatusPage(text, label, expectedBuild) {
  const expectedCache = expectedCacheRevision(expectedBuild, label);
  const required = [
    `const EXPECTED='${expectedBuild}'`,
    '页面、Service Worker与两类缓存版本一致',
    '新手起点测评',
    'AI CNC老师',
    '现场问诊单',
    '判断说明页',
    'pageshow',
    'visibilitychange'
  ];
  let previousCacheContract = false;
  if (expectedBuild === branchTargetPwaBuild) {
    required.push(`const EXPECTED_CACHE='${expectedCache}'`, 'PWA23在PWA22薄弱课错题精准回流基础上，把固定12关闯关题扩展为每关5道专属题、共60题，使4/5可以真实形成80分', '不能假定轨迹必然为固定直线或固定折线', '不能把“先Z后XY”教成所有机床通用规则', '12关主课程数据', 'T/H刀长补偿映射适用范围','G10可编程数据写入适用范围','G/M代码首次安装离线核心','G28参考点返回适用范围','G53机床坐标定位适用范围','G92车铣双语义适用范围');
  } else {
    required.push(`const EXPECTED_CACHE='${expectedCache}'`, 'const cacheBuildOk=staticName.includes(EXPECTED_CACHE)&&runtimeName.includes(EXPECTED_CACHE)');
    previousCacheContract = true;
  }
  requireTokens(text, label, required);
  const visible = visibleBody(text);
  const visibleTokens = ['离线、缓存与更新状态', '离线内容可能不是最新版本', '原厂手册、企业制度和现场条件', '测评和AI老师只用于学习训练'];
  requireTokens(visible, label, visibleTokens);
  return { build: expectedBuild, cacheRevision: expectedCache, previousCacheContract, visibleSafetyBoundary: true };
}

function assertSelfTest(text, label, expectedBuild) {
  const expectedCache = expectedCacheRevision(expectedBuild, label);
  const required = [
    `const EXPECTED='${expectedBuild}'`,
    './beginner-placement.html',
    './training-camp.html',
    './ai-teacher.html',
    './ai-teacher-intake.html',
    './ai-teacher-explainability.html',
    '核心离线资源完整',
    '公网构建标记与PWA一致',
    'MAX_AUTO_RETRIES=20'
  ];
  let expectedPaths;
  let previousCacheContract = false;
  if (expectedBuild === branchTargetPwaBuild) {
    required.push(`const EXPECTED_CACHE='${expectedCache}'`, 'marker.cacheRevision===EXPECTED_CACHE', 'PWA23在PWA22薄弱课错题精准回流基础上，把固定12关闯关题扩展为每关5道专属题、共60题，使4/5可以真实形成80分', './training-practice.js', './training-profile.js', './learning-content-data.js', '不能假定轨迹必然为固定直线或固定折线', '不能把“先Z后XY”教成所有机床通用规则', 'T/H刀长补偿映射适用范围','G10可编程数据写入适用范围','G/M代码首次安装离线核心','G28参考点返回适用范围','G53机床坐标定位适用范围','G92车铣双语义适用范围', ...VIDEO_CORE_PATHS);
    expectedPaths = EXACT_CORE_PATHS;
  } else {
    required.push(`const EXPECTED_CACHE='${expectedCache}'`, 'const staticName=keys.find(name=>name===`cnc-static-${EXPECTED_CACHE}`)', 'const runtimeName=keys.find(name=>name===`cnc-runtime-${EXPECTED_CACHE}`)', 'marker.cacheRevision===EXPECTED_CACHE');
    expectedPaths = expectedCoreForBuild(expectedBuild, label);
    previousCacheContract = true;
  }
  requireTokens(text, label, required);
  const actual = parseQuotedArray(text, /const REQUIRED=\[([\s\S]*?)\];/, `${label}自检核心资源`);
  assertExactArray(actual, expectedPaths, `${label}自检核心资源`);
  const visible = visibleBody(text);
  requireTokens(visible, label, ['只读检查', '不修改学习记录', '不清空缓存', '不发放XP', '起点测评只推荐学习路线', '高风险操作须现场师傅或授权人员指导']);
  return { build: expectedBuild, cacheRevision: expectedCache, requiredCount: actual.length, previousCacheContract, readOnly: true };
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
    if (mainBuildData.pwaBuild !== pagesBuildData.pwaBuild || mainBuildData.cacheRevision !== pagesBuildData.cacheRevision || mainBuildData.build !== pagesBuildData.build) throw new Error('main与Pages站点、PWA构建或缓存修订标记不一致');
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
      branchCacheRevision: cacheRevisionByBuild[branchTargetPwaBuild],
      publicSiteBuild: mainBuildData.build,
      publicPwaBuild,
      publicCacheRevision: cacheRevisionByBuild[publicPwaBuild],
      siteBuild: expectedSiteBuild,
      trainingPracticeInCoreCache: true,
      trainingProfileInCoreCache: true,
      mainLearningContentInCoreCache: true,
      beginnerPlacementInCoreCache: true,
      trainingCampInCoreCache: true,
      placementFirstStepCoursesInCoreCache: true,
      placementRouteHandoffInBranch: true,
      criticalSafetyGateInBranch: true,
      explainabilityInCoreCache: true,
      aiTeacherInCoreCache: true,
      intakeInCoreCache: true,
      localVideoCoreCount: VIDEO_CORE_PATHS.length,
      coreResourceCount: EXACT_CORE_PATHS.length,
      publicCoreResourcesVerified: true,
      upgradeBoundaryVisible: true,
      safetyBoundaryVisible: true
    };

    fs.writeFileSync(reportPath, JSON.stringify(diagnostics, null, 2));
    fs.writeFileSync(findingsPath, [
      'PWA离线核心Pages公网可达：是',
      'main与Pages四项资源逐字节一致：是',
      `当前分支站点/PWA构建/缓存修订：${expectedSiteBuild}/${branchTargetPwaBuild}/${cacheRevisionByBuild[branchTargetPwaBuild]}`,
      `main与Pages公网站点/PWA构建/缓存修订：${mainBuildData.build}/${publicPwaBuild}/${cacheRevisionByBuild[publicPwaBuild]}`,
      `分支待合并或待部署：${branchDeploymentPending ? '是' : '否'}`,
      `当前分支手机首页、训练题库、成长档案、12关主课程数据、12关图片、${VIDEO_CORE_PATHS.length}个本地课程视频、起点测评、训练营路线、三类测评首步课程、80课目录、AI老师、现场问诊单、判断说明页核心预缓存：完整`,
      `当前分支PWA自检核心资源：${EXACT_CORE_PATHS.length}项且无重复`,
      `当前公网PWA自检核心资源：${publicPwaBuild === previousPublicPwaBuild ? PREVIOUS_PUBLIC_SELF_TEST_PATHS.length : EXACT_CORE_PATHS.length}项且无重复`,
      '测评安全硬门禁、G00快速定位适用范围、T/H刀长补偿映射适用范围、路线隐私、固定值、原厂手册与授权人员边界：可见',
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
