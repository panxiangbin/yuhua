'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { validateLedger } = require('./validate-content-trust-evidence-ledger.cjs');

const TRANSACTION_FIELDS = new Set([
  'schemaVersion',
  'transactionId',
  'expectedBaseLedgerSha256',
  'nextLedgerSha256',
  'committedAt',
  'actor',
  'changeReason',
  'operationSummary'
]);
const SUMMARY_FIELDS = new Set([
  'datasetsChanged',
  'sourceRecordsAdded',
  'itemReviewRecordsAdded',
  'reviewedItemsAdded',
  'stateTransitions'
]);
const GOVERNANCE_ROOT_FIELDS = [
  'schemaVersion',
  'scope',
  'requiredNotice',
  'requiredSourceFields',
  'stateDefinitions'
];
const GOVERNANCE_DATASET_FIELDS = ['reviewPriority', 'requestedSources'];
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const TRANSACTION_ID_PATTERN = /^CNC-EVIDENCE-[A-Z0-9][A-Z0-9._-]{7,63}$/;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (isObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function sourceIdentity(record) {
  return [
    record.publisher,
    record.documentTitle,
    record.documentCodeOrRevision,
    record.applicableSystemOrMachine,
    record.pageOrSection
  ].join('|');
}

function sourceDocumentIdentity(record) {
  return [
    record.publisher,
    record.documentTitle,
    record.documentCodeOrRevision,
    record.applicableSystemOrMachine
  ].join('|');
}

function itemIdentity(record) {
  return [record.datasetPath, record.itemKey, record.documentCodeOrRevision, record.pageOrSection].join('|');
}

function recordsByIdentity(records, identity) {
  return new Map((Array.isArray(records) ? records : []).filter(isObject).map((record) => [identity(record), record]));
}

function compareAppendOnly(beforeRecords, afterRecords, identity, label, errors) {
  const beforeMap = recordsByIdentity(beforeRecords, identity);
  const afterMap = recordsByIdentity(afterRecords, identity);
  for (const [key, beforeRecord] of beforeMap) {
    const afterRecord = afterMap.get(key);
    if (!afterRecord) {
      errors.push(`${label} 不得删除既有记录：${key}`);
      continue;
    }
    if (stableStringify(beforeRecord) !== stableStringify(afterRecord)) {
      errors.push(`${label} 不得原地修改既有记录，应追加新的可追溯记录：${key}`);
    }
  }
  return [...afterMap.entries()].filter(([key]) => !beforeMap.has(key)).map(([, record]) => record);
}

function countUniqueItems(records) {
  return new Set((Array.isArray(records) ? records : []).filter(isObject).map((record) => record.itemKey)).size;
}

function validateTransaction({ beforeText, afterText, manifest, transaction }) {
  const errors = [];
  const findings = [];
  let beforeLedger;
  let afterLedger;

  try {
    beforeLedger = JSON.parse(beforeText);
  } catch (error) {
    return { errors: [`事务基线台账无法解析：${error.message}`], findings, counts: {} };
  }
  try {
    afterLedger = JSON.parse(afterText);
  } catch (error) {
    return { errors: [`事务目标台账无法解析：${error.message}`], findings, counts: {} };
  }

  const beforeValidation = validateLedger(beforeLedger, manifest);
  const afterValidation = validateLedger(afterLedger, manifest);
  for (const error of beforeValidation.errors) errors.push(`事务基线台账无效：${error}`);
  for (const error of afterValidation.errors) errors.push(`事务目标台账无效：${error}`);

  if (!isObject(transaction)) {
    errors.push('事务记录根节点必须为对象');
    return { errors, findings, counts: {} };
  }
  for (const field of Object.keys(transaction)) {
    if (!TRANSACTION_FIELDS.has(field)) errors.push(`事务记录含未允许字段：${field}`);
  }
  for (const field of TRANSACTION_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(transaction, field)) errors.push(`事务记录缺少必填字段：${field}`);
  }
  if (transaction.schemaVersion !== 1) errors.push('事务记录 schemaVersion 必须为 1');
  if (typeof transaction.transactionId !== 'string' || !TRANSACTION_ID_PATTERN.test(transaction.transactionId)) {
    errors.push('transactionId 必须符合 CNC-EVIDENCE- 开头的受控格式');
  }
  if (typeof transaction.expectedBaseLedgerSha256 !== 'string' || !SHA256_PATTERN.test(transaction.expectedBaseLedgerSha256)) {
    errors.push('expectedBaseLedgerSha256 必须为 64 位小写十六进制 SHA-256');
  }
  if (typeof transaction.nextLedgerSha256 !== 'string' || !SHA256_PATTERN.test(transaction.nextLedgerSha256)) {
    errors.push('nextLedgerSha256 必须为 64 位小写十六进制 SHA-256');
  }
  const actualBaseSha = sha256(beforeText);
  const actualNextSha = sha256(afterText);
  if (transaction.expectedBaseLedgerSha256 !== actualBaseSha) {
    errors.push(`事务基线摘要不一致，可能基于过期台账：期望 ${actualBaseSha}`);
  }
  if (transaction.nextLedgerSha256 !== actualNextSha) {
    errors.push(`事务目标摘要不一致，可能存在半写入或记录未同步：期望 ${actualNextSha}`);
  }
  if (typeof transaction.committedAt !== 'string' || Number.isNaN(Date.parse(transaction.committedAt))) {
    errors.push('committedAt 必须为可解析的 ISO 8601 时间');
  }
  if (typeof transaction.actor !== 'string' || transaction.actor.trim().length < 2) {
    errors.push('actor 至少需要 2 个非空字符');
  }
  if (typeof transaction.changeReason !== 'string' || transaction.changeReason.trim().length < 12) {
    errors.push('changeReason 至少需要 12 个非空字符');
  }
  if (!isObject(transaction.operationSummary)) {
    errors.push('operationSummary 必须为对象');
  } else {
    for (const field of Object.keys(transaction.operationSummary)) {
      if (!SUMMARY_FIELDS.has(field)) errors.push(`operationSummary 含未允许字段：${field}`);
    }
    for (const field of SUMMARY_FIELDS) {
      if (!Number.isInteger(transaction.operationSummary[field]) || transaction.operationSummary[field] < 0) {
        errors.push(`operationSummary.${field} 必须为非负整数`);
      }
    }
  }

  for (const field of GOVERNANCE_ROOT_FIELDS) {
    if (stableStringify(beforeLedger[field]) !== stableStringify(afterLedger[field])) {
      errors.push(`资料导入事务不得修改治理字段：${field}`);
    }
  }

  const beforeByPath = new Map((beforeLedger.datasets || []).filter(isObject).map((item) => [item.path, item]));
  const afterByPath = new Map((afterLedger.datasets || []).filter(isObject).map((item) => [item.path, item]));
  if (beforeByPath.size !== afterByPath.size || [...beforeByPath.keys()].some((key) => !afterByPath.has(key))) {
    errors.push('资料导入事务不得新增、删除或改名高风险数据集');
  }

  let datasetsChanged = 0;
  let sourceRecordsAdded = 0;
  let itemReviewRecordsAdded = 0;
  let reviewedItemsAdded = 0;
  let stateTransitions = 0;

  for (const [datasetPath, beforeItem] of beforeByPath) {
    const afterItem = afterByPath.get(datasetPath);
    if (!afterItem) continue;
    for (const field of GOVERNANCE_DATASET_FIELDS) {
      if (stableStringify(beforeItem[field]) !== stableStringify(afterItem[field])) {
        errors.push(`${datasetPath} 的资料导入事务不得修改治理字段：${field}`);
      }
    }

    const newSources = compareAppendOnly(
      beforeItem.sourceRecords,
      afterItem.sourceRecords,
      sourceIdentity,
      `${datasetPath}.sourceRecords`,
      errors
    );
    const newItems = compareAppendOnly(
      beforeItem.itemReviewRecords,
      afterItem.itemReviewRecords,
      itemIdentity,
      `${datasetPath}.itemReviewRecords`,
      errors
    );

    const afterSourceDocuments = new Set((afterItem.sourceRecords || []).map(sourceDocumentIdentity));
    for (const record of newItems) {
      if (!afterSourceDocuments.has(sourceDocumentIdentity(record))) {
        errors.push(`${datasetPath} 新增逐条复核记录缺少同一资料版本和适用范围的资料清单记录：${itemIdentity(record)}`);
      }
    }

    const beforeUniqueItems = countUniqueItems(beforeItem.itemReviewRecords);
    const afterUniqueItems = countUniqueItems(afterItem.itemReviewRecords);
    const itemDelta = afterUniqueItems - beforeUniqueItems;
    if (itemDelta < 0) errors.push(`${datasetPath} 已复核唯一条目数量不得减少`);

    const materialBefore = {
      state: beforeItem.state,
      readyForItemReview: beforeItem.readyForItemReview,
      reviewedItemCount: beforeItem.reviewedItemCount,
      sourceRecords: beforeItem.sourceRecords,
      itemReviewRecords: beforeItem.itemReviewRecords,
      blockedReason: beforeItem.blockedReason
    };
    const materialAfter = {
      state: afterItem.state,
      readyForItemReview: afterItem.readyForItemReview,
      reviewedItemCount: afterItem.reviewedItemCount,
      sourceRecords: afterItem.sourceRecords,
      itemReviewRecords: afterItem.itemReviewRecords,
      blockedReason: afterItem.blockedReason
    };
    if (stableStringify(materialBefore) !== stableStringify(materialAfter)) datasetsChanged += 1;
    if (beforeItem.state !== afterItem.state) stateTransitions += 1;
    sourceRecordsAdded += newSources.length;
    itemReviewRecordsAdded += newItems.length;
    reviewedItemsAdded += Math.max(0, itemDelta);

    findings.push({
      path: datasetPath,
      beforeState: beforeItem.state,
      afterState: afterItem.state,
      sourceRecordsAdded: newSources.length,
      itemReviewRecordsAdded: newItems.length,
      reviewedItemsAdded: Math.max(0, itemDelta)
    });
  }

  const actualSummary = {
    datasetsChanged,
    sourceRecordsAdded,
    itemReviewRecordsAdded,
    reviewedItemsAdded,
    stateTransitions
  };
  if (isObject(transaction.operationSummary)) {
    for (const field of SUMMARY_FIELDS) {
      if (transaction.operationSummary[field] !== actualSummary[field]) {
        errors.push(`operationSummary.${field} 与真实事务差异不一致：应为 ${actualSummary[field]}`);
      }
    }
  }
  if (datasetsChanged === 0) errors.push('事务没有产生任何受控数据变化，禁止提交无意义事务记录');

  return {
    errors,
    findings,
    counts: {
      ...actualSummary,
      beforeLedgerSha256: actualBaseSha,
      afterLedgerSha256: actualNextSha
    }
  };
}

