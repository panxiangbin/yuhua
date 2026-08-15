const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'test-results', 'g96-g97-spindle-mode-boundary-trust');
fs.mkdirSync(outDir, { recursive: true });

const aliasesText = fs.readFileSync(path.join(root, 'search-aliases.js'), 'utf8');
const gmText = fs.readFileSync(path.join(root, 'gm-code-complete.js'), 'utf8');
const swText = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const info = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json'), 'utf8'));
const status = fs.readFileSync(path.join(root, 'pwa-status.html'), 'utf8');
const selfTest = fs.readFileSync(path.join(root, 'pwa-self-test.html'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const errors = [];
const checks = {};

function check(name, condition, message) {
  checks[name] = Boolean(condition);
  if (!condition) errors.push(message);
}

check('pwa38Build', info.pwaBuild === '20260815-pwa47' && info.cacheRevision === '20260815-learning47', `构建版本错误：${info.pwaBuild}/${info.cacheRevision}`);
check('contentStage', String(info.contentStage || '').includes('G96/G97恒线速/恒转速适用范围'), 'build-info缺少G96/G97内容可信度阶段');
check('swBuild', swText.includes("const BUILD = '20260815-pwa47'") && swText.includes("const CACHE_REVISION = '20260815-learning47'"), 'Service Worker未对齐PWA38/learning38');
for (const core of ["'./search-aliases.js'", "'./gm-code-complete.js'"]) {
  check(`core:${core}`, swText.includes(core), `首次安装离线核心缺少：${core}`);
}
const aliasPos = index.indexOf('search-aliases.js');
const gmPos = index.indexOf('gm-code-complete.js');
check('loadOrder', aliasPos >= 0 && gmPos >= 0 && aliasPos < gmPos, '安全归一化器必须先于G/M基础目录加载');

for (const forbidden of [
  'G50 S2000；G96 S180',
  'G97 S800 M03',
  '用G96前先用G50限制最高转速',
  'G97后S就是转/分',
  '车床G96恒线速前限制最高转速',
  'G50 S2000 表示恒线速模式下主轴最高限制2000转/分'
]) {
  check(`baseForbidden:${forbidden}`, !gmText.includes(forbidden), `基础源仍含可直接照抄或跨系统误导内容：${forbidden}`);
}
for (const token of [
  '部分明确支持该车床语义',
  '当前CNC',
  '机床厂原厂手册',
  '单位制',
  'S',
  '最高允许主轴转速',
  '卡盘',
  '装夹',
  '工件',
  '刀具'
]) {
  check(`baseToken:${token}`, gmText.includes(token), `基础源缺少G96/G97安全边界：${token}`);
}
for (const token of [
  'g96-g97-spindle-mode-boundary',
  'G96/G97恒线速/恒转速适用范围',
  '当前CNC',
  '机床厂原厂手册',
  '最高允许主轴转速',
  '卡盘',
  '工件',
  '刀具'
]) {
  check(`status:${token}`, status.includes(token), `PWA状态页缺少G96/G97边界：${token}`);
  check(`selfTest:${token}`, selfTest.includes(token), `PWA自检页缺少G96/G97边界：${token}`);
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
check('guardVersion', guard && guard.version === 'g10-g28-g50-g51-g53-g92-g93-g94-g95-g96-g97-g98-g99-boundary-11', `运行时安全守卫版本错误：${guard?.version}`);
check('normalizeG96', typeof guard?.normalizeG96 === 'function', '运行时缺少normalizeG96');
check('normalizeG97', typeof guard?.normalizeG97 === 'function', '运行时缺少normalizeG97');

for (const code of ['G96', 'G97']) {
  const entry = (sandbox.window.CNC_GM_CODES || []).find(item => item.code === code);
  if (!entry) {
    errors.push(`运行时缺少${code}`);
    continue;
  }
  check(`${code}:risk`, entry.risk === '高', `${code}风险等级必须为高`);
  check(`${code}:manual`, `${entry.warning || ''}${entry.summary || ''}${entry.usage || ''}`.includes('原厂手册'), `${code}运行时未要求核对原厂手册`);
  check(`${code}:controller`, `${entry.warning || ''}${entry.summary || ''}${entry.usage || ''}`.includes('当前CNC'), `${code}运行时未限定当前CNC`);
  check(`${code}:limits`, `${entry.warning || ''}${entry.summary || ''}${entry.usage || ''}`.includes('最高允许主轴转速'), `${code}运行时缺少最高允许主轴转速边界`);
  const joined = [entry.summary, entry.usage, entry.beginner, entry.warning, entry.example, ...(entry.tags || [])].join(' ');
  for (const token of ['卡盘', '工件', '刀具']) check(`${code}:${token}`, joined.includes(token), `${code}运行时缺少安全上下文：${token}`);
  for (const forbidden of ['G50 S2000；G96 S180', 'G97 S800 M03', '用G96前先用G50限制最高转速', 'G97后S就是转/分']) {
    check(`${code}:forbidden:${forbidden}`, !joined.includes(forbidden), `${code}运行时仍含可直接照抄或跨系统口诀：${forbidden}`);
  }
}

const report = {
  testedAt: new Date().toISOString(),
  expected: { pwaBuild: '20260815-pwa47', cacheRevision: '20260815-learning47', guard: 'g10-g28-g50-g51-g53-g92-g93-g94-g95-g96-g97-g98-g99-boundary-11' },
  actual: { pwaBuild: info.pwaBuild, cacheRevision: info.cacheRevision, guard: guard?.version || null },
  checks,
  errors
};
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('CNC G96/G97恒线速与恒转速可信度门禁通过：只在明确支持相应车床语义的CNC范围内解释G96/G97；单位制、S含义、最高允许主轴转速及主轴/卡盘/装夹/工件/刀具限制必须按当前CNC与机床厂原厂手册确认；固定教学数值不得直接照抄上机；PWA38首次安装离线核心继续受包含G51的boundary-11保护。');
