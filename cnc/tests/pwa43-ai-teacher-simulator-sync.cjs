'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OLD_PWA = '20260813-pwa42';
const OLD_CACHE = '20260813-learning42';
const NEW_PWA = '20260813-pwa43';
const NEW_CACHE = '20260813-learning43';
const OLD_MAIN_PWA = '20260812-pwa41';
const OLD_MAIN_CACHE = '20260812-learning41';
const REPORT_DIR = path.join(ROOT, 'cnc', 'test-results', 'pwa43-ai-teacher-simulator-sync');
const REPORT_PATH = path.join(REPORT_DIR, 'sync-report.json');

const PWA_FILES = [
  '.github/workflows/cnc-ai-teacher-offline-core-pages-smoke.yml',
  '.github/workflows/cnc-beginner-placement-offline-pages-smoke.yml',
  '.github/workflows/cnc-g95-cold-offline-source-trust-smoke.yml',
  '.github/workflows/cnc-g96-g97-cold-offline-source-trust-smoke.yml',
  '.github/workflows/cnc-g98-g99-cold-offline-source-trust-smoke.yml',
  '.github/workflows/cnc-learning-media-smoke.yml',
  '.github/workflows/cnc-pwa-offline-cache-smoke.yml',
  '.github/workflows/cnc-pwa-self-test-smoke.yml',
  '.github/workflows/cnc-pwa-upgrade-data-smoke.yml',
  '.github/workflows/cnc-training-camp-route-handoff-pages-smoke.yml',
  'cnc/MOBILE_LEARNING_MEDIA_PROGRESS.md',
  'cnc/build-info.json',
  'cnc/pwa-self-test.html',
  'cnc/pwa-status.html',
  'cnc/sw.js',
  'cnc/tests/g10-programmable-data-input-trust-smoke.cjs',
  'cnc/tests/g28-reference-return-boundary-trust-smoke.cjs',
  'cnc/tests/g53-machine-coordinate-boundary-trust-smoke.cjs',
  'cnc/tests/g92-dual-semantic-boundary-trust-smoke.cjs',
  'cnc/tests/g94-dual-semantic-boundary-trust-smoke.cjs',
  'cnc/tests/g95-cold-offline-source-trust-smoke.cjs',
  'cnc/tests/g95-dual-semantic-boundary-trust-smoke.cjs',
  'cnc/tests/g96-g97-cold-offline-source-trust-smoke.cjs',
  'cnc/tests/g96-g97-spindle-mode-boundary-trust-smoke.cjs',
  'cnc/tests/g98-g99-cold-offline-source-trust-smoke.cjs',
  'cnc/tests/g98-g99-dual-semantic-boundary-trust-smoke.cjs',
  'cnc/tests/mobile-pwa-offline-cache-smoke.cjs',
  'cnc/tests/mobile-pwa-profile-bfcache-smoke.cjs',
  'cnc/tests/mobile-pwa-upgrade-data-smoke.cjs',
  'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',
  'cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs',
  'cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs'
];
const TRANSITION_FILES = [
  'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',
  'cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs',
  'cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs'
];
const AI_FILE = 'cnc/ai-teacher.html';
const AI_TEST = 'cnc/tests/ai-teacher-data-integrity-smoke.cjs';
const changed = [];

function abs(file) { return path.join(ROOT, file); }
function read(file) { return fs.readFileSync(abs(file), 'utf8'); }
function writeIfChanged(file, before, after) {
  if (before === after) return false;
  fs.writeFileSync(abs(file), after);
  changed.push(file);
  return true;
}
function requireToken(source, token, label) {
  if (!source.includes(token)) throw new Error(`缺少预期令牌：${label}`);
}

fs.mkdirSync(REPORT_DIR, { recursive: true });

for (const file of PWA_FILES) {
  const before = read(file);
  let after = before.split(OLD_PWA).join(NEW_PWA).split(OLD_CACHE).join(NEW_CACHE);
  if (before === after) throw new Error(`受控PWA同步文件没有发现旧构建针：${file}`);
  writeIfChanged(file, before, after);
}

