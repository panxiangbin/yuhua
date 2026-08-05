'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const CATALOG_PATH = path.join(ROOT, 'cnc', 'learning-sublesson-catalog.js');
const HOME_PATH = path.join(ROOT, 'cnc', 'personal-home.js');
const DETAIL_PATH = path.join(ROOT, 'cnc', 'learning-detail.html');
const DEPTH_STYLE_PATH = path.join(ROOT, 'cnc', 'learning-depth.css');
const CAMP_PATH = path.join(ROOT, 'cnc', 'training-camp.html');
const AI_TEACHER_PATH = path.join(ROOT, 'cnc', 'ai-teacher.html');
const WORKFLOW_PATH = path.join(ROOT, '.github', 'workflows', 'cnc-main-course-catalog-drift-smoke.yml');
const OUTPUT_DIR = path.join(ROOT, 'cnc', 'test-results', 'main-course-catalog-drift');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'report.json');

const report = {
  generatedAt: new Date().toISOString(),
  commitSha: process.env.GITHUB_SHA || null,
  passed: false,
  sources: {},
  homeCatalog: [],
  trainingCampCatalog: [],
  aiTeacherCourseLinks: [],
  canonicalCourses: [],
  redirectAliases: [],
  sublessonCounts: {},
  triggerCoverage: {},
  checks: {},
  errors: []
};

function fail(message) { throw new Error(message); }
function expect(condition, message) { if (!condition) fail(message); }
function sha256(source) { return crypto.createHash('sha256').update(source).digest('hex'); }
function rel(file) { return path.relative(ROOT, file).replaceAll(path.sep, '/'); }

function loadLearningCatalog(source) {
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: 'learning-sublesson-catalog.js', timeout: 3000 });
  const catalog = sandbox.window.CNC_LEARNING_SUBLESSONS;
  expect(catalog && typeof catalog === 'object', '学习小课目录未暴露window.CNC_LEARNING_SUBLESSONS');
  expect(Array.isArray(catalog.courses), '学习小课目录缺少courses');
  expect(catalog.courses.length === 12, `学习主线课程数量必须为12，实际${catalog.courses.length}`);
  expect(catalog.stages && typeof catalog.stages === 'object', '学习小课目录缺少stages');
  return catalog;
}

function parseTrainingCampCatalog(source) {
  const match = source.match(/\bconst\s+COURSES\s*=\s*\[([\s\S]*?)\n\s*\];/);
  expect(match, '训练营缺少可审计的COURSES目录');
  const entries = [];
  const pattern = /\{\s*id\s*:\s*'([^']+)'\s*,\s*title\s*:\s*'([^']+)'\s*,\s*file\s*:\s*'([^']+)'\s*,\s*reason\s*:\s*'([^']+)'\s*\}/g;
  for (const item of match[1].matchAll(pattern)) {
    entries.push({ id: item[1], title: item[2], file: item[3], reason: item[4] });
  }
  expect(entries.length === 12, `训练营课程数量必须为12，实际${entries.length}`);
  return entries;
}

function extractAiTeacherCourseLinks(source) {
  const match = source.match(/\bconst\s+COURSE_LINKS\s*=\s*\[([\s\S]*?)\];/);
  expect(match, 'AI CNC老师缺少可审计的COURSE_LINKS目录');
  const links = [];
  const pattern = /'\.\/(course-[a-z0-9-]+\.html)'/g;
  for (const item of match[1].matchAll(pattern)) links.push(item[1]);
  expect(links.length === 12, `AI CNC老师课程链接数量必须为12，实际${links.length}`);
  expect(new Set(links).size === 12, 'AI CNC老师课程链接存在重复');
  return links;
}

function normalizeTitle(value) {
  return String(value || '').replace(/\s+/g, '').replace(/[：:，,。！？!?、·（）()《》]/g, '');
}
function titlesCompatible(left, right) {
  const a = normalizeTitle(left);
  const b = normalizeTitle(right);
  return a === b || a.startsWith(b) || b.startsWith(a);
}

