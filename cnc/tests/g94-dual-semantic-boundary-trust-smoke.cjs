const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '../..');
const aliasesPath = path.join(root, 'cnc/search-aliases.js');
const gmPath = path.join(root, 'cnc/gm-code-complete.js');
const indexPath = path.join(root, 'cnc/index.html');
const swPath = path.join(root, 'cnc/sw.js');
const buildInfoPath = path.join(root, 'cnc/build-info.json');
const aliasesText = fs.readFileSync(aliasesPath, 'utf8');
const gmText = fs.readFileSync(gmPath, 'utf8');
const indexText = fs.readFileSync(indexPath, 'utf8');
const swText = fs.readFileSync(swPath, 'utf8');
const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
const errors = [];

const aliasPos = indexText.indexOf('<script src="./search-aliases.js"></script>');
const gmPos = indexText.indexOf('<script src="./gm-code-complete.js"></script>');
if (aliasPos < 0 || gmPos < 0 || aliasPos >= gmPos) {
  errors.push('首页脚本顺序异常：G94安全归一化器必须在gm-code-complete.js之前加载');
}
for (const core of ["'./search-aliases.js'", "'./gm-code-complete.js'"]) {
  if (!swText.includes(core)) errors.push(`PWA首次安装核心缺少G94可信目录依赖：${core}`);
}
if (!swText.includes("const BUILD = '20260810-pwa34'")) errors.push('Service Worker未升级到20260810-pwa34');
if (!swText.includes("const CACHE_REVISION = '20260810-learning34'")) errors.push('Service Worker缓存修订未升级到20260810-learning34');
if (buildInfo.pwaBuild !== '20260810-pwa34' || buildInfo.cacheRevision !== '20260810-learning34') {
  errors.push(`build-info与PWA32不一致：${buildInfo.pwaBuild} / ${buildInfo.cacheRevision}`);
}
if (!String(buildInfo.contentStage || '').includes('G94车铣双语义适用范围')) {
  errors.push('build-info缺少G94车铣双语义适用范围阶段标记');
}

if (!gmText.includes('"id": "kb-gcode-g94"')) errors.push('基础G/M目录缺少G94条目');
for (const token of [
  '车铣差异',
  '部分铣床/加工中心',
  '部分车床',
  '当前CNC与机床厂原厂手册',
  'G93/G94/G95',
  '公制/英制',
  'F的单位',
  'X/Z或U/W',
  'K/F',
  '起始位置',
  '返回/退刀路径',
  '完整计划运动空间',
  '两类程序不能直接互抄',
  '教学示例不得直接作为真实机床参数'
]) {
  if (!gmText.includes(token)) errors.push(`基础G94源目录缺少双语义安全边界：${token}`);
}
for (const forbidden of [
  '铣床：G94（配合F）；车床示例：G94 X... Z... F...（系统相关）',
  'G94 X30.0 Z-10.0 F0.2',
  'G94就是每分钟进给',
  'G94就是端面车削循环',
  '所有车床的G94',
  '所有加工中心的G94'
]) {
  if (gmText.includes(forbidden)) errors.push(`基础G94源目录仍含无适用范围或可直接照抄表述：${forbidden}`);
}

const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
vm.createContext(sandbox);
try {
  vm.runInContext(aliasesText, sandbox, { filename: 'search-aliases.js' });
  vm.runInContext(gmText, sandbox, { filename: 'gm-code-complete.js' });
} catch (error) {
  errors.push(`G/M代码运行时目录无法加载：${error.message}`);
}

const guard = sandbox.window.CNC_GM_CONTENT_SAFETY;
if (!guard || guard.version !== 'g10-g28-g53-g92-g94-g96-g97-g98-g99-boundary-7' || typeof guard.normalizeG94 !== 'function') {
  errors.push('G10/G28/G53/G92/G94内容安全归一化器未安装、版本异常或缺少normalizeG94');
}
const catalog = sandbox.window.CNC_GM_CODES;
const g94 = Array.isArray(catalog) ? catalog.find(item => item && item.id === 'kb-gcode-g94') : null;
if (!g94) {
  errors.push('运行时G94知识条目缺失');
} else {
  const text = JSON.stringify(g94);
  for (const token of [
    '部分铣床/加工中心',
    '部分车床',
    '当前CNC与机床厂原厂手册',
    'G93/G94/G95',
    '公制/英制',
    'F的单位',
    'X/Z或U/W',
    'K/F',
    '起始位置',
    '返回/退刀路径',
    '完整计划运动空间',
    '两类程序不能直接互抄'
  ]) {
    if (!text.includes(token)) errors.push(`运行时G94条目缺少双语义安全边界：${token}`);
  }
  for (const forbidden of [
    'G94 X30.0 Z-10.0 F0.2',
    'G94就是每分钟进给',
    'G94就是端面车削循环'
  ]) {
    if (text.includes(forbidden)) errors.push(`运行时G94条目仍含无适用范围或可直接照抄表述：${forbidden}`);
  }
  if (g94.risk !== '高') errors.push(`G94风险等级被降低：${g94.risk}`);
}

if (errors.length) {
  console.error('CNC G94车铣双语义可信度门禁失败：');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}
console.log('CNC G94车铣双语义可信度门禁通过：铣床/加工中心每分钟进给模式与部分车床端面循环被明确分开；G93/G94/G95、单位制、F含义、循环地址、起始位置与返回路径必须按当前CNC和机床厂原厂手册核对，G/M离线核心正规升级到PWA32。');
