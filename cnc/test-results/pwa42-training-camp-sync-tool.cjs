'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const TARGET_PWA = '20260813-pwa42';
const TARGET_CACHE = '20260813-learning42';
const OLD_PWA = '20260812-pwa41';
const OLD_CACHE = '20260812-learning41';
const MAIN_PWA = '20260812-pwa41';
const MAIN_CACHE = '20260812-learning41';
const OLD_MAIN_PWA = '20260812-pwa40';
const OLD_MAIN_CACHE = '20260812-learning40';
const ARTIFACT_DIR = path.join(ROOT, 'artifacts', 'pwa42-training-camp-sync');
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function write(rel, text) { fs.writeFileSync(path.join(ROOT, rel), text); }
function replaceRequired(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`缺少受控替换目标：${label}`);
  return source.replace(from, to);
}
function isTextFile(file) { return /\.(?:cjs|js|html|json|md|ya?ml)$/.test(file); }
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'test-results', '.git'].includes(entry.name)) continue;
      out.push(...walk(full));
    } else if (isTextFile(entry.name)) out.push(full);
  }
  return out;
}
function rel(file) { return path.relative(ROOT, file).replaceAll(path.sep, '/'); }

const changedBySync = new Set();
function replaceOperationalPins() {
  const cncFiles = walk(path.join(ROOT, 'cnc')).filter(file => {
    const r = rel(file);
    if (r.startsWith('cnc/docs/')) return false;
    if (r === 'cnc/MOBILE_HOME_REFACTOR_PROGRESS.md') return false;
    return true;
  });
  const workflowDir = path.join(ROOT, '.github', 'workflows');
  const workflowFiles = fs.existsSync(workflowDir)
    ? fs.readdirSync(workflowDir).filter(name => name.startsWith('cnc-') && /\.ya?ml$/.test(name)).map(name => path.join(workflowDir, name))
    : [];
  for (const file of [...cncFiles, ...workflowFiles]) {
    let source = fs.readFileSync(file, 'utf8');
    const before = source;
    source = source.split(OLD_PWA).join(TARGET_PWA).split(OLD_CACHE).join(TARGET_CACHE);
    if (source !== before) {
      fs.writeFileSync(file, source);
      changedBySync.add(rel(file));
    }
  }
}

function patchTrainingCamp() {
  const relPath = 'cnc/training-camp.html';
  let source = read(relPath);
  source = replaceRequired(
    source,
    "function simulatorRecordPassed(record){if(record.passed===true)return true;const best=strictScore(record.bestScore??record.best??record.score);return best!==null&&best>=80}",
    "function simulatorRecordPassed(record){if(record.passed===true)return true;const best=strictScore(record.bestScore??record.best??record.score);return best!==null&&best===100}",
    '训练营模拟通过必须满分'
  );
  write(relPath, source);
  changedBySync.add(relPath);
}

function patchTrainingCampTest() {
  const relPath = 'cnc/tests/mobile-training-camp-hub-smoke.cjs';
  let source = read(relPath);
  source = replaceRequired(
    source,
    "assert.strictEqual(await complete.page.locator('#simulator-status').textContent(), '已通过 2/13 项');\n    assert.match(await complete.page.locator('#route-title').textContent(), /继续模拟训练（2\\/13）/);",
    "assert.strictEqual(await complete.page.locator('#simulator-status').textContent(), '已通过 1/13 项', '90分不得单独计为模拟通过');\n    assert.match(await complete.page.locator('#route-title').textContent(), /继续模拟训练（1\\/13）/);",
    '训练营90分不通过回归'
  );
  const anchor = "    const arrayRoots = await openPage(browser, { cnc_training_profile_v1: [], cnc_training_practice_v1: [], cnc_training_simulator_v1: [] });";
  const scenario = `    const simulatorIds = ['homing','workholding-check','tool-installation','tool-length-offset-check','work-offset-setting','program-dry-run','single-block-first-approach','graphics-segment-prediction','first-piece-inspection','alarm-troubleshooting','cutter-comp-risk','hole-cycle-troubleshooting','measurement-vs-machining-error'];\n    const ninetyOnly = await openPage(browser, {\n      cnc_training_profile_v1: completeProfile,\n      cnc_training_practice_v1: { wrongQuestions: [] },\n      cnc_training_simulator_v1: { records: Object.fromEntries(simulatorIds.map(id => [id, { bestScore: 90 }])) }\n    });\n    assert.strictEqual(await ninetyOnly.page.locator('#simulator-status').textContent(), '已通过 0/13 项', '13项都只有90分时不得提前完成模拟训练');\n    assert.match(await ninetyOnly.page.locator('#route-title').textContent(), /继续模拟训练（0\\/13）/);\n    assert.match(await ninetyOnly.page.locator('#route-cta').getAttribute('href'), /simulator-hub\\.html/);\n    await assertMobile(ninetyOnly); report.cases.ninetyIsNotPassed = true;\n    await ninetyOnly.page.close();\n\n    const fullyPassed = await openPage(browser, {\n      cnc_training_profile_v1: completeProfile,\n      cnc_training_practice_v1: { wrongQuestions: [] },\n      cnc_training_simulator_v1: { records: Object.fromEntries(simulatorIds.map((id, index) => [id, index % 2 === 0 ? { bestScore: 100 } : { passed: true, bestScore: 90 }])) }\n    });\n    assert.strictEqual(await fullyPassed.page.locator('#simulator-status').textContent(), '已通过 13/13 项', '100分或真实passed=true才可完成模拟训练');\n    assert.match(await fullyPassed.page.locator('#route-title').textContent(), /查看成长档案/);\n    assert.match(await fullyPassed.page.locator('#route-cta').getAttribute('href'), /profile\\.html/);\n    await assertMobile(fullyPassed); report.cases.fullPassRoute = true;\n    await fullyPassed.page.close();\n\n`;
  source = replaceRequired(source, anchor, scenario + anchor, '训练营模拟满分通过完整路线回归');
  write(relPath, source);
  changedBySync.add(relPath);
}

