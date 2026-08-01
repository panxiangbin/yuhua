'use strict';

const fs = require('fs');
const path = require('path');
const {
  REQUIRED_NOTICE,
  DATASET_PATHS,
  validateDocument: validateItemReviewDocument
} = require('./validate-content-trust-source-record.cjs');

const ALLOWED_STATES = new Set(['awaiting_sources', 'sources_ready', 'in_review', 'review_complete']);
const PRIORITIES = new Set(['P0', 'P1', 'P2']);
const ROOT_FIELDS = new Set([
  'schemaVersion',
  'generatedAt',
  'scope',
  'requiredNotice',
  'requiredSourceFields',
  'stateDefinitions',
  'datasets'
]);
const DATASET_FIELDS = new Set([
  'path',
  'reviewPriority',
  'state',
  'readyForItemReview',
  'reviewedItemCount',
  'sourceRecords',
  'itemReviewRecords',
  'blockedReason',
  'requestedSources'
]);
const SOURCE_INVENTORY_FIELDS = [
  'publisher',
  'documentTitle',
  'documentCodeOrRevision',
  'applicableSystemOrMachine',
  'pageOrSection',
  'reviewedAt',
  'reviewer',
  'verificationNotes'
];
const SOURCE_INVENTORY_FIELD_SET = new Set(SOURCE_INVENTORY_FIELDS);
const PLACEHOLDER_PATTERN = /^(待填写|待提供|未知|不详|todo|tbd|unknown|example|示例|占位)$/i;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isRealDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateInventoryText(record, field, minimum, errors, prefix) {
  const value = record[field];
  if (typeof value !== 'string' || value.trim().length < minimum) {
    errors.push(`${prefix}.${field} 至少需要 ${minimum} 个非空字符`);
    return;
  }
  if (PLACEHOLDER_PATTERN.test(value.trim())) {
    errors.push(`${prefix}.${field} 仍是占位内容：${value.trim()}`);
  }
}

function validateSourceInventory(records, datasetPath, errors) {
  if (!Array.isArray(records)) {
    errors.push(`${datasetPath}.sourceRecords 必须为数组`);
    return { complete: false, count: 0 };
  }

  const duplicateKeys = new Set();
  records.forEach((record, index) => {
    const prefix = `${datasetPath}.sourceRecords[${index}]`;
    if (!isObject(record)) {
      errors.push(`${prefix} 必须为对象`);
      return;
    }
    for (const field of SOURCE_INVENTORY_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(record, field)) errors.push(`${prefix} 缺少必填字段：${field}`);
    }
    for (const field of Object.keys(record)) {
      if (!SOURCE_INVENTORY_FIELD_SET.has(field)) errors.push(`${prefix} 含未允许字段：${field}`);
    }

    for (const field of ['publisher', 'documentTitle', 'documentCodeOrRevision', 'applicableSystemOrMachine', 'pageOrSection', 'reviewer']) {
      validateInventoryText(record, field, field === 'pageOrSection' ? 1 : 2, errors, prefix);
    }
    validateInventoryText(record, 'verificationNotes', 12, errors, prefix);
    if (!isRealDate(record.reviewedAt)) errors.push(`${prefix}.reviewedAt 必须为真实的 YYYY-MM-DD 日期`);

    const duplicateKey = [record.publisher, record.documentTitle, record.documentCodeOrRevision, record.applicableSystemOrMachine, record.pageOrSection].join('|');
    if (duplicateKeys.has(duplicateKey)) errors.push(`${prefix} 与同一数据集前面的资料清单记录重复`);
    duplicateKeys.add(duplicateKey);
  });

  return { complete: records.length > 0, count: records.length };
}

