'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const GM_PATH = path.join(ROOT, 'gm-code-complete.js');
const ALIAS_PATH = path.join(ROOT, 'search-aliases.js');
const REPORT_PATH = path.resolve(process.env.CNC_G51_REPORT || 'cnc-g51-scaling-runtime-trust-report.json');
const EXPECTED_HEAD = process.env.EXPECTED_HEAD || '';

const report = {
  gate: 'CNC G51 scaling runtime trust',
  expectedHead: EXPECTED_HEAD,
  checkedFiles: [
    'cnc/gm-code-complete.js',
    'cnc/search-aliases.js',
    'cnc/tests/g51-scaling-runtime-trust-smoke.cjs',
    '.github/workflows/cnc-g51-scaling-runtime-trust-smoke.yml'
  ],
  ok: false,
  checks: [],
  errors: []
};

function check(condition, message, details) {
  const ok = Boolean(condition);
  report.checks.push({ message, ok, details: details || null });
  if (!ok) report.errors.push({ message, details: details || null });
  return ok;
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
  if (!entry) return '';
  return [entry.title, entry.summary, entry.usage, entry.beginner, entry.warning, entry.example, ...(entry.tags || [])]
    .filter(Boolean)
    .join(' ');
}

function assertNoFixedCopyableValues(entry, layer) {
  const example = String((entry && entry.example) || '');
  check(!/\bP\s*[-+]?\d+(?:\.\d+)?/i.test(example), `${layer}：不得提供可直接照抄的固定 P 倍率`, example);
  check(!/\b[XYZABC]\s*[-+]?\d+(?:\.\d+)?/i.test(example), `${layer}：不得提供可直接照抄的固定缩放中心或轴位置`, example);
  check(!/(?:倍率|缩放(?:率|比例)?)[^。；;\n]{0,16}\b\d+(?:\.\d+)?/i.test(example), `${layer}：不得提供可直接照抄的固定缩放倍率`, example);
}

function assertG51Entry(entry, layer) {
  check(entry && entry.id === 'kb-gcode-g51', `${layer}：必须存在 G51 条目`);
  if (!entry) return;

  check(entry.risk === '高', `${layer}：G51 风险等级必须为“高”`, `actual=${entry.risk}`);

  const text = textOf(entry);
  check(text.includes('当前CNC'), `${layer}：必须要求确认当前CNC`);
  check(text.includes('原厂手册'), `${layer}：必须要求核对机床厂原厂手册`);
  check(/选项|组别|模式/.test(text), `${layer}：必须提示选项、组别或模式存在本机差异`);
  check(/缩放中心/.test(text), `${layer}：必须要求确认缩放中心`);
  check(/倍率|缩放因子|比例/.test(text), `${layer}：必须要求确认缩放倍率或表达方式`);
  check(/参与.*轴|缩放.*轴|轴.*缩放/.test(text), `${layer}：必须要求确认参与缩放的轴`);
  check(/后续.*(?:运动|程序段|轨迹|坐标)|持续.*影响/.test(text), `${layer}：必须说明 G51 可能持续影响后续运动解释`);
  check(/圆弧/.test(text), `${layer}：必须提示圆弧相关实现需要核对`);
  check(/固定循环/.test(text), `${layer}：必须提示固定循环相关实现需要核对`);
  check(/刀补|刀具补偿|补偿量|补偿/.test(text), `${layer}：必须提示补偿相关实现需要核对`);
  check(/完整.*运动空间|运动空间.*完整|碰撞空间/.test(text), `${layer}：必须要求检查完整运动空间`);
  check(/图形检查|仿真|单段|低倍率|受控验证/.test(text), `${layer}：必须要求真实机床按现场规程做受控验证`);

  if (/G50/.test(text)) {
    check(/部分|明确支持|适用范围|当前CNC|原厂手册/.test(text), `${layer}：G50/G51 取消关系必须限定适用范围，不能写成跨系统通用规则`);
  }

  assertNoFixedCopyableValues(entry, layer);
}

try {
  const gmSource = fs.readFileSync(GM_PATH, 'utf8');
  const aliasSource = fs.readFileSync(ALIAS_PATH, 'utf8');
  const selfSource = fs.readFileSync(__filename, 'utf8');
  const workflowPath = path.resolve(ROOT, '..', '.github', 'workflows', 'cnc-g51-scaling-runtime-trust-smoke.yml');
  const workflowSource = fs.readFileSync(workflowPath, 'utf8');

  const forbiddenChecks = [
    { re: /\.skip\s*\(/, label: 'test bypass invocation' },
    { re: /process\.exit\s*\(\s*0\s*\)/, label: 'forced successful exit' },
    { re: /continue-on-error\s*:/, label: 'error-tolerant workflow directive' },
    { re: /\|\|\s*true\b/, label: 'shell forced-success fallback' }
  ];

  for (const item of forbiddenChecks) {
    check(!item.re.test(selfSource), `测试自身不得包含绕过：${item.label}`);
    check(!item.re.test(workflowSource), `工作流不得包含绕过：${item.label}`);
  }

  check(/ref:\s*\$\{\{\s*env\.EXPECTED_HEAD\s*\}\}/.test(workflowSource), '工作流必须 checkout exact head');
  check(/if:\s*always\(\)/.test(workflowSource), '失败或成功都必须上传真实诊断 Artifact');

  check(aliasSource.includes('function normalizeG51(entry)'), '运行时第二层防御必须实现 normalizeG51');
  check(/normalizeCatalog[\s\S]*normalizeG51/.test(aliasSource), 'normalizeCatalog 必须调用 normalizeG51');
  check(/normalizeG51\s*:\s*normalizeG51/.test(aliasSource), '安全守卫导出必须包含 normalizeG51');

  const rawCatalog = getRawCatalog(gmSource);
  check(Array.isArray(rawCatalog), '基础源 CNC_GM_CODES 必须为数组');
  const rawG51 = Array.isArray(rawCatalog) ? rawCatalog.find((entry) => entry && entry.id === 'kb-gcode-g51') : null;
  assertG51Entry(rawG51, '基础源');

  const runtimeCatalog = getRuntimeCatalog(aliasSource, gmSource);
  check(Array.isArray(runtimeCatalog), '运行时 CNC_GM_CODES 必须为数组');
  const runtimeG51 = Array.isArray(runtimeCatalog) ? runtimeCatalog.find((entry) => entry && entry.id === 'kb-gcode-g51') : null;
  assertG51Entry(runtimeG51, '运行时');

  report.ok = report.errors.length === 0;
  if (report.ok) {
    console.log('G51 scaling runtime trust smoke: PASS');
  } else {
    process.exitCode = 1;
    console.error(`G51 scaling runtime trust smoke: FAIL (${report.errors.length} checks failed)`);
    for (const item of report.errors) {
      console.error(`- ${item.message}${item.details ? `: ${item.details}` : ''}`);
    }
  }
} catch (error) {
  report.ok = false;
  report.errors.push({ message: error.message, details: error.stack || null });
  process.exitCode = 1;
  console.error('G51 scaling runtime trust smoke: FAIL');
  console.error(error.stack || error.message);
} finally {
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`diagnostic report: ${REPORT_PATH}`);
}
