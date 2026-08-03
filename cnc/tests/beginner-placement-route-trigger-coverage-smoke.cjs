'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CATALOG_REPORT_PATH = path.join(ROOT, 'cnc', 'test-results', 'beginner-placement-route-catalog-drift', 'report.json');
const WORKFLOW_PATH = path.join(ROOT, '.github', 'workflows', 'cnc-beginner-placement-route-catalog-drift-smoke.yml');
const OUTPUT_PATH = path.join(ROOT, 'cnc', 'test-results', 'beginner-placement-route-catalog-drift', 'trigger-coverage.json');

const report = {
  generatedAt: new Date().toISOString(),
  commitSha: process.env.GITHUB_SHA || null,
  passed: false,
  workflow: '.github/workflows/cnc-beginner-placement-route-catalog-drift-smoke.yml',
  expectedTargetPaths: [],
  pullRequestPaths: [],
  pushPaths: [],
  checks: {},
  errors: []
};

function fail(message) {
  throw new Error(message);
}

function expect(condition, message) {
  if (!condition) fail(message);
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
  const catalogReport = JSON.parse(fs.readFileSync(CATALOG_REPORT_PATH, 'utf8'));
  expect(catalogReport.passed === true, '路线目录主报告未通过，不能继续检查触发覆盖');
  expect(Array.isArray(catalogReport.checks?.hrefs), '路线目录主报告缺少 hrefs');

  const expectedTargetPaths = catalogReport.checks.hrefs
    .map(href => {
      expect(/^\.\/[a-z0-9-]+\.html$/.test(href), `主报告包含非受控入口：${href}`);
      return `cnc/${href.slice(2)}`;
    })
    .sort();
  expect(expectedTargetPaths.length > 0, '没有可检查的路线目标页面');
  expect(new Set(expectedTargetPaths).size === expectedTargetPaths.length, '路线目标页面存在重复');

  const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8');
  const pullRequestPaths = extractEventPaths(workflow, 'pull_request');
  const pushPaths = extractEventPaths(workflow, 'push');
  expect(pullRequestPaths.length > 0, '工作流缺少 pull_request.paths');
  expect(pushPaths.length > 0, '工作流缺少 push.paths');

  const missingFromPullRequest = expectedTargetPaths.filter(item => !pullRequestPaths.includes(item));
  const missingFromPush = expectedTargetPaths.filter(item => !pushPaths.includes(item));
  expect(missingFromPullRequest.length === 0, `pull_request.paths 未覆盖路线目标：${missingFromPullRequest.join('、')}`);
  expect(missingFromPush.length === 0, `push.paths 未覆盖路线目标：${missingFromPush.join('、')}`);

  const selfPaths = [
    'cnc/tests/beginner-placement-route-trigger-coverage-smoke.cjs',
    'cnc/tests/beginner-placement-route-catalog-drift-smoke.cjs',
    'cnc/docs/beginner-placement-route-catalog-drift-contract.md',
    '.github/workflows/cnc-beginner-placement-route-catalog-drift-smoke.yml'
  ];
  for (const selfPath of selfPaths) {
    expect(pullRequestPaths.includes(selfPath), `pull_request.paths 缺少门禁自维护文件：${selfPath}`);
    expect(pushPaths.includes(selfPath), `push.paths 缺少门禁自维护文件：${selfPath}`);
  }

  report.expectedTargetPaths = expectedTargetPaths;
  report.pullRequestPaths = pullRequestPaths;
  report.pushPaths = pushPaths;
  report.checks = {
    targetCount: expectedTargetPaths.length,
    targetPathsCoveredByPullRequest: true,
    targetPathsCoveredByPush: true,
    selfMaintenancePathsCovered: true,
    missingFromPullRequest,
    missingFromPush
  };
  report.passed = true;
  console.log(`CNC 路线目标触发覆盖通过：${expectedTargetPaths.length} 个目标页面在 pull_request 与 main push 中均会触发门禁。`);
}

try {
  main();
} catch (error) {
  report.errors.push(error && error.stack ? error.stack : String(error));
  console.error(error);
  process.exitCode = 1;
} finally {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}