function validateLedger(ledger, manifest) {
  const errors = [];
  const findings = [];

  if (!isObject(ledger)) return { errors: ['证据台账根节点必须为对象'], findings, counts: {} };
  if (!isObject(manifest)) return { errors: ['可信度清单根节点必须为对象'], findings, counts: {} };

  for (const field of Object.keys(ledger)) {
    if (!ROOT_FIELDS.has(field)) errors.push(`证据台账根节点含未允许字段：${field}`);
  }
  if (ledger.schemaVersion !== 1) errors.push('证据台账 schemaVersion 必须为 1');
  if (ledger.requiredNotice !== REQUIRED_NOTICE) errors.push('证据台账统一教学提示不一致');
  if (!Array.isArray(ledger.datasets)) errors.push('证据台账 datasets 必须为数组');
  if (!Array.isArray(ledger.requiredSourceFields) || SOURCE_INVENTORY_FIELDS.some((field) => !ledger.requiredSourceFields.includes(field))) {
    errors.push('证据台账 requiredSourceFields 必须包含全部资料清单字段');
  }
  for (const state of ALLOWED_STATES) {
    if (!ledger.stateDefinitions || typeof ledger.stateDefinitions[state] !== 'string' || ledger.stateDefinitions[state].trim().length < 18) {
      errors.push(`证据台账缺少清楚的状态定义：${state}`);
    }
  }

  const datasets = Array.isArray(ledger.datasets) ? ledger.datasets : [];
  const manifestByPath = new Map((manifest.datasets || []).map((item) => [item.path, item]));
  const seenPaths = new Set();
  const allItemReviewRecords = [];

  for (const item of datasets) {
    const datasetPath = isObject(item) && typeof item.path === 'string' ? item.path : '未知数据集';
    if (!isObject(item)) {
      errors.push('证据台账 datasets 中存在非对象条目');
      continue;
    }
    for (const field of Object.keys(item)) {
      if (!DATASET_FIELDS.has(field)) errors.push(`${datasetPath} 含未允许字段：${field}`);
    }
    if (!DATASET_PATHS.has(item.path)) errors.push(`${datasetPath} 不在高风险数据集清单中`);
    if (seenPaths.has(item.path)) errors.push(`证据台账重复登记数据集：${item.path}`);
    seenPaths.add(item.path);
    if (!PRIORITIES.has(item.reviewPriority)) errors.push(`${datasetPath} 复核优先级无效`);
    if (!ALLOWED_STATES.has(item.state)) errors.push(`${datasetPath} 证据状态无效：${item.state}`);
    if (typeof item.readyForItemReview !== 'boolean') errors.push(`${datasetPath}.readyForItemReview 必须为布尔值`);
    if (!Number.isInteger(item.reviewedItemCount) || item.reviewedItemCount < 0) errors.push(`${datasetPath}.reviewedItemCount 必须为非负整数`);
    if (typeof item.blockedReason !== 'string' || item.blockedReason.trim().length < 18) errors.push(`${datasetPath} 缺少清楚的当前阻断原因`);
    if (!Array.isArray(item.requestedSources) || item.requestedSources.length < 2) errors.push(`${datasetPath} 至少需要两项资料请求`);

    const manifestItem = manifestByPath.get(item.path);
    if (!manifestItem) errors.push(`${datasetPath} 不在可信度清单中`);
    if (manifestItem && manifestItem.reviewPriority !== item.reviewPriority) errors.push(`${datasetPath} 的复核优先级与可信度清单不一致`);
    if (manifestItem && manifestItem.allowOperationalUse !== false) errors.push(`${datasetPath} 不得标记为可直接上机使用`);

    const inventory = validateSourceInventory(item.sourceRecords, datasetPath, errors);
    const itemReviewRecords = Array.isArray(item.itemReviewRecords) ? item.itemReviewRecords : [];
    if (!Array.isArray(item.itemReviewRecords)) errors.push(`${datasetPath}.itemReviewRecords 必须为数组`);

    const itemReviewErrors = validateItemReviewDocument({
      schemaVersion: 1,
      requiredNotice: REQUIRED_NOTICE,
      records: itemReviewRecords
    });
    for (const error of itemReviewErrors) errors.push(`${datasetPath}.itemReviewRecords：${error}`);

    for (const [index, record] of itemReviewRecords.entries()) {
      if (record && record.datasetPath !== item.path) {
        errors.push(`${datasetPath}.itemReviewRecords[${index}].datasetPath 必须与所属数据集一致`);
      }
      allItemReviewRecords.push(record);
    }

    const uniqueItemKeys = new Set(itemReviewRecords.filter(isObject).map((record) => record.itemKey));
    if (item.reviewedItemCount !== uniqueItemKeys.size) {
      errors.push(`${datasetPath}.reviewedItemCount 必须等于已登记的唯一逐条复核 itemKey 数量 ${uniqueItemKeys.size}`);
    }

    if (item.readyForItemReview === true && !inventory.complete) errors.push(`${datasetPath} 没有完整资料清单记录，不得标记为可开始逐条复核`);
    if (inventory.complete && item.readyForItemReview !== true) errors.push(`${datasetPath} 资料清单已完整登记时必须明确标记 readyForItemReview=true`);
    if (item.readyForItemReview !== true && item.state !== 'awaiting_sources') errors.push(`${datasetPath} 未准备好资料时必须保持 awaiting_sources`);
    if (item.state === 'awaiting_sources' && (item.readyForItemReview === true || itemReviewRecords.length > 0)) errors.push(`${datasetPath} awaiting_sources 状态不得包含逐条复核记录`);
    if (item.state === 'sources_ready' && itemReviewRecords.length > 0) errors.push(`${datasetPath} 已有逐条复核记录时不能停留在 sources_ready`);
    if (['in_review', 'review_complete'].includes(item.state) && (item.readyForItemReview !== true || itemReviewRecords.length === 0)) {
      errors.push(`${datasetPath} 进入 ${item.state} 前必须具备资料清单并登记逐条复核记录`);
    }
    if (itemReviewRecords.length > 0 && !['in_review', 'review_complete'].includes(item.state)) {
      errors.push(`${datasetPath} 已有逐条复核记录时状态必须为 in_review 或 review_complete`);
    }
    if (item.state === 'review_complete' && itemReviewRecords.some((record) => record && record.decision === 'insufficient_evidence')) {
      errors.push(`${datasetPath} 仍有 insufficient_evidence 记录，不得标记 review_complete`);
    }

    findings.push({
      path: item.path,
      reviewPriority: item.reviewPriority,
      state: item.state,
      readyForItemReview: item.readyForItemReview === true,
      sourceRecordCount: inventory.count,
      itemReviewRecordCount: itemReviewRecords.length,
      reviewedItemCount: Number.isInteger(item.reviewedItemCount) ? item.reviewedItemCount : null
    });
  }

  for (const requiredPath of DATASET_PATHS) {
    if (!seenPaths.has(requiredPath)) errors.push(`证据台账缺少数据集：${requiredPath}`);
  }
  if (seenPaths.size !== DATASET_PATHS.size) errors.push(`证据台账应唯一登记 ${DATASET_PATHS.size} 个高风险数据集，实际 ${seenPaths.size}`);

  const globalItemErrors = validateItemReviewDocument({
    schemaVersion: 1,
    requiredNotice: REQUIRED_NOTICE,
    records: allItemReviewRecords
  });
  for (const error of globalItemErrors) errors.push(`全局逐条复核记录：${error}`);

  const counts = {
    registeredDatasets: datasets.length,
    awaitingSources: datasets.filter((item) => item && item.state === 'awaiting_sources').length,
    readyForItemReview: datasets.filter((item) => item && item.readyForItemReview === true).length,
    sourceRecords: datasets.reduce((sum, item) => sum + (Array.isArray(item && item.sourceRecords) ? item.sourceRecords.length : 0), 0),
    itemReviewRecords: allItemReviewRecords.length,
    reviewedItems: datasets.reduce((sum, item) => sum + (Number.isInteger(item && item.reviewedItemCount) ? item.reviewedItemCount : 0), 0)
  };

  return { errors, findings, counts };
}

function validateFiles(ledgerPath, manifestPath) {
  try {
    const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return validateLedger(ledger, manifest);
  } catch (error) {
    return { errors: [`无法读取或解析证据台账：${error.message}`], findings: [], counts: {} };
  }
}

if (require.main === module) {
  const ledgerPath = path.resolve(process.cwd(), process.argv[2] || 'cnc/content-trust-evidence-ledger.json');
  const manifestPath = path.resolve(process.cwd(), process.argv[3] || 'cnc/content-trust-manifest.json');
  const result = validateFiles(ledgerPath, manifestPath);
  if (result.errors.length) {
    console.error(`CNC 内容复核证据台账校验失败：${ledgerPath}`);
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('CNC 内容复核证据台账校验通过', result.counts);
}

module.exports = {
  ALLOWED_STATES,
  SOURCE_INVENTORY_FIELDS,
  validateLedger,
  validateFiles
};
