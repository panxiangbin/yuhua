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
  errors.push('首页脚本顺序异常：G53安全归一化器必须在gm-code-complete.js之前加载');
}

for (const core of ["'./search-aliases.js'", "'./gm-code-complete.js'"]) {
  if (!swText.includes(core)) errors.push(`PWA首次安装核心缺少G53可信目录依赖：${core}`);
}
if (!swText.includes("const BUILD = '20260813-pwa44'")) errors.push('Service Worker未升级到20260813-pwa44');
if (!swText.includes("const CACHE_REVISION = '20260813-learning44'")) errors.push('Service Worker缓存修订未升级到20260813-learning44');
if (buildInfo.pwaBuild !== '20260813-pwa44' || buildInfo.cacheRevision !== '20260813-learning44') {
  errors.push(`build-info与PWA38不一致：${buildInfo.pwaBuild} / ${buildInfo.cacheRevision}`);
}
if (!String(buildInfo.contentStage || '').includes('G53机床坐标定位适用范围')) {
  errors.push('build-info缺少G53机床坐标定位适用范围阶段标记');
}

if (!gmText.includes('"id": "kb-gcode-g53"')) errors.push('基础G/M目录缺少G53条目');
for (const token of [
  '高风险运动',
  '机床坐标零点',
  '当前CNC和机床厂',
  '原厂手册',
  '刀具',
  '刀柄',
  '工件',
  '夹具',
  '完整计划运动空间',
  '刀补',
  '不能把Z0',
  '空运行'
]) {
  if (!gmText.includes(token)) errors.push(`基础G53源目录缺少安全边界：${token}`);
}
for (const forbidden of [
  '安全回换刀点、回固定机械位置时使用。',
  'G53 G00 Z0 表示以机床坐标快速移动到Z0。',
  'G53就是安全退刀',
  'G53 Z0一定安全',
  'G53 G00 Z0一定不会撞机'
]) {
  if (gmText.includes(forbidden)) errors.push(`基础G53源目录仍含无适用范围表述：${forbidden}`);
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
if (!guard || guard.version !== 'g10-g28-g50-g51-g53-g92-g93-g94-g95-g96-g97-g98-g99-boundary-11' || typeof guard.normalizeG53 !== 'function') {
  errors.push('G10/G28/G50/G51/G53/G92/G93/G94内容安全归一化器未安装、版本异常或缺少normalizeG53');
}
const catalog = sandbox.window.CNC_GM_CODES;
const g53 = Array.isArray(catalog) ? catalog.find(item => item && item.id === 'kb-gcode-g53') : null;
if (!g53) {
  errors.push('运行时G53知识条目缺失');
} else {
  const text = JSON.stringify(g53);
  for (const token of [
    '高风险运动',
    '非模态',
    '机床坐标零点',
    '当前CNC和机床厂',
    '原厂手册',
    '刀补',
    '刀具',
    '刀柄',
    '工件',
    '夹具',
    '完整计划运动空间',
    '不能把Z0',
    '空运行'
  ]) {
    if (!text.includes(token)) errors.push(`运行时G53条目缺少安全边界：${token}`);
  }
  for (const forbidden of [
    '安全回换刀点、回固定机械位置时使用。',
    'G53 G00 Z0 表示以机床坐标快速移动到Z0。',
    'G53就是安全退刀',
    'G53 Z0一定安全'
  ]) {
    if (text.includes(forbidden)) errors.push(`运行时G53条目仍含无适用范围表述：${forbidden}`);
  }
  if (g53.risk !== '高') errors.push(`G53风险等级被降低：${g53.risk}`);
}

if (errors.length) {
  console.error('CNC G53机床坐标定位可信度门禁失败：');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}
console.log('CNC G53机床坐标定位可信度门禁通过：G53被限定为控制器/机床相关的高风险非模态机床坐标运动；机床坐标零点、刀补影响、目标位置与完整运动空间必须按本机原厂手册核对并先做受控空运行，Z0或换刀位置不得作为跨机床通用安全点；当前PWA38仍保留包含G51的boundary-11边界。');