for (const file of TRANSITION_FILES) {
  const before = read(file);
  requireToken(before, `const currentMainPwaBuild = '${OLD_MAIN_PWA}'`, `${file} current main PWA`);
  requireToken(before, `[currentMainPwaBuild]: '${OLD_MAIN_CACHE}'`, `${file} current main cache`);
  const after = before
    .replace(`const currentMainPwaBuild = '${OLD_MAIN_PWA}'`, `const currentMainPwaBuild = '${OLD_PWA}'`)
    .replace(`[currentMainPwaBuild]: '${OLD_MAIN_CACHE}'`, `[currentMainPwaBuild]: '${OLD_CACHE}'`);
  writeIfChanged(file, before, after);
}

{
  const before = read(AI_FILE);
  const oldBlock = "  function simulatorRows(simulator){const nestedRecords=simulator.records;const legacyRecords=simulator.simulators;const root=isRecord(nestedRecords)?nestedRecords:(isRecord(legacyRecords)?legacyRecords:simulator);if(!isRecord(root))return [];return Object.values(root).filter(value=>isRecord(value)&&('passed'in value||'bestScore'in value||'score'in value))}\n  function normalizedScore(value){const raw=isRecord(value)&&value.score!==undefined?value.score:value;return typeof raw==='number'&&Number.isFinite(raw)&&raw>=0&&raw<=100?raw:null}\n  function simulationPassed(row){const raw=row.bestScore!==undefined?row.bestScore:row.score;const score=normalizedScore(raw);return row.passed===true||(score!==null&&score>=80)}";
  const newBlock = "  const SIMULATOR_IDS=['homing','workholding-check','tool-installation','tool-length-offset-check','work-offset-setting','program-dry-run','single-block-first-approach','graphics-segment-prediction','first-piece-inspection','alarm-troubleshooting','cutter-comp-risk','hole-cycle-troubleshooting','measurement-vs-machining-error'];\n  function normalizedScore(value){const raw=isRecord(value)&&value.score!==undefined?value.score:value;return typeof raw==='number'&&Number.isFinite(raw)&&raw>=0&&raw<=100?raw:null}\n  function simulatorSignature(row){return [row.lastCompletedAt||row.updatedAt||'',row.bestScore??row.best??row.score??'',row.attempts??'',row.passed??''].join('|')}\n  function simulatorRows(simulator){const records=isRecord(simulator.records)?simulator.records:{};const legacy=isRecord(simulator.simulators)?simulator.simulators:{};return SIMULATOR_IDS.map(id=>{const candidates=[records[id],legacy[id],simulator[id]].filter(isRecord);const unique=[];const seen=new Set();candidates.forEach(row=>{const signature=simulatorSignature(row);if(!seen.has(signature)){seen.add(signature);unique.push(row)}});if(!unique.length)return null;const scores=unique.map(row=>normalizedScore(row.bestScore??row.best??row.score)).filter(score=>score!==null);const bestScore=scores.length?Math.max(...scores):null;const passed=unique.some(row=>row.passed===true)||bestScore===100;return{id,passed,bestScore,sources:unique.length}}).filter(Boolean)}\n  function simulationPassed(row){return row.passed===true}";
  requireToken(before, oldBlock, 'AI老师旧模拟聚合/80分通过实现');
  const after = before.replace(oldBlock, newBlock);
  writeIfChanged(AI_FILE, before, after);
}

