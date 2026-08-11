'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const GM_PATH = path.join(ROOT, 'gm-code-complete.js');
const ALIAS_PATH = path.join(ROOT, 'search-aliases.js');
const REPORT_PATH = path.resolve(process.env.CNC_G50_REPORT || 'cnc-g50-multi-semantic-runtime-trust-report.json');
const EXPECTED_HEAD = process.env.EXPECTED_HEAD || '';

const report = {
  gate: 'CNC G50 multi-semantic runtime trust',
  expectedHead: EXPECTED_HEAD,
  checkedFiles: ['cnc/gm-code-complete.js', 'cnc/search-aliases.js'],
  ok: false,
  checks: [],
  error: null
};

function check(condition, message, details) {
  report.checks.push({ message, ok: Boolean(condition), details: details || null });
  if (!condition) throw new Error(message + (details ? `: ${details}` : ''));
}

function getRawCatalog(gmSource) {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(gmSource, context, { filename: GM_PATH });
  return context.window.CNC_GM_CODES;
}

function getRuntimeCatalog(aliasSource, gmSource) {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(aliasSource, context, { filename: ALIAS_PATH });
  vm.runInContext(gmSource, context, { filename: GM_PATH });
  return context.window.CNC_GM_CODES;
}

function textOf(entry) {
  return [entry.title, entry.summary, entry.usage, entry.beginner, entry.warning, entry.example, ...(entry.tags || [])]
    .filter(Boolean)
    .join(' ');
}

function assertG50Entry(entry, layer) {
  check(entry && entry.id === 'kb-gcode-g50', `${layer}：必须存在 G50 条目`);
  check(entry.risk === '高', `${layer}：G50 风险等级必须为“高”`, `actual=${entry.risk}`);

  const text = textOf(entry);
  check(/不同机型|不同.*控制器|机型不同|控制器.*不同/.test(text), `${layer}：必须明确 G50 语义会随机型或控制器变化`);
  check(/车床/.test(text), `${layer}：必须说明车床侧存在独立语义`);
  check(/主轴.*(?:限速|最高转速)|(?:限速|最高转速).*主轴/.test(text), `${layer}：必须覆盖车床主轴限速类语义边界`);
  check(/铣床|加工中心/.test(text), `${layer}：必须说明铣床/加工中心侧存在独立语义`);
  check(/缩放/.test(text), `${layer}：必须覆盖铣床/加工中心取消缩放类语义边界`);
  check(text.includes('当前CNC'), `${layer}：必须要求确认当前CNC`);
  check(text.includes('原厂手册'), `${layer}：必须要求核对机床厂原厂手册`);
  check(/组别|模式/.test(text), `${layer}：必须要求确认本机 G50 的组别或模式`);

  check(/主轴/.test(text) && /卡盘/.test(text) && /工件/.test(text) && /刀具/.test(text), `${layer}：车床限速语义必须同时提示主轴、卡盘、工件、刀具限制`);

  const example = String(entry.example || '');
  check(!/\bS\s*[-+]?\d/i.test(example), `${layer}：不得提供可直接照抄的固定 S 数值`, example);
  check(!/\b[XYZABC]\s*[-+]?\d/i.test(example), `${layer}：不得提供可直接照抄的固定轴位置`, example);
  check(!/(?:倍率|缩放(?:率|比例)?)[^。；;\n]{0,12}\b\d+(?:\.\d+)?/i.test(example), `${layer}：不得提供可直接照抄的固定缩放倍率`, example);

  if (/坐标设定|坐标设置|坐标偏移/.test(text)) {
    check(/旧程序|部分|可能|具体|当前CNC|原厂手册/.test(text), `${layer}：坐标类语义若出现必须限定适用范围，不能写成通用定义`);
  }
}

try {
  const gmSource = fs.readFileSync(GM_PATH, 'utf8');
  const aliasSource = fs.readFileSync(ALIAS_PATH, 'utf8');
  const selfSource = fs.readFileSync(__filename, 'utf8');
  const workflowPath = path.resolve(ROOT, '..', '.github', 'workflows', 'cnc-g50-multi-semantic-runtime-trust-smoke.yml');
  const workflowSource = fs.readFileSync(workflowPath, 'utf8');

  const forbiddenChecks = [
    { re: /\.skip\s*\(/, label: 'test bypass invocation' },
    { re: /process\.exit\s*\(\s*0\s*\)/, label: 'forced successful exit' },
    { re: /continue-on-error\s*:/, label: 'error-tolerant workflow directive' }
  ];
  for (const item of forbiddenChecks) {
    check(!item.re.test(selfSource), `测试自身不得包含绕过：${item.label}`);
    check(!item.re.test(workflowSource), `工作流不得包含绕过：${item.label}`);
  }

  check(aliasSource.includes('function normalizeG50(entry)'), '运行时第二层防御必须实现 normalizeG50');
  check(/normalizeCatalog[\s\S]*normalizeG50/.test(aliasSource), 'normalizeCatalog 必须调用 normalizeG50');
  check(/normalizeG50\s*:\s*normalizeG50/.test(aliasSource), '安全守卫导出必须包含 normalizeG50');

  const rawCatalog = getRawCatalog(gmSource);
  check(Array.isArray(rawCatalog), '基础源 CNC_GM_CODES 必须为数组');
  const rawG50 = rawCatalog.find((entry) => entry && entry.id === 'kb-gcode-g50');
  assertG50Entry(rawG50, '基础源');

  const runtimeCatalog = getRuntimeCatalog(aliasSource, gmSource);
  check(Array.isArray(runtimeCatalog), '运行时 CNC_GM_CODES 必须为数组');
  const runtimeG50 = runtimeCatalog.find((entry) => entry && entry.id === 'kb-gcode-g50');
  assertG50Entry(runtimeG50, '运行时');

  report.ok = true;
  console.log('G50 multi-semantic runtime trust smoke: PASS');
} catch (error) {
  report.error = { message: error.message, stack: error.stack };
  process.exitCode = 1;
  console.error('G50 multi-semantic runtime trust smoke: FAIL');
  console.error(error.stack || error.message);
} finally {
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`diagnostic report: ${REPORT_PATH}`);
}
