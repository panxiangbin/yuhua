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
  errors.push('首页脚本顺序异常：G95安全归一化器必须在gm-code-complete.js之前加载');
}
for (const core of ["'./search-aliases.js'", "'./gm-code-complete.js'"]) {
  if (!swText.includes(core)) errors.push(`PWA首次安装核心缺少G95可信目录依赖：${core}`);
}
if (!swText.includes("const BUILD = '20260815-pwa47'")) errors.push('Service Worker未升级到20260815-pwa47');
if (!swText.includes("const CACHE_REVISION = '20260815-learning47'")) errors.push('Service Worker缓存修订未升级到20260815-learning47');
if (buildInfo.pwaBuild !== '20260815-pwa47' || buildInfo.cacheRevision !== '20260815-learning47') {
  errors.push(`build-info与PWA38不一致：${buildInfo.pwaBuild} / ${buildInfo.cacheRevision}`);
}
if (!String(buildInfo.contentStage || '').includes('G95车铣双语义适用范围')) {
  errors.push('build-info缺少G95车铣双语义适用范围阶段标记');
}

const g95Match = gmText.match(/\{\s*"id":\s*"kb-gcode-g95"[\s\S]*?\n\s*\},\n\s*\{\s*\n?\s*"id":\s*"kb-gcode-g96"/);
if (!g95Match) {
  errors.push('基础G/M目录缺少可独立审计的G95条目');
}
const g95Source = g95Match ? g95Match[0].replace(/\n\s*\{\s*\n?\s*"id":\s*"kb-gcode-g96"[\s\S]*$/, '') : '';
for (const token of [
  '车铣差异',
  '部分铣床/加工中心CNC',
  '部分车床CNC',
  '每转进给',
  '动力刀具端面刚性攻丝',
  '当前CNC',
  'G代码组别',
  '机床厂原厂手册',
  '单位制',
  'F地址单位',
  '同步攻丝',
  '两类程序不能互抄',
  '不提供可直接照抄的固定参数'
]) {
  if (!g95Source.includes(token)) errors.push(`基础G95源目录缺少双语义安全边界：${token}`);
}
for (const forbidden of [
  'G95 F0.2',
  'F0.2',
  '车床常用G95配合',
  'G95就是每转进给',
  'G95就是刚性攻丝',
  '所有车床的G95',
  '所有加工中心的G95'
]) {
  if (g95Source.includes(forbidden)) errors.push(`基础G95源目录仍含无适用范围或可直接照抄表述：${forbidden}`);
}

for (const normalizer of ['normalizeG94', 'normalizeG95', 'normalizeG96', 'normalizeG97', 'normalizeG98', 'normalizeG99']) {
  if (!aliasesText.includes(`function ${normalizer}(entry)`)) errors.push(`高风险归一化链缺少${normalizer}`);
}
if (!aliasesText.includes('G10/G28/G50/G51/G53/G92/G93/G94/G95/G96/G97/G98/G99')) {
  errors.push('高风险归一化器说明未纳入G95/G51');
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
if (!guard || guard.version !== 'g10-g28-g50-g51-g53-g92-g93-g94-g95-g96-g97-g98-g99-boundary-11' || typeof guard.normalizeG95 !== 'function') {
  errors.push('G95内容安全归一化器未安装、版本异常或缺少normalizeG95');
}
const catalog = sandbox.window.CNC_GM_CODES;
const g95 = Array.isArray(catalog) ? catalog.find(item => item && item.id === 'kb-gcode-g95') : null;
if (!g95) {
  errors.push('运行时G95知识条目缺失');
} else {
  const text = JSON.stringify(g95);
  for (const token of [
    '部分铣床/加工中心CNC',
    '部分车床CNC',
    '每转进给',
    '动力刀具端面刚性攻丝',
    '当前CNC',
    'G代码组别',
    '机床厂原厂手册',
    '单位制',
    'F地址单位',
    '同步攻丝',
    '两类程序不能互抄',
    '不提供可直接照抄的固定参数'
  ]) {
    if (!text.includes(token)) errors.push(`运行时G95条目缺少双语义安全边界：${token}`);
  }
  for (const forbidden of [
    'G95 F0.2',
    'F0.2',
    '车床常用G95配合',
    'G95就是每转进给',
    'G95就是刚性攻丝'
  ]) {
    if (text.includes(forbidden)) errors.push(`运行时G95条目仍含无适用范围或可直接照抄表述：${forbidden}`);
  }
  if (g95.risk !== '高') errors.push(`G95风险等级被降低：${g95.risk}`);
}

if (errors.length) {
  console.error('CNC G95车铣双语义可信度门禁失败：');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}
console.log('CNC G95车铣双语义可信度门禁通过：部分铣床/加工中心的每转进给语义与部分车床的动力刀具端面刚性攻丝语义已明确分开；机床类型、当前CNC、G代码组别、单位制、F/S及循环地址必须按机床厂原厂手册和现场安全规程核对，离线核心继续受包含G51的boundary-11保护。');
