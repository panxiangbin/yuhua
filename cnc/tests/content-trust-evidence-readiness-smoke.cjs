'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(ROOT, 'artifacts', 'content-trust-evidence-readiness');
const LEDGER_PATH = path.join(ROOT, 'cnc', 'content-trust-evidence-ledger.json');
const MANIFEST_PATH = path.join(ROOT, 'cnc', 'content-trust-manifest.json');
const REQUIRED_NOTICE = '教学参考，需按机床说明书、现场工艺和空运行验证';
const REQUIRED_DATASETS = [
  'cnc/alarm-data.js',
  'cnc/gm-code-complete.js',
  'cnc/diagnosis-data.js',
  'cnc/weak-category-data.js',
  'cnc/learning-content-data.js'
];
const REQUIRED_SOURCE_FIELDS = [
  'publisher',
  'documentTitle',
  'documentCodeOrRevision',
  'applicableSystemOrMachine',
  'pageOrSection',
  'reviewedAt',
  'reviewer',
  'verificationNotes'
];
const ALLOWED_STATES = new Set(['awaiting_sources', 'sources_ready', 'in_review', 'review_complete']);

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const errors = [];
let ledger;
let manifest;

try {
  ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
  manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
} catch (error) {
  throw new Error(`无法读取内容可信度证据文件：${error.message}`);
}

if (ledger.schemaVersion !== 1) errors.push('证据台账 schemaVersion 必须为 1');
if (ledger.requiredNotice !== REQUIRED_NOTICE) errors.push('证据台账统一教学提示不一致');
if (!Array.isArray(ledger.datasets)) errors.push('证据台账 datasets 必须为数组');
if (!Array.isArray(ledger.requiredSourceFields)) errors.push('requiredSourceFields 必须为数组');
for (const field of REQUIRED_SOURCE_FIELDS) {
  if (!ledger.requiredSourceFields.includes(field)) errors.push(`缺少来源必填字段：${field}`);
}
for (const state of ALLOWED_STATES) {
  if (!ledger.stateDefinitions || !ledger.stateDefinitions[state] || ledger.stateDefinitions[state].length < 18) {
    errors.push(`缺少清楚的证据状态定义：${state}`);
  }
}

const manifestByPath = new Map((manifest.datasets || []).map((item) => [item.path, item]));
const ledgerByPath = new Map((ledger.datasets || []).map((item) => [item.path, item]));
for (const requiredPath of REQUIRED_DATASETS) {
  if (!ledgerByPath.has(requiredPath)) errors.push(`证据台账缺少数据集：${requiredPath}`);
}
if (ledgerByPath.size !== REQUIRED_DATASETS.length) {
  errors.push(`证据台账应登记 ${REQUIRED_DATASETS.length} 个数据集，实际 ${ledgerByPath.size}`);
}

function completeSourceRecord(record) {
  return REQUIRED_SOURCE_FIELDS.every((field) => typeof record[field] === 'string' && record[field].trim().length >= 2);
}

