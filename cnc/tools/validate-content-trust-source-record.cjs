'use strict';

const fs = require('fs');
const path = require('path');

const REQUIRED_NOTICE = '教学参考，需按机床说明书、现场工艺和空运行验证';
const DATASET_PATHS = new Set([
  'cnc/alarm-data.js',
  'cnc/gm-code-complete.js',
  'cnc/diagnosis-data.js',
  'cnc/weak-category-data.js',
  'cnc/learning-content-data.js'
]);
const SOURCE_TYPES = new Set([
  'oem_manual',
  'machine_builder_manual',
  'official_standard',
  'supplier_technical_data',
  'controlled_site_record'
]);
const DECISIONS = new Set([
  'supported_for_stated_scope',
  'conflicts_with_source',
  'insufficient_evidence',
  'not_applicable'
]);
const REQUIRED_FIELDS = [
  'datasetPath',
  'itemKey',
  'sourceType',
  'publisher',
  'documentTitle',
  'documentCodeOrRevision',
  'applicableSystemOrMachine',
  'pageOrSection',
  'evidenceLocation',
  'reviewedAt',
  'reviewer',
  'verificationNotes',
  'applicabilityNotes',
  'decision',
  'onMachineValidationRequired'
];
const OPTIONAL_FIELDS = new Set(['fileSha256']);
const PLACEHOLDER_PATTERN = /^(待填写|待提供|未知|不详|todo|tbd|unknown|example|示例|占位)$/i;

function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateText(record, field, minimum, errors, index) {
  const value = record[field];
  if (typeof value !== 'string' || value.trim().length < minimum) {
    errors.push(`records[${index}].${field} 至少需要 ${minimum} 个非空字符`);
    return;
  }
  if (PLACEHOLDER_PATTERN.test(value.trim())) {
    errors.push(`records[${index}].${field} 仍是占位内容：${value.trim()}`);
  }
}

function validateDocument(document) {
  const errors = [];
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    return ['根节点必须是 JSON 对象'];
  }
  if (document.schemaVersion !== 1) errors.push('schemaVersion 必须为 1');
  if (document.requiredNotice !== REQUIRED_NOTICE) errors.push('requiredNotice 与统一教学参考提示不一致');
  if (!Array.isArray(document.records)) {
    errors.push('records 必须为数组');
    return errors;
  }

  const duplicateKeys = new Set();
  document.records.forEach((record, index) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      errors.push(`records[${index}] 必须为对象`);
      return;
    }
    for (const field of REQUIRED_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(record, field)) {
        errors.push(`records[${index}] 缺少必填字段：${field}`);
      }
    }
    const allowedFields = new Set([...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]);
    for (const field of Object.keys(record)) {
      if (!allowedFields.has(field)) errors.push(`records[${index}] 含未允许字段：${field}`);
    }

    if (!DATASET_PATHS.has(record.datasetPath)) errors.push(`records[${index}].datasetPath 不在高风险数据集清单中`);
    if (!SOURCE_TYPES.has(record.sourceType)) errors.push(`records[${index}].sourceType 无效`);
    if (!DECISIONS.has(record.decision)) errors.push(`records[${index}].decision 无效`);
    if (record.onMachineValidationRequired !== true) errors.push(`records[${index}].onMachineValidationRequired 必须为 true`);

    validateText(record, 'itemKey', 1, errors, index);
    validateText(record, 'publisher', 2, errors, index);
    validateText(record, 'documentTitle', 2, errors, index);
    validateText(record, 'documentCodeOrRevision', 2, errors, index);
    validateText(record, 'applicableSystemOrMachine', 2, errors, index);
    validateText(record, 'pageOrSection', 1, errors, index);
    validateText(record, 'evidenceLocation', 2, errors, index);
    validateText(record, 'reviewer', 2, errors, index);
    validateText(record, 'verificationNotes', 12, errors, index);
    validateText(record, 'applicabilityNotes', 12, errors, index);

    if (typeof record.reviewedAt !== 'string' || !isRealDate(record.reviewedAt)) {
      errors.push(`records[${index}].reviewedAt 必须为真实的 YYYY-MM-DD 日期`);
    }
    if (record.fileSha256 !== undefined && (typeof record.fileSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(record.fileSha256))) {
      errors.push(`records[${index}].fileSha256 必须为 64 位小写十六进制 SHA-256`);
    }

    const duplicateKey = [record.datasetPath, record.itemKey, record.documentCodeOrRevision, record.pageOrSection].join('|');
    if (duplicateKeys.has(duplicateKey)) errors.push(`records[${index}] 与前面的来源记录重复：${duplicateKey}`);
    duplicateKeys.add(duplicateKey);
  });

  return errors;
}

function validateFile(filePath) {
  let document;
  try {
    document = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return [`无法读取或解析 JSON：${error.message}`];
  }
  return validateDocument(document);
}

if (require.main === module) {
  const input = process.argv[2];
  if (!input) {
    console.error('用法：node cnc/tools/validate-content-trust-source-record.cjs <来源记录.json>');
    process.exit(2);
  }
  const resolved = path.resolve(process.cwd(), input);
  const errors = validateFile(resolved);
  if (errors.length) {
    console.error(`CNC 内容复核来源记录校验失败：${resolved}`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  const document = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  console.log(`CNC 内容复核来源记录校验通过：${document.records.length} 条`);
}

module.exports = {
  REQUIRED_NOTICE,
  REQUIRED_FIELDS,
  DATASET_PATHS,
  SOURCE_TYPES,
  DECISIONS,
  validateDocument,
  validateFile
};
