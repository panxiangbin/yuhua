'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const ROUTE_REPORT_PATH = path.join(ROOT, 'cnc', 'test-results', 'beginner-placement-route-catalog-drift', 'report.json');
const SW_PATH = path.join(ROOT, 'cnc', 'sw.js');
const SELF_TEST_PATH = path.join(ROOT, 'cnc', 'pwa-self-test.html');
const OFFLINE_TEST_PATH = path.join(ROOT, 'cnc', 'tests', 'mobile-pwa-offline-cache-smoke.cjs');
const UPGRADE_TEST_PATH = path.join(ROOT, 'cnc', 'tests', 'mobile-pwa-upgrade-data-smoke.cjs');
const OUTPUT_DIR = path.join(ROOT, 'cnc', 'test-results', 'placement-first-step-offline-core-drift');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'report.json');

const report = {
  generatedAt: new Date().toISOString(),
  commitSha: process.env.GITHUB_SHA || null,
  passed: false,
  sources: {},
  decisions: {},
  expectedFirstSteps: [],
  serviceWorkerCore: [],
  selfTestCore: [],
  offlineBrowserCourses: [],
  upgradeCourses: [],
  checks: {},
  errors: []
};

function sha256(source) {
  return crypto.createHash('sha256').update(source, 'utf8').digest('hex');
}

function fail(message) {
  throw new Error(message);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function readUtf8(file) {
  return fs.readFileSync(file, 'utf8');
}

function normalizeRelativePath(value, label, extensionPattern, allowDirectories = false) {
  const raw = String(value || '').trim();
  expect(!/^(?:https?:|data:|\/\/)/i.test(raw), `${label}不得使用站外或data资源：${value}`);
  const withoutSuffix = raw.split(/[?#]/, 1)[0];
  const normalized = `./${withoutSuffix.replace(/^\.?\//, '')}`;
  expect(!normalized.includes('..'), `${label}不得包含目录穿越：${value}`);
  const stemPattern = allowDirectories ? '[a-z0-9_./-]+' : '[a-z0-9-]+';
  expect(new RegExp(`^\\./${stemPattern}\\.${extensionPattern}$`).test(normalized), `${label}路径不受控：${value}`);
  return normalized;
}

function normalizeCoursePath(value) {
  return normalizeRelativePath(value, '首步课程', 'html');
}

function normalizeCoreResourcePath(value) {
  return normalizeRelativePath(value, 'PWA核心资源', '(?:html|json|js|css|webp|mp4)', true);
}

function sortedUnique(values, label, normalize) {
  const normalized = values.map(normalize);
  expect(normalized.length > 0, `${label} 为空`);
  expect(new Set(normalized).size === normalized.length, `${label} 存在重复：${JSON.stringify(normalized)}`);
  return [...normalized].sort();
}

function extractArrayLiteral(source, constantName) {
  const match = new RegExp(`const\\s+${constantName}\\s*=`).exec(source);
  expect(match, `缺少数组常量：${constantName}`);
  const open = source.indexOf('[', match.index + match[0].length);
  expect(open >= 0, `${constantName} 缺少数组开始符号`);

  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = '';
      }
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === '[') depth += 1;
    if (char === ']') {
      depth -= 1;
      if (depth === 0) return source.slice(open, index + 1);
    }
  }
  fail(`无法定位 ${constantName} 数组结束位置`);
}

function extractStringArray(source, constantName) {
  const literal = extractArrayLiteral(source, constantName);
  const values = [];
  const pattern = /'([^']+)'|"([^"]+)"/g;
  let match;
  while ((match = pattern.exec(literal))) values.push(match[1] || match[2]);
  return values;
}

function extractCourseObjectPaths(source, constantName) {
  const literal = extractArrayLiteral(source, constantName);
  const values = [];
  const pattern = /\bpath\s*:\s*(?:'([^']+)'|"([^"]+)")/g;
  let match;
  while ((match = pattern.exec(literal))) values.push(match[1] || match[2]);
  return values;
}