function validateFiles(beforePath, afterPath, manifestPath, transactionPath) {
  try {
    const beforeText = fs.readFileSync(beforePath, 'utf8');
    const afterText = fs.readFileSync(afterPath, 'utf8');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const transaction = JSON.parse(fs.readFileSync(transactionPath, 'utf8'));
    return validateTransaction({ beforeText, afterText, manifest, transaction });
  } catch (error) {
    return { errors: [`无法读取或解析事务文件：${error.message}`], findings: [], counts: {} };
  }
}

if (require.main === module) {
  const [beforeInput, afterInput, manifestInput, transactionInput] = process.argv.slice(2);
  if (!beforeInput || !afterInput || !manifestInput || !transactionInput) {
    console.error('用法：node cnc/tools/validate-content-trust-evidence-transaction.cjs <基线台账.json> <目标台账.json> <可信度清单.json> <事务记录.json>');
    process.exit(2);
  }
  const result = validateFiles(
    path.resolve(process.cwd(), beforeInput),
    path.resolve(process.cwd(), afterInput),
    path.resolve(process.cwd(), manifestInput),
    path.resolve(process.cwd(), transactionInput)
  );
  if (result.errors.length) {
    console.error('CNC 内容复核证据事务一致性校验失败');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('CNC 内容复核证据事务一致性校验通过', result.counts);
}

module.exports = {
  TRANSACTION_FIELDS,
  SUMMARY_FIELDS,
  sha256,
  stableStringify,
  validateTransaction,
  validateFiles
};