const findings = [];
for (const item of ledger.datasets || []) {
  const manifestItem = manifestByPath.get(item.path);
  if (!manifestItem) errors.push(`${item.path} 不在可信度清单中`);
  if (!ALLOWED_STATES.has(item.state)) errors.push(`${item.path} 使用了不允许的证据状态：${item.state}`);
  if (!['P0', 'P1', 'P2'].includes(item.reviewPriority)) errors.push(`${item.path} 复核优先级无效`);
  if (manifestItem && manifestItem.reviewPriority !== item.reviewPriority) {
    errors.push(`${item.path} 的证据台账优先级与可信度清单不一致`);
  }
  if (!Array.isArray(item.requestedSources) || item.requestedSources.length < 2) {
    errors.push(`${item.path} 至少需要两项资料请求`);
  }
  if (!item.blockedReason || item.blockedReason.length < 18) errors.push(`${item.path} 缺少清楚的当前阻断原因`);
  if (!Number.isInteger(item.reviewedItemCount) || item.reviewedItemCount < 0) errors.push(`${item.path} reviewedItemCount 必须为非负整数`);
  if (!Array.isArray(item.sourceRecords)) errors.push(`${item.path} sourceRecords 必须为数组`);

  const sourceRecords = Array.isArray(item.sourceRecords) ? item.sourceRecords : [];
  const incompleteRecords = sourceRecords.filter((record) => !completeSourceRecord(record));
  if (incompleteRecords.length) errors.push(`${item.path} 存在 ${incompleteRecords.length} 条字段不完整的来源记录`);

  const sourcesComplete = sourceRecords.length > 0 && incompleteRecords.length === 0;
  if (item.readyForItemReview === true && !sourcesComplete) {
    errors.push(`${item.path} 没有完整来源记录，不得标记为可开始逐条复核`);
  }
  if (item.readyForItemReview !== true && item.state !== 'awaiting_sources') {
    errors.push(`${item.path} 未准备好来源时必须保持 awaiting_sources`);
  }
  if (['sources_ready', 'in_review', 'review_complete'].includes(item.state) && item.readyForItemReview !== true) {
    errors.push(`${item.path} 进入 ${item.state} 前必须先满足来源准备条件`);
  }
  if (item.reviewedItemCount > 0 && !['in_review', 'review_complete'].includes(item.state)) {
    errors.push(`${item.path} 已记录逐条复核数量，但状态不是 in_review 或 review_complete`);
  }
  if (item.reviewedItemCount > 0 && !sourcesComplete) {
    errors.push(`${item.path} 没有完整来源记录，不得登记已复核条目`);
  }
  if (item.state === 'review_complete' && item.reviewedItemCount < 1) {
    errors.push(`${item.path} review_complete 必须有大于 0 的逐条复核记录`);
  }
  if (manifestItem && manifestItem.allowOperationalUse !== false) {
    errors.push(`${item.path} 在可信度清单中不得标记为可直接上机使用`);
  }

  findings.push({
    path: item.path,
    reviewPriority: item.reviewPriority,
    state: item.state,
    readyForItemReview: item.readyForItemReview === true,
    sourceRecordCount: sourceRecords.length,
    completeSourceRecordCount: sourceRecords.length - incompleteRecords.length,
    reviewedItemCount: item.reviewedItemCount
  });
}

const p0Paths = (ledger.datasets || []).filter((item) => item.reviewPriority === 'P0').map((item) => item.path).sort();
const expectedP0 = ['cnc/alarm-data.js', 'cnc/gm-code-complete.js'].sort();
if (JSON.stringify(p0Paths) !== JSON.stringify(expectedP0)) errors.push(`P0 证据准备队列错误：${p0Paths.join(', ')}`);

const counts = {
  registeredDatasets: (ledger.datasets || []).length,
  awaitingSources: (ledger.datasets || []).filter((item) => item.state === 'awaiting_sources').length,
  readyForItemReview: (ledger.datasets || []).filter((item) => item.readyForItemReview === true).length,
  sourceRecords: (ledger.datasets || []).reduce((sum, item) => sum + (Array.isArray(item.sourceRecords) ? item.sourceRecords.length : 0), 0),
  reviewedItems: (ledger.datasets || []).reduce((sum, item) => sum + (Number.isInteger(item.reviewedItemCount) ? item.reviewedItemCount : 0), 0)
};

const report = {
  generatedAt: new Date().toISOString(),
  result: errors.length ? 'failure' : 'success',
  requiredNotice: REQUIRED_NOTICE,
  requiredSourceFields: REQUIRED_SOURCE_FIELDS,
  counts,
  findings,
  errors
};
fs.writeFileSync(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(OUTPUT_DIR, 'findings.txt'), [
  `CNC 内容复核证据准备度：${report.result}`,
  `登记数据集：${counts.registeredDatasets}`,
  `等待资料：${counts.awaitingSources}`,
  `资料已齐可逐条复核：${counts.readyForItemReview}`,
  `已登记来源记录：${counts.sourceRecords}`,
  `已逐条复核：${counts.reviewedItems}`,
  '',
  ...findings.map((item) => `${item.path} | ${item.reviewPriority} | ${item.state} | 来源 ${item.sourceRecordCount} | 已复核 ${item.reviewedItemCount}`),
  '',
  ...(errors.length ? errors.map((item) => `ERROR: ${item}`) : ['PASS: 当前资料缺口被如实登记，没有在缺少完整来源时宣称已开始或完成逐条复核。'])
].join('\n') + '\n');

if (errors.length) {
  console.error('CNC 内容复核证据准备度审计失败', report);
  process.exitCode = 1;
} else {
  console.log('CNC 内容复核证据准备度审计通过', counts);
}