function exactSetMatch(actual, expected) {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  expect(fs.existsSync(ROUTE_REPORT_PATH), '缺少路线目录主报告，必须先运行 beginner-placement-route-catalog-drift-smoke.cjs');

  const routeReportSource = readUtf8(ROUTE_REPORT_PATH);
  const routeReport = JSON.parse(routeReportSource);
  expect(routeReport.passed === true, '路线目录主报告未通过，不能审计首步离线核心');
  expect(routeReport.consumer && routeReport.consumer.routes, '路线目录主报告缺少消费端路线');

  const sw = readUtf8(SW_PATH);
  const selfTest = readUtf8(SELF_TEST_PATH);
  const offlineTest = readUtf8(OFFLINE_TEST_PATH);
  const upgradeTest = readUtf8(UPGRADE_TEST_PATH);

  report.sources = {
    routeReport: { file: 'cnc/test-results/beginner-placement-route-catalog-drift/report.json', sha256: sha256(routeReportSource) },
    serviceWorker: { file: 'cnc/sw.js', sha256: sha256(sw) },
    selfTest: { file: 'cnc/pwa-self-test.html', sha256: sha256(selfTest) },
    offlineBrowserTest: { file: 'cnc/tests/mobile-pwa-offline-cache-smoke.cjs', sha256: sha256(offlineTest) },
    upgradeTest: { file: 'cnc/tests/mobile-pwa-upgrade-data-smoke.cjs', sha256: sha256(upgradeTest) }
  };

  const decisionEntries = Object.entries(routeReport.consumer.routes).sort(([left], [right]) => left.localeCompare(right));
  expect(decisionEntries.length > 0, '路线目录没有可审计的决策');
  const firstSteps = [];
  for (const [decision, route] of decisionEntries) {
    expect(route && Array.isArray(route.steps) && route.steps.length > 0, `${decision} 缺少路线步骤`);
    const routeHref = normalizeCoursePath(route.href);
    const firstStepHref = normalizeCoursePath(route.steps[0].href);
    expect(routeHref === firstStepHref, `${decision} 的直接开始链接与第1步不一致：${routeHref} / ${firstStepHref}`);
    const target = path.join(ROOT, 'cnc', firstStepHref.slice(2));
    expect(fs.existsSync(target), `${decision} 的首步课程不存在：${firstStepHref}`);
    report.decisions[decision] = {
      routeHref,
      firstStepHref,
      firstStepTitle: String(route.steps[0].title || '')
    };
    firstSteps.push(firstStepHref);
  }

  const expectedFirstSteps = [...new Set(firstSteps)].sort();
  expect(expectedFirstSteps.length >= 1, '没有可用的首步课程');
  const serviceWorkerCore = sortedUnique(extractStringArray(sw, 'REQUIRED_CORE_PATHS'), 'Service Worker 核心资源', normalizeCoreResourcePath);
  const selfTestCore = sortedUnique(extractStringArray(selfTest, 'REQUIRED'), 'PWA 自检核心资源', normalizeCoreResourcePath);
  const offlineBrowserCourses = sortedUnique(extractCourseObjectPaths(offlineTest, 'PLACEMENT_FIRST_STEP_COURSES'), '冷离线浏览器首步课程', normalizeCoursePath);
  const upgradeCourses = sortedUnique(extractCourseObjectPaths(upgradeTest, 'PLACEMENT_FIRST_STEP_COURSES'), '升级保护首步课程', normalizeCoursePath);

  const missingFromServiceWorker = expectedFirstSteps.filter(item => !serviceWorkerCore.includes(item));
  const missingFromSelfTest = expectedFirstSteps.filter(item => !selfTestCore.includes(item));
  const offlineBrowserCourseSetExact = exactSetMatch(offlineBrowserCourses, expectedFirstSteps);
  const upgradeCourseSetExact = exactSetMatch(upgradeCourses, expectedFirstSteps);
  const serviceWorkerAndSelfTestCoreExact = exactSetMatch(serviceWorkerCore, selfTestCore);

  expect(missingFromServiceWorker.length === 0, `Service Worker 未缓存当前路线首步：${missingFromServiceWorker.join('、')}`);
  expect(missingFromSelfTest.length === 0, `PWA 自检未核对当前路线首步：${missingFromSelfTest.join('、')}`);
  expect(offlineBrowserCourseSetExact, `冷离线浏览器首步课程与路线目录不一致：${JSON.stringify(offlineBrowserCourses)} / ${JSON.stringify(expectedFirstSteps)}`);
  expect(upgradeCourseSetExact, `升级保护首步课程与路线目录不一致：${JSON.stringify(upgradeCourses)} / ${JSON.stringify(expectedFirstSteps)}`);
  expect(serviceWorkerAndSelfTestCoreExact, 'Service Worker 与 PWA 自检核心资源集合不一致');

  report.expectedFirstSteps = expectedFirstSteps;
  report.serviceWorkerCore = serviceWorkerCore;
  report.selfTestCore = selfTestCore;
  report.offlineBrowserCourses = offlineBrowserCourses;
  report.upgradeCourses = upgradeCourses;
  report.checks = {
    decisionCount: decisionEntries.length,
    uniqueFirstStepCount: expectedFirstSteps.length,
    routeHrefMatchesFirstStep: true,
    firstStepTargetsExist: true,
    firstStepsInServiceWorker: true,
    firstStepsInSelfTest: true,
    offlineBrowserCourseSetExact,
    upgradeCourseSetExact,
    serviceWorkerAndSelfTestCoreExact,
    missingFromServiceWorker,
    missingFromSelfTest
  };
  report.passed = true;
  console.log(`CNC 测评首步离线核心防漂移通过：${decisionEntries.length} 类决策归并为 ${expectedFirstSteps.length} 张首步课程，Service Worker、自检、冷离线与升级保护完全一致。`);
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
