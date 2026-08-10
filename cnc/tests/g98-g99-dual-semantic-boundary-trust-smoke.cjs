const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const aliasesText = fs.readFileSync(path.join(root, 'search-aliases.js'), 'utf8');
const gmText = fs.readFileSync(path.join(root, 'gm-code-complete.js'), 'utf8');
const swText = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const info = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json'), 'utf8'));
const status = fs.readFileSync(path.join(root, 'pwa-status.html'), 'utf8');
const selfTest = fs.readFileSync(path.join(root, 'pwa-self-test.html'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const errors = [];

if (info.pwaBuild !== '20260810-pwa33' || info.cacheRevision !== '20260810-learning33') errors.push(`构建版本错误：${info.pwaBuild}/${info.cacheRevision}`);
if (!String(info.contentStage || '').includes('G98/G99车铣双语义适用范围')) errors.push('build-info缺少G98/G99内容可信度阶段');
if (!swText.includes("const BUILD = '20260810-pwa33'") || !swText.includes("const CACHE_REVISION = '20260810-learning33'")) errors.push('Service Worker未对齐PWA33/learning33');
for (const core of ["'./search-aliases.js'", "'./gm-code-complete.js'"]) if (!swText.includes(core)) errors.push(`首次安装离线核心缺少：${core}`);
const aliasPos = index.indexOf('search-aliases.js');
const gmPos = index.indexOf('gm-code-complete.js');
if (aliasPos < 0 || gmPos < 0 || aliasPos >= gmPos) errors.push('安全归一化器必须先于G/M基础目录加载');

for (const forbidden of ['G98比G99退得更高', 'G99效率高，但要求R平面绝对安全', 'G99效率高', 'R平面绝对安全']) {
  if (gmText.includes(forbidden)) errors.push(`基础源仍含误导性通用口诀：${forbidden}`);
}
for (const token of ['G98不是跨机型同一含义', 'G99不是跨机型同一含义', '初始Z平面', 'R平面', '每分钟进给', '每转进给', '原厂手册', '完整计划运动空间']) {
  if (!gmText.includes(token)) errors.push(`基础源缺少G98/G99安全边界：${token}`);
}
for (const token of ['g98-g99-dual-semantic-boundary', '不能把“G98一定更高”', 'G99一定更低、更快、更安全', '原厂手册']) {
  if (!status.includes(token)) errors.push(`PWA状态页缺少边界：${token}`);
  if (!selfTest.includes(token)) errors.push(`PWA自检页缺少边界：${token}`);
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
if (!guard || guard.version !== 'g10-g28-g53-g92-g94-g98-g99-boundary-6') errors.push(`运行时安全守卫版本错误：${guard?.version}`);
if (typeof guard?.normalizeG98 !== 'function' || typeof guard?.normalizeG99 !== 'function') errors.push('运行时缺少normalizeG98/normalizeG99');
for (const code of ['G98', 'G99']) {
  const entry = (sandbox.window.CNC_GM_CODES || []).find(item => item.code === code);
  if (!entry) { errors.push(`运行时缺少${code}`); continue; }
  if (entry.risk !== '高') errors.push(`${code}风险等级必须为高`);
  for (const token of ['车铣差异', '原厂手册']) if (!(entry.tags || []).includes(token)) errors.push(`${code}缺少标签：${token}`);
  if (!entry.summary.includes('不是跨机型同一含义')) errors.push(`${code}运行时摘要未区分车铣语义`);
  if (!entry.warning.includes('原厂手册')) errors.push(`${code}运行时警告未要求核对原厂手册`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('CNC G98/G99车铣双语义可信度门禁通过：铣削固定循环返回初始平面/R平面与车床每分钟/每转进给被明确分开，不再使用“G98一定更高、G99一定更低或绝对安全”的通用口诀；真实机床须核对当前CNC和机床厂原厂手册并做受控验证；PWA33首次安装离线核心继续保护该边界。');
