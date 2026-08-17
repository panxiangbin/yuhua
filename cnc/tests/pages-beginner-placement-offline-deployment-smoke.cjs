const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'cnc/test-results/beginner-placement-offline-pages');
fs.mkdirSync(out, { recursive: true });

const publicRoot = (process.env.CNC_PAGES_URL || 'https://panxiangbin.github.io/yuhua').replace(/\/+$/, '');
const mainRoot = (process.env.CNC_MAIN_RAW_ROOT || 'https://raw.githubusercontent.com/panxiangbin/yuhua/main').replace(/\/+$/, '');
const branchTargetPwaBuild = '20260818-pwa52';
const currentMainPwaBuild = '20260817-pwa51';
const controlledPublicPwaBuild = '20260811-pwa37';
const expectedSiteBuild = '20260806-learning-depth1';
const controlledPublicSiteBuild = '20260806-learning-depth1';
const cacheRevisionByBuild = {
  [branchTargetPwaBuild]: '20260818-learning52',
  [currentMainPwaBuild]: '20260817-learning51',
  [controlledPublicPwaBuild]: '20260811-learning37'
};
const siteBuildByPwaBuild = {
  [branchTargetPwaBuild]: expectedSiteBuild,
  [currentMainPwaBuild]: expectedSiteBuild,
  [controlledPublicPwaBuild]: controlledPublicSiteBuild
};
const attempts = Number(process.env.CNC_PAGES_VERIFY_ATTEMPTS || 18);
const intervalMs = Number(process.env.CNC_PAGES_VERIFY_INTERVAL_MS || 10000);
const eventName = process.env.GITHUB_EVENT_NAME || '';
const resources = ['cnc/beginner-placement.html', 'cnc/sw.js', 'cnc/build-info.json'];
const BASE_CORE = [
  './index.html','./homepage-refresh.css','./homepage-refresh-desktop-legacy.css','./mobile-home-refactor.css','./personal-home.js','./training-practice.js','./training-profile.js','./search-aliases.js','./gm-code-complete.js','./learning-content-data.js','./learning-sublesson-catalog.js','./learning-sublesson-specificity.js','./learning-depth.css','./learning-detail.html','./mobile-trust-nav.js','./featured-images-supplement.js','./offline.html','./pwa-status.html','./pwa-self-test.html','./pages-status.html','./beginner-placement.html','./training-camp.html','./course-safety-foundation.html','./course-coordinate-axes.html','./course-g00-g01-basics.html','./ai-teacher.html','./ai-teacher-intake.html','./ai-teacher-explainability.html','./build-info.json','./assets/images/batch01_core/beginner-machine-zero-vs-work-zero-001.webp','./assets/images/batch02_operation_basics/machine-init-flow-001.webp','./assets/images/batch04_milling_tooling/milling-process-overview-001.webp','./assets/images/batch01_core/measure-reading-set-001.webp','./assets/images/batch05_alarm_drawing_material/dial-indicator-detail-001.webp','./assets/images/batch04_milling_tooling/vise-clamping-basic-001.webp','./assets/images/batch04_milling_tooling/tool-selection-beginner-001.webp','./assets/images/batch04_milling_tooling/bt-er-holder-overview-001.webp','./assets/images/batch02_operation_basics/single-block-dry-run-001.webp','./assets/images/batch04_milling_tooling/milling-contour-001.webp','./assets/images/batch02_operation_basics/canned-cycle-overview-001.webp','./assets/images/batch05_alarm_drawing_material/first-piece-inspection-001.webp'
];
const VIDEO_CORE = [
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
const EXACT_CORE = [...BASE_CORE, ...VIDEO_CORE];
const CONTROLLED_PUBLIC_CORE_PATHS = EXACT_CORE;

const LEARNING_DEPTH_CORE_PATHS = new Set([
  './learning-sublesson-catalog.js',
  './learning-depth.css',
  './learning-detail.html'
]);

function expectedCoreForBuild(build, label) {
  if (build === branchTargetPwaBuild) return EXACT_CORE;
  if (build === currentMainPwaBuild) return CONTROLLED_PUBLIC_CORE_PATHS;
  if (build === controlledPublicPwaBuild) return CONTROLLED_PUBLIC_CORE_PATHS;
  throw new Error(`${label}出现未受控核心资源构建：${build}`);
}

if (!Number.isInteger(attempts) || attempts < 1) throw new Error('CNC_PAGES_VERIFY_ATTEMPTS必须是大于0的整数');
if (!Number.isFinite(intervalMs) || intervalMs < 0) throw new Error('CNC_PAGES_VERIFY_INTERVAL_MS不能为负数');

const report = { checkedAt: new Date().toISOString(), publicRoot, mainRoot, branchTargetPwaBuild, currentMainPwaBuild, controlledPublicPwaBuild, expectedSiteBuild, controlledPublicSiteBuild, eventName, attempts: [], resources: {} };
const digest = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const exact = (left, right) => left.bytes === right.bytes && left.sha256 === right.sha256;

function withNonce(url) {
  const target = new URL(url);
  target.searchParams.set('verify-beginner-placement-offline', `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return target.toString();
}

async function fetchBytes(url, label) {
  const response = await fetch(withNonce(url), { cache: 'no-store', redirect: 'follow', headers: { 'Cache-Control': 'no-cache, no-store, max-age=0', Pragma: 'no-cache', 'User-Agent': 'cnc-beginner-placement-offline-pages-smoke' } });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!response.ok) throw new Error(`${label} HTTP ${response.status}: ${buffer.toString('utf8', 0, 180)}`);
  return { buffer, status: response.status, bytes: buffer.length, sha256: digest(buffer), finalUrl: response.url, cacheControl: response.headers.get('cache-control'), lastModified: response.headers.get('last-modified'), etag: response.headers.get('etag') };
}

function summary(value) {
  return { status: value.status, bytes: value.bytes, sha256: value.sha256, finalUrl: value.finalUrl, cacheControl: value.cacheControl, lastModified: value.lastModified, etag: value.etag };
}

function requireTokens(text, label, tokens) {
  for (const token of tokens) if (!text.includes(token)) throw new Error(`${label}缺少契约：${token}`);
}

function expectedCache(build, label) {
  const cache = cacheRevisionByBuild[build];
  if (!cache) throw new Error(`${label}出现未受控PWA构建：${build}`);
  return cache;
}

function expectedSite(build, label) {
  const site = siteBuildByPwaBuild[build];
  if (!site) throw new Error(`${label}出现未受控站点/PWA构建组合：${build}`);
  return site;
}

function parseBuildInfo(text, label) {
  let data;
  try { data = JSON.parse(text.replace(/^\uFEFF/, '')); } catch (error) { throw new Error(`${label}不是合法JSON：${error.message}`); }
  if (data.app !== 'cnc-training-platform') throw new Error(`${label}应用标识错误`);
  if (data.build !== expectedSite(data.pwaBuild, label)) throw new Error(`${label}站点构建错误：${data.build}`);
  if (data.scope !== '/cnc/') throw new Error(`${label}作用域错误：${data.scope}`);
  if (data.cacheRevision !== expectedCache(data.pwaBuild, label)) throw new Error(`${label}缓存修订错误：${data.cacheRevision}`);
  return data;
}

function assertPlacement(text, label) {
  requireTokens(text, label, ['<title>CNC新手起点测评','id="progress"','role="progressbar"','id="options"','role="radiogroup"','测评只做推荐','不改动你的成绩、XP或通关记录','相同版本原厂手册','授权人员确认','id="result-diagnostics"','criticalFailures',"decision:'critical-safety'",'关键安全项是硬门禁','不会被其他题的高分抵消','不是现场上机许可','cnc_beginner_placement_route_handoff_v1','把本次路线带到训练营','sessionStorage.setItem(HANDOFF_KEY']);
  for (const forbidden of ['localStorage.setItem', 'indexedDB.open', '固定上机值', '绕过安全门联锁']) if (text.includes(forbidden)) throw new Error(`${label}出现禁止内容：${forbidden}`);
}

function assertServiceWorker(text, label, build) {
  const cache = expectedCache(build, label);
  requireTokens(text, label, [`const BUILD = '${build}'`,`const CACHE_REVISION = '${cache}'`,"const STATIC_CACHE = `cnc-static-${CACHE_REVISION}`","const RUNTIME_CACHE = `cnc-runtime-${CACHE_REVISION}`","name.startsWith('cnc-') && name !== STATIC_CACHE && name !== RUNTIME_CACHE","'./beginner-placement.html'","'./training-camp.html'","'./course-safety-foundation.html'","'./course-coordinate-axes.html'","'./course-g00-g01-basics.html'","'./ai-teacher.html'","'./ai-teacher-intake.html'","'./ai-teacher-explainability.html'"]);
  if (build === branchTargetPwaBuild) requireTokens(text, label, ["'./training-practice.js'", "'./training-profile.js'", "'./learning-content-data.js'", ...VIDEO_CORE.map(item => `'${item}'`)]);
  const block = text.match(/const REQUIRED_CORE_PATHS = \[([\s\S]*?)\];/)?.[1] || '';
  const core = [...block.matchAll(/'([^']+)'/g)].map(match => match[1]);
  const expectedCore = expectedCoreForBuild(build, label);
  if (JSON.stringify(core) !== JSON.stringify(expectedCore) || new Set(core).size !== expectedCore.length) throw new Error(`${label}核心资源不一致：${JSON.stringify(core)}，期望${JSON.stringify(expectedCore)}`);
}

function assertBuildInfo(text, label, build) {
  const data = parseBuildInfo(text, label);
  if (data.pwaBuild !== build) throw new Error(`${label}PWA构建错误：${data.pwaBuild}，期望${build}`);
  const stage = String(data.contentStage || '');
  requireTokens(stage, label, ['课程12关','起点测评','手机首页一屏化','AI CNC老师基础版','PWA可靠性']);
  if (build === branchTargetPwaBuild) requireTokens(stage, label, ['起点测评关键安全门禁','起点测评离线核心','测评路线一次性交接','训练营路线离线核心','测评首步课程离线核心','正式课程开发占位清零','AI老师现场问诊单','AI老师判断说明','AI老师离线核心','AI老师学习档案异常保护','80个图文小课','训练题库与成长档案离线核心','手机构建标记一致性','固定12关能力映射与真实薄弱课推荐','AI老师与固定12关成长档案语义一致','每日训练薄弱课错题精准回流','固定12关60题真实80分与关键题硬门禁','AI老师课程完成以真实完成记录为准','成长档案今日训练奖励以真实课程完成记录为准','G00快速定位与安全撤离适用范围','12关主课程数据首次安装离线核心','T/H刀长补偿映射适用范围','G10可编程数据写入适用范围','G/M代码首次安装离线核心','G28参考点返回适用范围','G53机床坐标定位适用范围','G92车铣双语义适用范围']);
}

function assertContract(resource, text, label, build) {
  if (resource.endsWith('beginner-placement.html')) return assertPlacement(text, label);
  if (resource.endsWith('sw.js')) return assertServiceWorker(text, label, build);
  if (resource.endsWith('build-info.json')) return assertBuildInfo(text, label, build);
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
  report.latest = latest ? Object.fromEntries(Object.entries(latest).map(([key, value]) => [key, { matched: value.matched, main: summary(value.main), pages: summary(value.pages) }])) : null;
  throw new Error('起点测评离线核心资源尚未与main在Pages公网逐字节一致');
}

(async () => {
  const reportPath = path.join(out, 'report.json');
  const findingsPath = path.join(out, 'findings.txt');
  try {
    const deployed = await waitForMainPagesMatch();
    const localBuffers = Object.fromEntries(resources.map(resource => [resource, fs.readFileSync(path.join(root, resource))]));
    const localBuild = parseBuildInfo(localBuffers['cnc/build-info.json'].toString('utf8'), '当前分支 cnc/build-info.json');
    if (localBuild.pwaBuild !== branchTargetPwaBuild) throw new Error(`当前分支目标PWA构建错误：${localBuild.pwaBuild}`);
    const mainBuild = parseBuildInfo(deployed['cnc/build-info.json'].main.buffer.toString('utf8'), 'main cnc/build-info.json');
    const pagesBuild = parseBuildInfo(deployed['cnc/build-info.json'].pages.buffer.toString('utf8'), 'Pages cnc/build-info.json');
    if (mainBuild.pwaBuild !== pagesBuild.pwaBuild || mainBuild.cacheRevision !== pagesBuild.cacheRevision || mainBuild.build !== pagesBuild.build) throw new Error('main与Pages站点、PWA构建或缓存修订不一致');
    const publicPwaBuild = mainBuild.pwaBuild;

    let localMatchesMain = true;
    const findings = [];
    for (const resource of resources) {
      const localBuffer = localBuffers[resource];
      const local = { buffer: localBuffer, bytes: localBuffer.length, sha256: digest(localBuffer), status: 200, finalUrl: `file://${path.join(root, resource)}` };
      const pair = deployed[resource];
      assertContract(resource, localBuffer.toString('utf8'), `当前分支 ${resource}`, branchTargetPwaBuild);
      assertContract(resource, pair.main.buffer.toString('utf8'), `main ${resource}`, publicPwaBuild);
      assertContract(resource, pair.pages.buffer.toString('utf8'), `Pages ${resource}`, publicPwaBuild);
      const localMatch = exact(local, pair.main);
      if (!localMatch) localMatchesMain = false;
      report.resources[resource] = { local: { bytes: local.bytes, sha256: local.sha256 }, main: summary(pair.main), pages: summary(pair.pages), mainPagesExactBytesMatch: true, mainPagesExactSha256Match: true, localMatchesMain: localMatch };
      findings.push(`${resource}｜Pages ${pair.pages.bytes} bytes｜${pair.pages.sha256}｜分支与main一致=${localMatch}`);
    }
    const branchDeploymentPending = !localMatchesMain;
    if (eventName !== 'pull_request' && branchDeploymentPending) throw new Error('main正式验收不允许当前分支与main/Pages仍不一致');
    if (!branchDeploymentPending && publicPwaBuild !== branchTargetPwaBuild) throw new Error('分支与main一致时公网必须已经是目标PWA构建');
    report.verified = { publicReachable: true, mainPagesExactBytesMatch: true, mainPagesExactSha256Match: true, localMatchesMain, branchDeploymentPending, branchSiteBuild: expectedSiteBuild, branchPwaBuild: branchTargetPwaBuild, branchCacheRevision: cacheRevisionByBuild[branchTargetPwaBuild], publicSiteBuild: mainBuild.build, publicPwaBuild, publicCacheRevision: cacheRevisionByBuild[publicPwaBuild], beginnerPlacementPublic: true, trainingPracticeInCoreCache: true, trainingProfileInCoreCache: true, mainLearningContentInCoreCache: true, beginnerPlacementInCoreCache: true, trainingCampInCoreCache: true, placementFirstStepCoursesInCoreCache: true, localVideoCoreCount: VIDEO_CORE.length, coreResourceCount: EXACT_CORE.length, criticalSafetyGatePresent: true, explainableRecommendationPresent: true, oneTimeRouteHandoffPresent: true, recommendationBoundaryVisible: true, manualBoundaryVisible: true, authorizedPersonBoundaryVisible: true, noLongTermLearningWrite: true };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(findingsPath, ['起点测评Pages公网可达：是','main与Pages三项资源逐字节一致：是',`当前分支站点/PWA构建/缓存修订：${expectedSiteBuild}/${branchTargetPwaBuild}/${cacheRevisionByBuild[branchTargetPwaBuild]}`,`main与Pages公网站点/PWA构建/缓存修订：${mainBuild.build}/${publicPwaBuild}/${cacheRevisionByBuild[publicPwaBuild]}`,`分支待合并或待部署：${branchDeploymentPending ? '是' : '否'}`,`当前分支训练题库、成长档案、12关主课程数据、起点测评、训练营、三类首步课程、AI老师及${VIDEO_CORE.length}个本地课程视频进入${EXACT_CORE.length}项核心预缓存：是`,'关键安全项高分不能抵消危险答案：已验证','一次性路线交接、中文判断依据、原厂手册与授权人员边界：可见',...findings].join('\n') + '\n');
    console.log(`CNC beginner placement offline Pages verified: branch ${branchTargetPwaBuild} / public ${publicPwaBuild} / pending=${branchDeploymentPending}`);
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
