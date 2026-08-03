'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const HOME_PATH = path.join(ROOT, 'cnc', 'personal-home.js');
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
  triggerCoverage: {},
  checks: {},
  errors: []
};

function fail(message) {
  throw new Error(message);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function sha256(source) {
  return crypto.createHash('sha256').update(source).digest('hex');
}

function rel(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, '/');
}

function extractCourseBlock(source, declaration, label) {
  const pattern = new RegExp(`\\b${declaration}\\s+COURSES\\s*=\\s*\\[([\\s\\S]*?)\\n\\s*\\];`);
  const match = source.match(pattern);
  expect(match, `${label}缺少可审计的COURSES目录`);
  return match[1];
}

function parseCourseCatalog(block, label) {
  const entries = [];
  const pattern = /\{\s*id\s*:\s*'([^']+)'\s*,\s*title\s*:\s*'([^']+)'\s*,\s*file\s*:\s*'([^']+)'\s*,\s*reason\s*:\s*'([^']+)'\s*\}/g;
  for (const match of block.matchAll(pattern)) {
    entries.push({ id: match[1], title: match[2], file: match[3], reason: match[4] });
  }
  expect(entries.length === 12, `${label}课程数量必须为12，实际${entries.length}`);
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
  return String(value || '')
    .replace(/\s+/g, '')
    .replace(/[：:，,。！？!?、·（）()《》]/g, '');
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
  expect(/^course-[a-z0-9-]+\.html$/.test(redirectTarget), `兼容入口目标不是受控课程：cnc/${file} -> ${redirectTarget}`);
  const targetAbsolute = path.join(ROOT, 'cnc', redirectTarget);
  expect(fs.existsSync(targetAbsolute), `兼容入口正式目标不存在：cnc/${file} -> cnc/${redirectTarget}`);
  const targetSource = fs.readFileSync(targetAbsolute, 'utf8');
  expect(!extractRedirectTarget(targetSource), `兼容入口不得形成二次跳转链：cnc/${file} -> cnc/${redirectTarget}`);
  expect(/<title>[^<]+<\/title>/i.test(targetSource), `兼容入口正式目标缺少标题：cnc/${redirectTarget}`);
  expect(source.includes('原厂手册') && source.includes('授权人员'), `兼容入口缺少原厂手册或授权人员安全边界：cnc/${file}`);
  expect(/<a\b[^>]*class=["'][^"']*button[^"']*["'][^>]*>/i.test(source), `兼容入口缺少手动继续按钮：cnc/${file}`);

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
    if (/^    paths:\s*$/.test(line)) {
      inPaths = true;
      continue;
    }
    if (!inPaths) continue;
    const pathMatch = line.match(/^      - ['"]([^'"]+)['"]\s*$/);
    if (pathMatch) {
      paths.push(pathMatch[1]);
      continue;
    }
    if (/^    \S/.test(line)) break;
  }
  return paths;
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const homeSource = fs.readFileSync(HOME_PATH, 'utf8');
  const campSource = fs.readFileSync(CAMP_PATH, 'utf8');
  const aiTeacherSource = fs.readFileSync(AI_TEACHER_PATH, 'utf8');
  const workflowSource = fs.readFileSync(WORKFLOW_PATH, 'utf8');

  const homeCatalog = parseCourseCatalog(extractCourseBlock(homeSource, 'var', '手机闯关首页'), '手机闯关首页');
  const campCatalog = parseCourseCatalog(extractCourseBlock(campSource, 'const', '训练营'), '训练营');
  const aiTeacherCourseLinks = extractAiTeacherCourseLinks(aiTeacherSource);
  const expectedIds = Array.from({ length: 12 }, (_, index) => `stage-${index + 1}`);

  expect(new Set(homeCatalog.map(item => item.id)).size === 12, '手机闯关首页课程ID存在重复');
  expect(new Set(campCatalog.map(item => item.id)).size === 12, '训练营课程ID存在重复');
  expect(JSON.stringify(homeCatalog.map(item => item.id)) === JSON.stringify(expectedIds), '手机闯关首页课程ID或顺序漂移');
  expect(JSON.stringify(campCatalog.map(item => item.id)) === JSON.stringify(expectedIds), '训练营课程ID或顺序漂移');

  const canonicalCourses = [];
  const redirectAliases = [];
  for (let index = 0; index < 12; index += 1) {
    const home = homeCatalog[index];
    const camp = campCatalog[index];
    const aiTeacherFile = aiTeacherCourseLinks[index];
    expect(home.id === camp.id, `第${index + 1}关ID不一致：${home.id} / ${camp.id}`);
    expect(home.file === camp.file, `第${index + 1}关入口不一致：${home.file} / ${camp.file}`);
    expect(home.file === aiTeacherFile, `第${index + 1}关AI老师入口漂移：${home.file} / ${aiTeacherFile}`);
    expect(titlesCompatible(home.title, camp.title), `第${index + 1}关标题语义不一致：${home.title} / ${camp.title}`);
    expect(home.reason.trim().length >= 8 && camp.reason.trim().length >= 8, `第${index + 1}关学习理由过短`);

    const target = inspectCourseTarget(home.file);
    canonicalCourses.push({
      id: home.id,
      level: index + 1,
      requestedFile: target.requested,
      canonicalFile: target.canonical,
      homeTitle: home.title,
      trainingCampTitle: camp.title,
      aiTeacherFile
    });
    if (target.redirect) redirectAliases.push({ alias: target.requested, target: target.canonical });
  }

  expect(new Set(canonicalCourses.map(item => item.canonicalFile)).size === 12, '12关课程解析后存在重复正式目标');
  expect(aiTeacherSource.includes('COURSE_LINKS[state.nextCourse-1]'), 'AI CNC老师下一关推荐未使用受控COURSE_LINKS目录');
  expect(/nextCourse\s*:\s*Array\.from\(\{\s*length\s*:\s*12\s*\}/.test(aiTeacherSource), 'AI CNC老师下一关计算未覆盖固定12关');
  expect(/state\.completed\.size\s*<\s*12/.test(aiTeacherSource), 'AI CNC老师缺少主线未完成分支');

  const pullRequestPaths = extractEventPaths(workflowSource, 'pull_request');
  const pushPaths = extractEventPaths(workflowSource, 'push');
  const requiredTriggerPaths = [
    'cnc/personal-home.js',
    'cnc/training-camp.html',
    'cnc/ai-teacher.html',
    'cnc/course-*.html',
    'cnc/tests/main-course-catalog-drift-smoke.cjs',
    'cnc/docs/main-course-catalog-drift-contract.md',
    '.github/workflows/cnc-main-course-catalog-drift-smoke.yml'
  ];

  expect(pullRequestPaths.length > 0, '工作流缺少pull_request.paths');
  expect(pushPaths.length > 0, '工作流缺少main push.paths');
  expect(JSON.stringify(pullRequestPaths) === JSON.stringify(pushPaths), 'pull_request与main push路径过滤器不对称');
  for (const requiredPath of requiredTriggerPaths) {
    expect(pullRequestPaths.includes(requiredPath), `工作流缺少触发路径：${requiredPath}`);
  }
  expect(/push:\s*\n\s+branches:\s*\[main\]/.test(workflowSource), '工作流未限定main推送');
  expect(/permissions:\s*\n\s+contents:\s*read/.test(workflowSource), '工作流权限不是contents: read');
  expect(/cancel-in-progress:\s*false/.test(workflowSource), '工作流不得取消正在运行的验收');

  report.sources = {
    [rel(HOME_PATH)]: sha256(homeSource),
    [rel(CAMP_PATH)]: sha256(campSource),
    [rel(AI_TEACHER_PATH)]: sha256(aiTeacherSource),
    [rel(WORKFLOW_PATH)]: sha256(workflowSource)
  };
  report.homeCatalog = homeCatalog;
  report.trainingCampCatalog = campCatalog;
  report.aiTeacherCourseLinks = aiTeacherCourseLinks;
  report.canonicalCourses = canonicalCourses;
  report.redirectAliases = redirectAliases;
  report.triggerCoverage = { pullRequestPaths, pushPaths, requiredTriggerPaths };
  report.checks = {
    courseCount: 12,
    stageIdsAndOrderMatch: true,
    entryFilesMatch: true,
    aiTeacherCourseLinksMatch: true,
    aiTeacherRecommendationUsesCatalog: true,
    titlesCompatible: true,
    reasonsPresent: true,
    allTargetsExist: true,
    redirectAliasesControlled: true,
    canonicalTargetsUnique: true,
    pullRequestAndMainPushPathsSymmetric: true,
    requiredTriggerPathsCovered: true,
    readOnlyPermissions: true,
    noCancellation: true
  };
  report.passed = true;
  console.log(`CNC 12关主线目录防漂移通过：手机首页、训练营与AI老师三端顺序一致，${redirectAliases.length}个受控兼容入口，正式目标全部存在。`);
}

try {
  main();
} catch (error) {
  report.errors.push(error && error.stack ? error.stack : String(error));
  console.error(error);
  process.exitCode = 1;
} finally {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}
