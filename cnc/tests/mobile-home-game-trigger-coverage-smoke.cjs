'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const WORKFLOW_PATH = path.join(ROOT, '.github', 'workflows', 'cnc-mobile-home-game-ui-smoke.yml');
const HOME_SCRIPT_PATH = path.join(ROOT, 'cnc', 'personal-home.js');
const OUTPUT_DIR = path.join(ROOT, 'artifacts', 'mobile-home-game');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'trigger-coverage.json');

const report = {
  checkedAt: new Date().toISOString(),
  commitSha: process.env.GITHUB_SHA || null,
  workflow: '.github/workflows/cnc-mobile-home-game-ui-smoke.yml',
  passed: false,
  pullRequestPaths: [],
  pushPaths: [],
  homepageTargets: [],
  redirectAliases: [],
  missingFromPullRequest: [],
  missingFromPush: [],
  missingTargets: [],
  asymmetricPaths: [],
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

function pathCovered(patterns, target) {
  return patterns.some(pattern => {
    if (pattern === target) return true;
    if (pattern === 'cnc/course-*.html') return /^cnc\/course-[a-z0-9-]+\.html$/.test(target);
    return false;
  });
}

function inspectRedirectAlias(target) {
  const absolute = path.join(ROOT, target);
  const source = fs.readFileSync(absolute, 'utf8');
  expect(source.trim().length > 120, `手机闯关首页目标页面内容异常：${target}`);
  expect(/<!doctype html>/i.test(source) && /<html\b/i.test(source), `手机闯关首页目标不是有效HTML：${target}`);

  const metaTarget = source.match(/http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"'>\s]+)/i)?.[1] || '';
  const scriptTarget = source.match(/location\.replace\(\s*["']([^"']+\.html)/)?.[1] || '';
  const redirectTarget = metaTarget || scriptTarget;
  if (!redirectTarget) return null;

  const cleanTarget = redirectTarget.replace(/^\.\//, '').split(/[?#]/)[0];
  const resolved = `cnc/${cleanTarget}`;
  expect(/^cnc\/course-[a-z0-9-]+\.html$/.test(resolved), `手机闯关首页兼容入口跳转到非受控页面：${target} -> ${redirectTarget}`);
  expect(fs.existsSync(path.join(ROOT, resolved)), `手机闯关首页兼容入口目标不存在：${target} -> ${resolved}`);
  expect(resolved !== target, `手机闯关首页兼容入口发生自跳转：${target}`);
  return { alias: target, target: resolved };
}

function main() {
  const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8');
  const homeScript = fs.readFileSync(HOME_SCRIPT_PATH, 'utf8');
  const pullRequestPaths = extractEventPaths(workflow, 'pull_request');
  const pushPaths = extractEventPaths(workflow, 'push');

  expect(pullRequestPaths.length > 0, '手机闯关首页工作流缺少 pull_request.paths');
  expect(pushPaths.length > 0, '手机闯关首页工作流缺少 push.paths');
  expect(/\n  push:\s*\n[\s\S]*?branches:\s*\n\s*- main\s*\n/.test(workflow), '手机闯关首页工作流未明确监听 main push');
  expect(/permissions:\s*\n\s*contents:\s*read/.test(workflow), '手机闯关首页工作流必须保持 contents: read');
  expect(/cancel-in-progress:\s*false/.test(workflow), '手机闯关首页工作流不得取消仍在执行的验收');
  expect(/node-version:\s*['"]?24['"]?/.test(workflow), '手机闯关首页工作流必须使用 Node 24');
  expect(/if-no-files-found:\s*error/.test(workflow), '手机闯关首页诊断 Artifact 缺失时必须失败');
  expect(/retention-days:\s*14/.test(workflow), '手机闯关首页诊断 Artifact 必须保留14天');
  expect(/cnc-mobile-home-game-ui-\$\{\{ github\.run_id \}\}/.test(workflow), '手机闯关首页 Artifact 名称必须包含 run_id');

  const requiredMaintenancePaths = [
    'cnc/index.html',
    'cnc/personal-home.js',
    'cnc/mobile-home-game.css',
    'cnc/import-test.js',
    'cnc/mobile-trust-nav.js',
    'cnc/industrial-tools.js',
    'cnc/course-*.html',
    'cnc/beginner-placement.html',
    'cnc/training-camp.html',
    'cnc/practice.html',
    'cnc/practice-wrong-review.html',
    'cnc/simulator-hub.html',
    'cnc/profile.html',
    'cnc/tests/mobile-home-game-ui-smoke.cjs',
    'cnc/tests/mobile-home-game-trigger-coverage-smoke.cjs',
    'cnc/docs/mobile-home-game-main-push-contract.md',
    '.github/workflows/cnc-mobile-home-game-ui-smoke.yml'
  ];

  const directLinks = [...homeScript.matchAll(/href="\.\/([^"?#]+\.html)"/g)].map(match => match[1]);
  const courseFiles = [...homeScript.matchAll(/file:\s*'([^']+\.html)'/g)].map(match => match[1]);
  const homepageTargets = [...new Set([...directLinks, ...courseFiles])]
    .map(file => `cnc/${file}`)
    .sort();

  expect(homepageTargets.length >= 12, `手机闯关首页入口提取不足：${homepageTargets.length}`);
  const missingTargets = homepageTargets.filter(target => !fs.existsSync(path.join(ROOT, target)));
  expect(missingTargets.length === 0, `手机闯关首页存在失效入口：${missingTargets.join('、')}`);

  const redirectAliases = homepageTargets.map(inspectRedirectAlias).filter(Boolean);

  const allRequired = [...new Set([...requiredMaintenancePaths, ...homepageTargets])];
  const missingFromPullRequest = allRequired.filter(target => !pathCovered(pullRequestPaths, target));
  const missingFromPush = allRequired.filter(target => !pathCovered(pushPaths, target));
  expect(missingFromPullRequest.length === 0, `pull_request.paths 未覆盖手机闯关首页依赖：${missingFromPullRequest.join('、')}`);
  expect(missingFromPush.length === 0, `push.paths 未覆盖手机闯关首页依赖：${missingFromPush.join('、')}`);

  const pullSet = new Set(pullRequestPaths);
  const pushSet = new Set(pushPaths);
  const asymmetricPaths = [...new Set([
    ...pullRequestPaths.filter(item => !pushSet.has(item)),
    ...pushPaths.filter(item => !pullSet.has(item))
  ])].sort();
  expect(asymmetricPaths.length === 0, `pull_request 与 main push 路径不对称：${asymmetricPaths.join('、')}`);

  report.pullRequestPaths = pullRequestPaths;
  report.pushPaths = pushPaths;
  report.homepageTargets = homepageTargets;
  report.redirectAliases = redirectAliases;
  report.missingFromPullRequest = missingFromPullRequest;
  report.missingFromPush = missingFromPush;
  report.missingTargets = missingTargets;
  report.asymmetricPaths = asymmetricPaths;
  report.checks = {
    mainPushEnabled: true,
    pullAndPushPathsSymmetric: true,
    runtimeTargetsExist: true,
    redirectAliasTargetsExist: true,
    runtimeTargetsCoveredByPullRequest: true,
    runtimeTargetsCoveredByPush: true,
    node24: true,
    readOnlyPermissions: true,
    diagnosticsRequired: true
  };
  report.passed = true;
  console.log(`CNC 手机闯关首页主分支触发覆盖通过：${homepageTargets.length} 个真实入口、${redirectAliases.length} 个受控兼容入口、${pullRequestPaths.length} 条对称触发路径。`);
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