function extractRedirectTarget(source) {
  const refresh = source.match(/<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*?url=\.\/([^"'#?\s>]+)[^"']*["'][^>]*>/i)
    || source.match(/<meta[^>]+content=["'][^"']*?url=\.\/([^"'#?\s>]+)[^"']*["'][^>]+http-equiv=["']refresh["'][^>]*>/i);
  return refresh ? refresh[1] : '';
}

function inspectCourseTarget(file) {
  expect(/^course-[a-z0-9-]+\.html$/.test(file), `课程入口格式不受控：${file}`);
  const absolute = path.join(ROOT, 'cnc', file);
  expect(fs.existsSync(absolute), `课程入口不存在：cnc/${file}`);
  const source = fs.readFileSync(absolute, 'utf8');
  expect(/<!doctype html>/i.test(source) && /<html\b/i.test(source), `课程入口不是有效HTML：cnc/${file}`);
  expect(source.length > 300, `课程入口内容过短：cnc/${file}`);
  const redirectTarget = extractRedirectTarget(source);
  if (!redirectTarget) {
    expect(/<title>[^<]+<\/title>/i.test(source), `正式课程缺少标题：cnc/${file}`);
    return { requested: file, canonical: file, redirect: false };
  }
  expect(redirectTarget !== file, `兼容入口不得跳转到自身：cnc/${file}`);
  const targetAbsolute = path.join(ROOT, 'cnc', redirectTarget);
  expect(fs.existsSync(targetAbsolute), `兼容入口正式目标不存在：cnc/${file} -> cnc/${redirectTarget}`);
  const targetSource = fs.readFileSync(targetAbsolute, 'utf8');
  expect(!extractRedirectTarget(targetSource), `兼容入口不得形成二次跳转链：cnc/${file} -> cnc/${redirectTarget}`);
  expect(source.includes('原厂手册') && source.includes('授权人员'), `兼容入口缺少安全边界：cnc/${file}`);
  return { requested: file, canonical: redirectTarget, redirect: true };
}

function extractEventPaths(source, eventName) {
  const lines = source.split(/\r?\n/);
  const paths = [];
  let inEvent = false;
  let inPaths = false;
  for (const line of lines) {
    const eventMatch = line.match(/^  ([a-z_]+):\s*$/);
    if (eventMatch) {
      if (inEvent && eventMatch[1] !== eventName) break;
      inEvent = eventMatch[1] === eventName;
      inPaths = false;
      continue;
    }
    if (!inEvent) continue;
    if (/^    paths:\s*$/.test(line)) { inPaths = true; continue; }
    if (!inPaths) continue;
    const pathMatch = line.match(/^      - ['"]([^'"]+)['"]\s*$/);
    if (pathMatch) { paths.push(pathMatch[1]); continue; }
    if (/^    \S/.test(line)) break;
  }
  return paths;
}

function validateSublessons(catalog) {
  const expectedIds = Array.from({ length: 12 }, (_, index) => `stage-${index + 1}`);
  expect(JSON.stringify(catalog.courses.map(item => item.id)) === JSON.stringify(expectedIds), '学习主线ID或顺序漂移');
  const allIds = new Set();
  let total = 0;
  for (let stage = 1; stage <= 12; stage += 1) {
    const items = catalog.stages[String(stage)];
    expect(Array.isArray(items), `第${stage}关缺少小课数组`);
    const minimum = stage <= 2 ? 10 : 6;
    expect(items.length >= minimum, `第${stage}关小课不足：${items.length}/${minimum}`);
    report.sublessonCounts[String(stage)] = items.length;
    total += items.length;
    for (const item of items) {
      expect(item.stage === stage, `小课阶段漂移：${item.id}`);
      expect(!allIds.has(item.id), `小课ID重复：${item.id}`);
      allIds.add(item.id);
      for (const field of ['title','summary','image','alt','objective','principle','safety','question','answer','courseFile']) {
        expect(String(item[field] || '').trim().length > 0, `小课${item.id}缺少${field}`);
      }
      expect(Array.isArray(item.actions) && item.actions.length >= 3, `小课${item.id}现场动作不足`);
      expect(Array.isArray(item.errors) && item.errors.length >= 3, `小课${item.id}高风险错误不足`);
      expect(item.safety.includes('教学参考，需按机床说明书、现场工艺和空运行验证'), `小课${item.id}缺少统一安全标注`);
      expect(item.image.startsWith('./assets/images/'), `小课${item.id}图片不是仓库相对路径`);
      expect(!/[A-Za-z]:\\/.test(item.image), `小课${item.id}引用本地盘符`);
      const imagePath = path.join(ROOT, 'cnc', item.image.replace(/^\.\//, ''));
      expect(fs.existsSync(imagePath), `小课${item.id}图片不存在：${item.image}`);
      expect(fs.existsSync(path.join(ROOT, 'cnc', item.courseFile)), `小课${item.id}完整课程不存在：${item.courseFile}`);
    }
  }
  expect(total === catalog.totalSublessons, `小课总数不一致：${total}/${catalog.totalSublessons}`);
  expect(total >= 80, `小课总数不足80：${total}`);
  return total;
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const catalogSource = fs.readFileSync(CATALOG_PATH, 'utf8');
  const homeSource = fs.readFileSync(HOME_PATH, 'utf8');
  const detailSource = fs.readFileSync(DETAIL_PATH, 'utf8');
  const depthStyleSource = fs.readFileSync(DEPTH_STYLE_PATH, 'utf8');
  const campSource = fs.readFileSync(CAMP_PATH, 'utf8');
  const aiTeacherSource = fs.readFileSync(AI_TEACHER_PATH, 'utf8');
  const workflowSource = fs.readFileSync(WORKFLOW_PATH, 'utf8');

  const catalog = loadLearningCatalog(catalogSource);
  const homeCatalog = catalog.courses.map(item => ({ id:item.id, title:item.title, file:item.file, reason:item.reason }));
  const campCatalog = parseTrainingCampCatalog(campSource);
  const aiTeacherCourseLinks = extractAiTeacherCourseLinks(aiTeacherSource);
  const totalSublessons = validateSublessons(catalog);

  expect(homeSource.includes("DEPTH_BUILD = '20260805-learning-depth1'"), '手机学习页未启用学习深度构建');
  expect(homeSource.includes('learning-sublesson-catalog.js'), '手机学习页未加载小课目录');
  expect(homeSource.includes('learning-depth.css'), '手机学习页未加载小课样式');
  expect(homeSource.includes('renderLearningDepth'), '手机学习页缺少小课渲染函数');
  expect(detailSource.includes('learning-sublesson-catalog.js'), '小课详情页未加载小课目录');
  expect(detailSource.includes('教学参考') || catalog.safetyNotice.includes('教学参考'), '小课详情缺少教学参考边界');
  expect(depthStyleSource.includes('.cnc-sublesson-panel'), '小课样式缺少可展开目录');

  const canonicalCourses = [];
  const redirectAliasMap = new Map();
  for (let index = 0; index < 12; index += 1) {
    const home = homeCatalog[index];
    const camp = campCatalog[index];
    const aiTeacherFile = aiTeacherCourseLinks[index];
    expect(home.id === camp.id, `第${index + 1}关ID不一致`);
    expect(home.file === camp.file, `第${index + 1}关入口不一致：${home.file}/${camp.file}`);
    expect(titlesCompatible(home.title, camp.title), `第${index + 1}关标题语义不一致：${home.title}/${camp.title}`);
    expect(home.reason.trim().length >= 8 && camp.reason.trim().length >= 8, `第${index + 1}关学习理由过短`);
    const homeTarget = inspectCourseTarget(home.file);
    const aiTarget = inspectCourseTarget(aiTeacherFile);
    expect(homeTarget.canonical === aiTarget.canonical, `第${index + 1}关AI老师正式目标漂移`);
    canonicalCourses.push({
      id:home.id, level:index+1, requestedFile:home.file, canonicalFile:homeTarget.canonical,
      homeTitle:home.title, trainingCampTitle:camp.title, aiTeacherFile, aiTeacherCanonicalFile:aiTarget.canonical
    });
    for (const target of [homeTarget, aiTarget]) if (target.redirect) redirectAliasMap.set(target.requested, target.canonical);
  }
  expect(new Set(canonicalCourses.map(item => item.canonicalFile)).size === 12, '正式课程目标存在重复');
  expect(aiTeacherSource.includes('COURSE_LINKS[state.nextCourse-1]'), 'AI老师下一关推荐未使用受控目录');
  expect(/state\.completed\.size\s*<\s*12/.test(aiTeacherSource), 'AI老师缺少主线未完成分支');

  const pullRequestPaths = extractEventPaths(workflowSource, 'pull_request');
  const pushPaths = extractEventPaths(workflowSource, 'push');
  const requiredTriggerPaths = [
    'cnc/personal-home.js',
    'cnc/learning-sublesson-catalog.js',
    'cnc/learning-detail.html',
    'cnc/learning-depth.css',
    'cnc/training-camp.html',
    'cnc/ai-teacher.html',
    'cnc/course-*.html',
    'cnc/tests/main-course-catalog-drift-smoke.cjs',
    'cnc/tests/learning-depth-smoke.cjs',
    'cnc/docs/main-course-catalog-drift-contract.md',
    '.github/workflows/cnc-main-course-catalog-drift-smoke.yml'
  ];
  expect(JSON.stringify(pullRequestPaths) === JSON.stringify(pushPaths), 'PR与main push路径过滤器不对称');
  requiredTriggerPaths.forEach(item => expect(pullRequestPaths.includes(item), `工作流缺少触发路径：${item}`));
  expect(/permissions:\s*\n\s+contents:\s*read/.test(workflowSource), '工作流权限不是contents: read');
  expect(/cancel-in-progress:\s*false/.test(workflowSource), '工作流不得取消正在运行的验收');

  report.sources = {
    [rel(CATALOG_PATH)]:sha256(catalogSource), [rel(HOME_PATH)]:sha256(homeSource),
    [rel(DETAIL_PATH)]:sha256(detailSource), [rel(DEPTH_STYLE_PATH)]:sha256(depthStyleSource),
    [rel(CAMP_PATH)]:sha256(campSource), [rel(AI_TEACHER_PATH)]:sha256(aiTeacherSource),
    [rel(WORKFLOW_PATH)]:sha256(workflowSource)
  };
  report.homeCatalog = homeCatalog;
  report.trainingCampCatalog = campCatalog;
  report.aiTeacherCourseLinks = aiTeacherCourseLinks;
  report.canonicalCourses = canonicalCourses;
  report.redirectAliases = [...redirectAliasMap.entries()].map(([alias,target])=>({alias,target}));
  report.triggerCoverage = { pullRequestPaths, pushPaths, requiredTriggerPaths };
  report.checks = {
    courseCount:12, stageIdsAndOrderMatch:true, entryFilesMatch:true,
    aiTeacherCourseLinksMatch:true, aiTeacherRecommendationUsesCatalog:true,
    titlesCompatible:true, reasonsPresent:true, allTargetsExist:true,
    redirectAliasesControlled:true, canonicalTargetsUnique:true,
    learningDepthCatalog:true, sublessonStageCount:12,
    totalSublessons, stageOneTenLessons:true, stageTwoTenLessons:true,
    sublessonImagesExist:true, sublessonSafetyBoundaries:true,
    pullRequestAndMainPushPathsSymmetric:true, requiredTriggerPathsCovered:true,
    readOnlyPermissions:true, noCancellation:true
  };
  report.passed = true;
  console.log(`CNC学习目录防漂移通过：固定12关，${totalSublessons}个小课，第1/2关各10课，图片和安全边界完整。`);
}

try { main(); }
catch (error) {
  report.errors.push(error && error.stack ? error.stack : String(error));
  console.error(error);
  process.exitCode = 1;
} finally {
  fs.mkdirSync(OUTPUT_DIR, { recursive:true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(report,null,2)}\n`, 'utf8');
}
