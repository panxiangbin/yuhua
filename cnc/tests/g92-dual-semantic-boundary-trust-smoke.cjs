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
  errors.push('首页脚本顺序异常：G92安全归一化器必须在gm-code-complete.js之前加载');
}
for (const core of ["'./search-aliases.js'", "'./gm-code-complete.js'"]) {
  if (!swText.includes(core)) errors.push(`PWA首次安装核心缺少G92可信目录依赖：${core}`);
}
if (!swText.includes("const BUILD = '20260818-pwa54'")) errors.push('Service Worker未升级到20260818-pwa54');
if (!swText.includes("const CACHE_REVISION = '20260818-learning54'")) errors.push('Service Worker缓存修订未升级到20260818-learning54');
if (buildInfo.pwaBuild !== '20260818-pwa54' || buildInfo.cacheRevision !== '20260818-learning54') {
  errors.push(`build-info与PWA38不一致：${buildInfo.pwaBuild} / ${buildInfo.cacheRevision}`);
}
if (!String(buildInfo.contentStage || '').includes('G92车铣双语义适用范围')) {
  errors.push('build-info缺少G92车铣双语义适用范围阶段标记');
}

if (!gmText.includes('"id": "kb-gcode-g92"')) errors.push('基础G/M目录缺少G92条目');
for (const token of [
  '车铣差异',
  '部分铣床/加工中心',
  '部分车床',
  '当前CNC与机床厂原厂手册',
  'G52/G54-G59',
  'X/Z或U/W',
  'I/Q/F',
  '主轴同步',
  '安全退刀空间',
  '两类程序不能直接互抄',
  '教学示例不得直接作为真实机床参数'
]) {
  if (!gmText.includes(token)) errors.push(`基础G92源目录缺少双语义安全边界：${token}`);
}
for (const forbidden of [
  '加工中心/旧系统可用于坐标设定，车床常用于简单螺纹循环。',
  '车床：G92 X20. Z-30. F1.5 表示螺纹循环。',
  'G92就是螺纹循环',
  'G92就是坐标设定',
  '所有车床的G92',
  '所有加工中心的G92'
]) {
  if (gmText.includes(forbidden)) errors.push(`基础G92源目录仍含无适用范围表述：${forbidden}`);
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
if (!guard || guard.version !== 'g10-g28-g50-g51-g53-g92-g93-g94-g95-g96-g97-g98-g99-boundary-11' || typeof guard.normalizeG92 !== 'function') {
  errors.push('G10/G28/G50/G51/G53/G92/G93/G94内容安全归一化器未安装、版本异常或缺少normalizeG92');
}
const catalog = sandbox.window.CNC_GM_CODES;
const g92 = Array.isArray(catalog) ? catalog.find(item => item && item.id === 'kb-gcode-g92') : null;
if (!g92) {
  errors.push('运行时G92知识条目缺失');
} else {
  const text = JSON.stringify(g92);
  for (const token of [
    '部分铣床/加工中心',
    '部分车床',
    '当前CNC与机床厂原厂手册',
    'G52/G54-G59',
    'X/Z或U/W',
    'I/Q/F',
    '主轴同步',
    '安全退刀空间',
    '两类程序不能直接互抄'
  ]) {
    if (!text.includes(token)) errors.push(`运行时G92条目缺少双语义安全边界：${token}`);
  }
  for (const forbidden of [
    '车床：G92 X20. Z-30. F1.5 表示螺纹循环。',
    'G92就是螺纹循环',
    'G92就是坐标设定'
  ]) {
    if (text.includes(forbidden)) errors.push(`运行时G92条目仍含无适用范围表述：${forbidden}`);
  }
  if (g92.risk !== '高') errors.push(`G92风险等级被降低：${g92.risk}`);
}

if (errors.length) {
  console.error('CNC G92车铣双语义可信度门禁失败：');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}
console.log('CNC G92车铣双语义可信度门禁通过：铣削坐标偏移/设定语义与车床螺纹循环语义被明确分开，地址、模态状态、清除方式、主轴同步与安全退刀空间必须按当前CNC和机床厂原厂手册核对；G/M离线核心已受包含G51的boundary-11保护。');
