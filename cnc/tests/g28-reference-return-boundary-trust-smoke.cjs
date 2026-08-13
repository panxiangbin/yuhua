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
  errors.push('首页脚本顺序异常：G28安全归一化器必须在gm-code-complete.js之前加载');
}

for (const core of ["'./search-aliases.js'", "'./gm-code-complete.js'"]) {
  if (!swText.includes(core)) errors.push(`PWA首次安装核心缺少G28可信目录依赖：${core}`);
}
if (!swText.includes("const BUILD = '20260813-pwa43'")) errors.push('Service Worker未升级到20260813-pwa43');
if (!swText.includes("const CACHE_REVISION = '20260813-learning43'")) errors.push('Service Worker缓存修订未升级到20260813-learning43');
if (buildInfo.pwaBuild !== '20260813-pwa43' || buildInfo.cacheRevision !== '20260813-learning43') {
  errors.push(`build-info与PWA38不一致：${buildInfo.pwaBuild} / ${buildInfo.cacheRevision}`);
}
if (!String(buildInfo.contentStage || '').includes('G28参考点返回适用范围')) {
  errors.push('build-info缺少G28参考点返回适用范围阶段标记');
}

// 第一层：基础G/M目录本身必须去掉把G91 G28 Z0或“先Z后XY”教成通用防撞口诀的旧表述。
if (!gmText.includes('"id": "kb-gcode-g28"')) errors.push('基础G/M目录缺少G28条目');
for (const token of [
  '高风险自动运动',
  'G90/G91',
  '绝对或增量解释',
  '当前CNC和机床厂',
  '原厂手册',
  '刀具',
  '刀柄',
  '工件',
  '夹具',
  '完整计划运动空间',
  '授权操作规程',
  '通用防撞规则'
]) {
  if (!gmText.includes(token)) errors.push(`基础G28源目录缺少安全边界：${token}`);
}
for (const forbidden of [
  '常配合G91 Z0先回Z，减少撞机',
  '建议先抬 Z 轴，再返回其他轴',
  '建议先抬Z轴，再返回其他轴',
  'G91 G28 Z0一定安全',
  'G91 G28 Z0可防止撞机',
  '必须先Z后XY',
  '先Z后XY一定安全'
]) {
  if (gmText.includes(forbidden)) errors.push(`基础G28源目录仍含无适用范围防撞表述：${forbidden}`);
}

// 第二层：标准页面运行时条目必须继续保持同一安全边界，不能只靠基础文本偶然命中。
const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
vm.createContext(sandbox);
try {
  vm.runInContext(aliasesText, sandbox, { filename: 'search-aliases.js' });
  vm.runInContext(gmText, sandbox, { filename: 'gm-code-complete.js' });
} catch (error) {
  errors.push(`G/M代码运行时目录无法加载：${error.message}`);
}

const guard = sandbox.window.CNC_GM_CONTENT_SAFETY;
if (!guard || guard.version !== 'g10-g28-g50-g51-g53-g92-g93-g94-g95-g96-g97-g98-g99-boundary-11' || typeof guard.normalizeG28 !== 'function') {
  errors.push('G10/G28/G50/G51/G53/G92/G93/G94内容安全归一化器未安装、版本异常或缺少normalizeG28');
}
const catalog = sandbox.window.CNC_GM_CODES;
const g28 = Array.isArray(catalog) ? catalog.find(item => item && item.id === 'kb-gcode-g28') : null;
if (!g28) {
  errors.push('运行时G28知识条目缺失');
} else {
  const text = JSON.stringify(g28);
  for (const token of [
    '高风险自动运动',
    'G90/G91',
    '绝对或增量',
    '当前CNC和机床厂',
    '原厂手册',
    '刀具',
    '刀柄',
    '工件',
    '夹具',
    '完整计划运动空间',
    '授权操作规程',
    '不能作为防撞保证'
  ]) {
    if (!text.includes(token)) errors.push(`运行时G28条目缺少安全边界：${token}`);
  }
  for (const forbidden of [
    '常配合G91 Z0先回Z，减少撞机',
    '建议先抬 Z 轴，再返回其他轴',
    '必须先Z后XY',
    'G91 G28 Z0一定安全'
  ]) {
    if (text.includes(forbidden)) errors.push(`运行时G28条目仍含无适用范围表述：${forbidden}`);
  }
  if (g28.risk !== '高') errors.push(`G28风险等级被降低：${g28.risk}`);
}

if (errors.length) {
  console.error('CNC G28参考点返回可信度门禁失败：');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}
console.log('CNC G28参考点返回可信度门禁通过：G28被限定为控制器/机床相关的高风险自动运动；G90/G91、中间位置、轴向与完整运动空间必须按本机原厂手册和现场授权规程核对，G91 G28 Z0或先Z后XY不得作为通用防撞保证；当前PWA38仍保留包含G51的boundary-11安全边界。');
