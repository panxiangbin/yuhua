'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(ROOT, 'artifacts', 'content-trust-baseline');
const MANIFEST_PATH = path.join(ROOT, 'cnc', 'content-trust-manifest.json');
const REQUIRED_NOTICE = '教学参考，需按机床说明书、现场工艺和空运行验证';
const REQUIRED_DATASETS = [
  'cnc/learning-content-data.js',
  'cnc/alarm-data.js',
  'cnc/diagnosis-data.js',
  'cnc/gm-code-complete.js',
  'cnc/weak-category-data.js'
];
const ALLOWED_STATUSES = new Set([
  'reviewed_scope',
  'pending_manual_verification',
  'pending_system_scope_review'
]);

function fail(message) {
  throw new Error(message);
}

function readText(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) fail(`可信度清单引用的文件不存在：${relativePath}`);
  return fs.readFileSync(absolutePath, 'utf8');
}

function countMatches(text, regex) {
  return Array.from(text.matchAll(regex)).length;
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const findings = [];
const errors = [];
let manifest;

try {
  manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
} catch (error) {
  fail(`无法读取可信度清单：${error.message}`);
}

if (manifest.schemaVersion !== 1) errors.push('schemaVersion 必须为 1');
if (manifest.requiredNotice !== REQUIRED_NOTICE) errors.push('requiredNotice 与平台统一教学提示不一致');
if (!Array.isArray(manifest.datasets)) errors.push('datasets 必须为数组');

const datasetByPath = new Map((manifest.datasets || []).map((item) => [item.path, item]));
for (const requiredPath of REQUIRED_DATASETS) {
  if (!datasetByPath.has(requiredPath)) errors.push(`缺少高风险数据集登记：${requiredPath}`);
}

for (const item of manifest.datasets || []) {
  const source = readText(item.path);
  if (!ALLOWED_STATUSES.has(item.status)) errors.push(`${item.path} 使用了不允许的状态：${item.status}`);
  if (item.allowOperationalUse !== false) errors.push(`${item.path} 不得标记为可直接上机使用`);
  if (item.notice !== REQUIRED_NOTICE) errors.push(`${item.path} 缺少统一教学参考提示`);
  if (!item.applicability || item.applicability.length < 12) errors.push(`${item.path} 缺少明确适用范围`);
  if (!Array.isArray(item.reviewBasis) || item.reviewBasis.length < 2) errors.push(`${item.path} 缺少复核依据`);

  const numericAdviceCount = countMatches(source, /(?:建议|目标|控制在|降低|提高|减半|预热|余量|悬伸)[^\n]{0,45}\d+(?:\.\d+)?(?:\s*[~～±-]\s*\d+(?:\.\d+)?)?\s*(?:%|mm|分钟|倍|rpm|m\/min)?/g);
  const systemSpecificCount = countMatches(source, /(?:参数|报警|刀补|G\d{2,3}|M\d{2,3}|回参考点|回零|伺服|主轴)/g);
  const actionCount = countMatches(source, /(?:修改|写入|删除|复位|启动|运行|回零|换刀|试切|空运行|单段)/g);

  if ((numericAdviceCount > 0 || systemSpecificCount > 20 || actionCount > 10) && item.status === 'reviewed_scope' && item.path !== 'cnc/learning-content-data.js') {
    errors.push(`${item.path} 含大量数值或现场动作建议，却被错误标记为 reviewed_scope`);
  }

  findings.push({
    path: item.path,
    status: item.status,
    allowOperationalUse: item.allowOperationalUse,
    numericAdviceCount,
    systemSpecificCount,
    actionCount,
    bytes: Buffer.byteLength(source)
  });
}

const learning = readText('cnc/learning-content-data.js');
for (const token of ['适用范围', 'FANUC 立式加工中心', '机床说明书', '现场要求']) {
  if (!learning.includes(token)) errors.push(`12 关课程缺少可信度范围标记：${token}`);
}

const alarm = readText('cnc/alarm-data.js');
const diagnosis = readText('cnc/diagnosis-data.js');
const alarmEntryCount = countMatches(alarm, /"id"\s*:\s*"[^"]+"/g);
const diagnosisEntryCount = countMatches(diagnosis, /id\s*:\s*"diag-\d+"/g);
if (alarmEntryCount < 10) errors.push(`报警数据条目异常偏少：${alarmEntryCount}`);
if (diagnosisEntryCount < 20) errors.push(`诊断数据条目异常偏少：${diagnosisEntryCount}`);

const alarmManifest = datasetByPath.get('cnc/alarm-data.js');
const diagnosisManifest = datasetByPath.get('cnc/diagnosis-data.js');
if (alarmManifest && alarmManifest.status !== 'pending_manual_verification') {
  errors.push('报警数据尚未逐条核对原厂资料，必须保持 pending_manual_verification');
}
if (diagnosisManifest && diagnosisManifest.status !== 'pending_manual_verification') {
  errors.push('诊断数据含经验性数值建议，必须保持 pending_manual_verification');
}

const report = {
  generatedAt: new Date().toISOString(),
  manifest: path.relative(ROOT, MANIFEST_PATH).replaceAll('\\', '/'),
  requiredNotice: REQUIRED_NOTICE,
  result: errors.length ? 'failure' : 'success',
  counts: {
    registeredDatasets: (manifest.datasets || []).length,
    alarmEntries: alarmEntryCount,
    diagnosisEntries: diagnosisEntryCount,
    pendingDatasets: (manifest.datasets || []).filter((item) => item.status.startsWith('pending_')).length
  },
  findings,
  errors
};

fs.writeFileSync(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'findings.txt'),
  [
    `CNC 内容可信度基线：${report.result}`,
    `登记数据集：${report.counts.registeredDatasets}`,
    `待逐条复核数据集：${report.counts.pendingDatasets}`,
    `报警条目：${report.counts.alarmEntries}`,
    `诊断条目：${report.counts.diagnosisEntries}`,
    '',
    ...findings.map((item) => `${item.path} | ${item.status} | 数值建议 ${item.numericAdviceCount} | 系统相关 ${item.systemSpecificCount} | 现场动作 ${item.actionCount}`),
    '',
    ...(errors.length ? errors.map((item) => `ERROR: ${item}`) : ['PASS: 未把待复核内容伪装成已核实或可直接上机使用。'])
  ].join('\n') + '\n'
);

if (errors.length) {
  console.error('CNC 内容可信度基线审计失败', report);
  process.exitCode = 1;
} else {
  console.log('CNC 内容可信度基线审计通过', report.counts);
}
