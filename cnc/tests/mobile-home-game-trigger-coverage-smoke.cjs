'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const workflowPath = path.join(ROOT, '.github', 'workflows', 'cnc-mobile-home-game-ui-smoke.yml');
const homePath = path.join(ROOT, 'cnc', 'personal-home.js');
const contractPath = path.join(ROOT, 'cnc', 'docs', 'mobile-home-game-main-push-contract.md');
const outputDir = path.join(ROOT, 'artifacts', 'mobile-home-game');
const outputPath = path.join(outputDir, 'trigger-coverage.json');

const report = {
  checkedAt: new Date().toISOString(),
  commitSha: process.env.GITHUB_SHA || null,
  passed: false,
  pullRequestPaths: [],
  pushPaths: [],
  homepageTargets: [],
  redirectAliases: [],
  errors: []
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function eventPaths(source, eventName) {
  const lines = source.split(/\r?\n/);
  const paths = [];
  let active = false;
  let reading = false;
  for (const line of lines) {
    const event = line.match(/^  ([a-z_]+):\s*$/);
    if (event) {
      if (active && event[1] !== eventName) break;
      active = event[1] === eventName;
      reading = false;
      continue;
    }
    if (!active) continue;
    if (/^    paths:\s*$/.test(line)) {
      reading = true;
      continue;
    }
    if (!reading) continue;
    const item = line.match(/^      - ['"]([^'"]+)['"]\s*$/);
    if (item) paths.push(item[1]);
    else if (/^    \S/.test(line)) break;
  }
  return paths;
}

function covered(patterns, target) {
  return patterns.includes(target) || (
    patterns.includes('cnc/course-*.html') && /^cnc\/course-[a-z0-9-]+\.html$/.test(target)
  );
}

function inspectAlias(target) {
  const source = fs.readFileSync(path.join(ROOT, target), 'utf8');
  assert(source.trim().length > 120, `目标页面内容异常：${target}`);
  assert(/<!doctype html>/i.test(source) && /<html\b/i.test(source), `目标不是有效HTML：${target}`);
  const meta = source.match(/http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"'>\s]+)/i)?.[1] || '';
  const script = source.match(/location\.replace\(\s*["']([^"']+\.html)/)?.[1] || '';
  const redirect = meta || script;
  if (!redirect) return null;
  const clean = redirect.replace(/^\.\//, '').split(/[?#]/)[0];
  const resolved = `cnc/${clean}`;
  assert(/^cnc\/course-[a-z0-9-]+\.html$/.test(resolved), `兼容入口指向非课程页面：${target}`);
  assert(fs.existsSync(path.join(ROOT, resolved)), `兼容入口目标不存在：${target} -> ${resolved}`);
  assert(resolved !== target, `兼容入口发生自跳转：${target}`);
  return { alias: target, target: resolved };
}

function main() {
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  const home = fs.readFileSync(homePath, 'utf8');
  const contract = fs.readFileSync(contractPath, 'utf8');
  const pullPaths = eventPaths(workflow, 'pull_request');
  const pushPaths = eventPaths(workflow, 'push');

  assert(pullPaths.length > 0, '缺少 pull_request.paths');
  assert(pushPaths.length > 0, '缺少 push.paths');
  assert(/\n  push:\s*\n[\s\S]*?branches:\s*\n\s*- main\s*\n/.test(workflow), '未监听 main push');
  assert(/permissions:\s*\n\s*contents:\s*read/.test(workflow), '权限必须保持 contents: read');
  assert(/cancel-in-progress:\s*false/.test(workflow), '不得取消仍在执行的验收');
  assert(/node-version:\s*['"]?24['"]?/.test(workflow), '必须使用 Node 24');
  assert(/if-no-files-found:\s*error/.test(workflow), '诊断文件缺失时必须失败');
  assert(/retention-days:\s*14/.test(workflow), '诊断 Artifact 必须保留14天');
  assert(/cnc-mobile-home-game-ui-\$\{\{ github\.run_id \}\}/.test(workflow), 'Artifact 名称必须包含 run_id');

  for (const phrase of ['main 推送', '390×844', '相同系统和机型的原厂手册', '授权人员确认']) {
    assert(contract.includes(phrase), `中文契约缺少：${phrase}`);
  }

  const required = [
    'cnc/index.html', 'cnc/personal-home.js', 'cnc/mobile-home-game.css',
    'cnc/import-test.js', 'cnc/mobile-trust-nav.js', 'cnc/industrial-tools.js',
    'cnc/course-*.html', 'cnc/beginner-placement.html', 'cnc/training-camp.html',
    'cnc/practice.html', 'cnc/practice-wrong-review.html', 'cnc/simulator-hub.html',
    'cnc/profile.html', 'cnc/tests/mobile-home-game-ui-smoke.cjs',
    'cnc/tests/mobile-home-game-trigger-coverage-smoke.cjs',
    'cnc/docs/mobile-home-game-main-push-contract.md',
    '.github/workflows/cnc-mobile-home-game-ui-smoke.yml'
  ];

  const directLinks = [...home.matchAll(/href="\.\/([^"?#]+\.html)"/g)].map(match => match[1]);
  const courseFiles = [...home.matchAll(/file:\s*'([^']+\.html)'/g)].map(match => match[1]);
  const targets = [...new Set([...directLinks, ...courseFiles])].map(file => `cnc/${file}`).sort();
  assert(targets.length >= 12, `首页入口提取不足：${targets.length}`);
  for (const target of targets) assert(fs.existsSync(path.join(ROOT, target)), `首页入口不存在：${target}`);

  const aliases = targets.map(inspectAlias).filter(Boolean);
  const allRequired = [...new Set([...required, ...targets])];
  const missingPull = allRequired.filter(target => !covered(pullPaths, target));
  const missingPush = allRequired.filter(target => !covered(pushPaths, target));
  assert(missingPull.length === 0, `pull_request.paths 未覆盖：${missingPull.join('、')}`);
  assert(missingPush.length === 0, `push.paths 未覆盖：${missingPush.join('、')}`);

  const asymmetric = [...new Set([
    ...pullPaths.filter(item => !pushPaths.includes(item)),
    ...pushPaths.filter(item => !pullPaths.includes(item))
  ])];
  assert(asymmetric.length === 0, `PR 与 main push 路径不对称：${asymmetric.join('、')}`);

  const bypassTokens = [
    'test' + '.skip(', 'describe' + '.skip(', 'it' + '.skip(', 'process.exit(' + '0)'
  ];
  const guardedFiles = [
    path.join(ROOT, 'cnc', 'tests', 'mobile-home-game-ui-smoke.cjs'),
    __filename
  ];
  for (const file of guardedFiles) {
    const source = fs.readFileSync(file, 'utf8');
    for (const token of bypassTokens) assert(!source.includes(token), `发现绕过标记：${path.relative(ROOT, file)}`);
  }

  report.pullRequestPaths = pullPaths;
  report.pushPaths = pushPaths;
  report.homepageTargets = targets;
  report.redirectAliases = aliases;
  report.passed = true;
  console.log(`手机闯关首页触发覆盖通过：${targets.length} 个入口、${aliases.length} 个兼容入口、${pullPaths.length} 条对称路径。`);
}

try {
  main();
} catch (error) {
  report.errors.push(error && error.stack ? error.stack : String(error));
  console.error(error);
  process.exitCode = 1;
} finally {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}