function updateMainTransitionPins() {
  const files = [
    'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',
    'cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs',
    'cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs'
  ];
  for (const file of files) {
    let source = read(file);
    const before = source;
    source = source.split(`currentMainPwaBuild = '${OLD_MAIN_PWA}'`).join(`currentMainPwaBuild = '${MAIN_PWA}'`);
    source = source.split(`[currentMainPwaBuild]: '${OLD_MAIN_CACHE}'`).join(`[currentMainPwaBuild]: '${MAIN_CACHE}'`);
    if (source === before) throw new Error(`当前main过渡基线未更新：${file}`);
    write(file, source);
    changedBySync.add(file);
  }
}

function updateBuildInfo() {
  const relPath = 'cnc/build-info.json';
  const info = JSON.parse(read(relPath));
  if (info.pwaBuild !== TARGET_PWA || info.cacheRevision !== TARGET_CACHE) throw new Error('PWA42全量替换后build-info版本不一致');
  if (!String(info.contentStage || '').includes('训练营模拟满分通过规则统一')) info.contentStage += ' · 训练营模拟满分通过规则统一';
  info.generatedAt = '2026-08-13T04:31:00+08:00';
  write(relPath, `${JSON.stringify(info, null, 2)}\n`);
  changedBySync.add(relPath);
}

function validateScopeAndGovernance() {
  execFileSync(process.execPath, [path.join(ROOT, 'cnc/tests/pwa-build-reference-audit-smoke.cjs')], { cwd: ROOT, stdio: 'inherit' });
  const stale = [];
  for (const file of [...walk(path.join(ROOT, 'cnc')), ...walk(path.join(ROOT, '.github', 'workflows')).filter(f => path.basename(f).startsWith('cnc-'))]) {
    const r = rel(file);
    if (r.startsWith('cnc/docs/') || r === 'cnc/MOBILE_HOME_REFACTOR_PROGRESS.md' || r.includes('/test-results/')) continue;
    const source = fs.readFileSync(file, 'utf8');
    if (source.includes(OLD_PWA)) {
      const allowedTransition = [
        'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',
        'cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs',
        'cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs'
      ].includes(r) && source.includes(`currentMainPwaBuild = '${MAIN_PWA}'`);
      if (!allowedTransition) stale.push(`${r}: ${OLD_PWA}`);
    }
  }
  if (stale.length) throw new Error(`仍有未受控PWA41运行引用：\n${stale.join('\n')}`);
  execFileSync(process.execPath, ['--check', path.join(ROOT, 'cnc/tests/mobile-training-camp-hub-smoke.cjs')], { cwd: ROOT, stdio: 'inherit' });
  const camp = read('cnc/training-camp.html');
  if (!camp.includes('best!==null&&best===100') || camp.includes('best!==null&&best>=80')) throw new Error('训练营模拟通过规则未收紧为满分');
  const diffNames = execFileSync('git', ['diff', '--name-only'], { cwd: ROOT, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
  for (const file of diffNames) {
    if (!(file.startsWith('cnc/') || file.startsWith('.github/workflows/cnc-'))) throw new Error(`越界修改：${file}`);
  }
  return diffNames;
}

function main() {
  patchTrainingCamp();
  patchTrainingCampTest();
  replaceOperationalPins();
  updateMainTransitionPins();
  updateBuildInfo();
  const diffNames = validateScopeAndGovernance();
  const report = {
    targetPwaBuild: TARGET_PWA,
    targetCacheRevision: TARGET_CACHE,
    currentMainTransitionPwaBuild: MAIN_PWA,
    currentMainTransitionCacheRevision: MAIN_CACHE,
    changedFiles: diffNames,
    changedBySync: [...changedBySync].sort(),
    trainingCampFullPassRule: true,
    pwaBuildReferenceAudit: true,
    scopeAudit: true
  };
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'changed-files.txt'), `${diffNames.join('\n')}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main();