{
  const before = read(AI_TEST);
  requireToken(before, "&& source.includes('const nestedRecords=simulator.records;const legacyRecords=simulator.simulators;')", 'AI测试旧schema静态门禁');
  requireToken(before, "scorePass: { passed: false, bestScore: 80 },", 'AI测试旧80分通过夹具');
  let after = before
    .replace("&& source.includes('const nestedRecords=simulator.records;const legacyRecords=simulator.simulators;')", "&& source.includes(\"const SIMULATOR_IDS=['homing','workholding-check','tool-installation'\")\n    && source.includes('const records=isRecord(simulator.records)?simulator.records:{};const legacy=isRecord(simulator.simulators)?simulator.simulators:{};')\n    && source.includes('const passed=unique.some(row=>row.passed===true)||bestScore===100')")
    .replace("        booleanPass: { passed: true, score: 10 },\n        scorePass: { passed: false, bestScore: 80 },\n        stringScore: { passed: false, bestScore: '999' },\n        infinityString: { passed: false, score: 'Infinity' },\n        overRange: { passed: false, score: 120 },\n        negative: { passed: false, score: -5 },\n        stringPassed: { passed: 'true', score: 0 },\n        arrayRecord: [{ passed: true, score: 100 }],\n        nullRecord: null\n      }", "        homing: { passed: true, score: 10 },\n        'workholding-check': { passed: false, bestScore: 100 },\n        'tool-installation': { passed: false, bestScore: 90 },\n        'program-dry-run': { passed: false, bestScore: '100' },\n        'single-block-first-approach': { passed: false, score: 'Infinity' },\n        'graphics-segment-prediction': { passed: false, score: 120 },\n        'first-piece-inspection': { passed: false, score: -5 },\n        'alarm-troubleshooting': { passed: 'true', score: 0 },\n        unknownSimulator: { passed: true, score: 100 },\n        arrayRecord: [{ passed: true, score: 100 }],\n        nullRecord: null\n      },\n      simulators: {\n        'work-offset-setting': { passed: true, bestScore: 20 },\n        'workholding-check': { passed: false, bestScore: 100 }\n      }")
    .replace("report.nestedSimulatorFiltered = nested.summary?.simulations === 2 && visibleNested.simulations === '2/13';", "report.nestedSimulatorFiltered = nested.summary?.simulations === 3 && visibleNested.simulations === '3/13';")
    .replace("新版 records 模拟结构与嵌套异常安全过滤", "固定13项ID、新旧模拟schema合并与满分通过过滤")
    .replace("新版records结构必须正确统计，且字符串passed、字符串/越界/负数成绩或数组记录不得冒充模拟通过", "固定13项模拟ID必须合并新版records与旧simulators，90分、未知ID、字符串passed、字符串/越界/负数成绩或数组记录不得冒充模拟通过");
  writeIfChanged(AI_TEST, before, after);
}

{
  const file = 'cnc/build-info.json';
  const before = read(file);
  const info = JSON.parse(before);
  if (info.pwaBuild !== NEW_PWA || info.cacheRevision !== NEW_CACHE) throw new Error(`build-info构建针同步异常：${info.pwaBuild}/${info.cacheRevision}`);
  const stage = 'AI老师模拟固定13项ID与满分通过规则统一';
  if (!String(info.contentStage || '').includes(stage)) info.contentStage = `${info.contentStage} · ${stage}`;
  info.generatedAt = '2026-08-13T08:29:00+08:00';
  const after = `${JSON.stringify(info, null, 2)}\n`;
  if (before !== after && !changed.includes(file)) changed.push(file);
  fs.writeFileSync(abs(file), after);
}

const expected = new Set([...PWA_FILES, AI_FILE, AI_TEST]);
const actual = new Set(changed);
const missing = [...expected].filter(file => !actual.has(file));
const unexpected = [...actual].filter(file => !expected.has(file));
if (missing.length || unexpected.length) throw new Error(`受控变更范围异常 missing=${missing.join(',')} unexpected=${unexpected.join(',')}`);
if (changed.length !== 34) throw new Error(`受控变更文件数应为34，实际${changed.length}`);

const report = {
  generatedAt: new Date().toISOString(),
  from: { pwaBuild: OLD_PWA, cacheRevision: OLD_CACHE, currentMainPwaBuild: OLD_MAIN_PWA },
  to: { pwaBuild: NEW_PWA, cacheRevision: NEW_CACHE, currentMainPwaBuild: OLD_PWA },
  aiTeacher: {
    fixedSimulatorIds: 13,
    passRule: 'passed===true or valid numeric best score === 100',
    rejects: ['90-point score alone', 'unknown simulator id', 'numeric strings', 'out-of-range score', 'array/null record'],
    mergesSchemas: ['records', 'simulators', 'historical root'],
    readOnly: true
  },
  changedFiles: changed.sort(),
  changedFileCount: changed.length
};
fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
