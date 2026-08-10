'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const GM_PATH = path.join(ROOT, 'gm-code-complete.js');
const ALIAS_PATH = path.join(ROOT, 'search-aliases.js');
const REPORT_PATH = path.resolve(process.env.CNC_G93_REPORT || 'cnc-g93-inverse-time-feed-trust-report.json');
const EXPECTED_HEAD = process.env.EXPECTED_HEAD || '';

const report = {
  gate: 'CNC G93 inverse-time feed safety trust',
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

function assertSafetyEntry(entry, layer) {
  check(entry && entry.id === 'kb-gcode-g93', `${layer}：必须存在 G93 条目`);
  check(entry.risk === '高', `${layer}：G93 风险等级必须为“高”`, `actual=${entry.risk}`);

  const text = textOf(entry);
  check(/部分.*(?:铣床|加工中心)|(?:铣床|加工中心).*部分/.test(text), `${layer}：必须限定为部分铣床/加工中心 CNC 的适用场景`);
  check(text.includes('当前CNC'), `${layer}：必须要求确认当前CNC`);
  check(text.includes('原厂手册'), `${layer}：必须要求核对机床厂原厂手册`);
  check(text.includes('G94') && text.includes('G95'), `${layer}：必须提示 G93/G94/G95 模式或组别关系需按本机确认`);
  check(/F地址|F 地址/.test(text), `${layer}：必须明确 F 地址解释边界`);
  check(text.includes('单位'), `${layer}：必须提示 F 单位需按当前 CNC 核对`);
  check(/逐段|每个插补段|每一插补段/.test(text), `${layer}：必须提示逐段 F 要求不能跨系统照抄`);
  check(/4\s*\/\s*5轴|4轴|5轴/.test(text), `${layer}：必须提示 4/5 轴场景`);
  check(text.includes('CAM'), `${layer}：必须提示 CAM/后处理边界`);
  check(text.includes('运动学'), `${layer}：必须提示本机运动学边界`);
  check(text.includes('碰撞'), `${layer}：必须提示碰撞空间风险`);

  const example = String(entry.example || '');
  const fixedNumericG93 = /\bG93\b[^\n]*(?:\b[XYZABC]\s*[-+]?\d|\bF\s*[-+]?\d)/i;
  check(!fixedNumericG93.test(example), `${layer}：教学示例不得提供可直接照抄的固定 F 或轴位置`, example);

  if (/RESET/i.test(text)) {
    check(/Haas|例如|示例|特定|本机|当前CNC/.test(text), `${layer}：RESET→G94 若出现必须明确限定控制体系，不能写成通用规则`);
  }
}

try {
  const gmSource = fs.readFileSync(GM_PATH, 'utf8');
  const aliasSource = fs.readFileSync(ALIAS_PATH, 'utf8');
  const selfSource = fs.readFileSync(__filename, 'utf8');
  const workflowPath = path.resolve(ROOT, '..', '.github', 'workflows', 'cnc-g93-inverse-time-feed-safety-trust-smoke.yml');
  const workflowSource = fs.readFileSync(workflowPath, 'utf8');

  const forbiddenChecks = [
    { re: /\.skip\s*\(/, label: '.skip(' },
    { re: /process\.exit\s*\(\s*0\s*\)/, label: 'process exit zero' },
    { re: /continue-on-error\s*:/, label: 'continue-on-error' }
  ];
  for (const item of forbiddenChecks) {
    check(!item.re.test(selfSource), `测试自身不得包含绕过：${item.label}`);
    check(!item.re.test(workflowSource), `工作流不得包含绕过：${item.label}`);
  }

  check(aliasSource.includes('function normalizeG93(entry)'), '运行时第二层防御必须实现 normalizeG93');
  check(/normalizeCatalog[\s\S]*normalizeG93/.test(aliasSource), 'normalizeCatalog 必须调用 normalizeG93');
  check(/normalizeG93\s*:\s*normalizeG93/.test(aliasSource), '安全守卫导出必须包含 normalizeG93');

  const rawCatalog = getRawCatalog(gmSource);
  check(Array.isArray(rawCatalog), '基础源 CNC_GM_CODES 必须为数组');
  const rawG93 = rawCatalog.find((entry) => entry && entry.id === 'kb-gcode-g93');
  assertSafetyEntry(rawG93, '基础源');

  const runtimeCatalog = getRuntimeCatalog(aliasSource, gmSource);
  check(Array.isArray(runtimeCatalog), '运行时 CNC_GM_CODES 必须为数组');
  const runtimeG93 = runtimeCatalog.find((entry) => entry && entry.id === 'kb-gcode-g93');
  assertSafetyEntry(runtimeG93, '运行时');

  report.ok = true;
  console.log('G93 inverse-time feed safety trust smoke: PASS');
} catch (error) {
  report.error = { message: error.message, stack: error.stack };
  process.exitCode = 1;
  console.error('G93 inverse-time feed safety trust smoke: FAIL');
  console.error(error.stack || error.message);
} finally {
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`diagnostic report: ${REPORT_PATH}`);
}
