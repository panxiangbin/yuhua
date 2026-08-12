'use strict';

const fs = require('fs');
const path = require('path');
const {
  REQUIRED_NOTICE,
  ROOT_REQUIRED_FIELDS,
  ROOT_OPTIONAL_FIELDS,
  REQUIRED_FIELDS,
  DATASET_PATHS,
  SOURCE_TYPES,
  DECISIONS,
  validateDocument
} = require('../tools/validate-content-trust-source-record.cjs');

const ROOT = path.resolve(__dirname, '../..');
const OUTPUT_DIR = path.join(ROOT, 'artifacts', 'content-trust-source-record-template');
const SCHEMA_PATH = path.join(ROOT, 'cnc', 'content-trust-source-record.schema.json');
const TEMPLATE_PATH = path.join(ROOT, 'cnc', 'content-trust-source-record-template.json');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const errors = [];
let schema;
let template;

try {
  schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  template = JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf8'));
} catch (error) {
  throw new Error(`来源记录结构或模板无法读取：${error.message}`);
}

if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') errors.push('JSON Schema 必须使用 draft 2020-12');
if (schema.type !== 'object' || schema.additionalProperties !== false) errors.push('Schema 根对象必须禁止未声明字段');
if (schema.properties?.schemaVersion?.const !== 1) errors.push('Schema 的 schemaVersion 必须固定为 1');
if (schema.properties?.requiredNotice?.const !== REQUIRED_NOTICE) errors.push('Schema 的统一教学提示不一致');
if (schema.properties?.instructions?.type !== 'array' || schema.properties?.instructions?.minItems < 5) {
  errors.push('Schema 必须受控定义至少 5 条模板填写说明');
}
if (template.schemaVersion !== 1) errors.push('模板 schemaVersion 必须为 1');
if (template.requiredNotice !== REQUIRED_NOTICE) errors.push('模板统一教学提示不一致');
if (!Array.isArray(template.instructions) || template.instructions.length < 5) errors.push('模板必须提供至少 5 条使用说明');
if (!Array.isArray(template.records) || template.records.length !== 0) errors.push('空白模板不得预填或伪造来源记录');

const allowedRootFields = new Set([...ROOT_REQUIRED_FIELDS, ...ROOT_OPTIONAL_FIELDS]);
for (const key of Object.keys(template)) {
  if (!allowedRootFields.has(key)) errors.push(`模板含未受控顶层字段：${key}`);
}
const templateValidationErrors = validateDocument(template);
if (templateValidationErrors.length) {
  errors.push(`空白模板与正式校验器不一致：${templateValidationErrors.join(' | ')}`);
}

const sourceRecord = schema.$defs?.sourceRecord;
if (!sourceRecord || sourceRecord.type !== 'object' || sourceRecord.additionalProperties !== false) {
  errors.push('Schema 必须定义禁止额外字段的 sourceRecord 对象');
}
const schemaRequired = new Set(sourceRecord?.required || []);
for (const field of REQUIRED_FIELDS) {
  if (!schemaRequired.has(field)) errors.push(`Schema 缺少必填字段：${field}`);
}
if (sourceRecord?.properties?.onMachineValidationRequired?.const !== true) {
  errors.push('onMachineValidationRequired 必须固定为 true');
}

const schemaDatasetPaths = new Set(sourceRecord?.properties?.datasetPath?.enum || []);
for (const datasetPath of DATASET_PATHS) {
  if (!schemaDatasetPaths.has(datasetPath)) errors.push(`Schema 缺少数据集路径：${datasetPath}`);
}
const schemaSourceTypes = new Set(sourceRecord?.properties?.sourceType?.enum || []);
for (const sourceType of SOURCE_TYPES) {
  if (!schemaSourceTypes.has(sourceType)) errors.push(`Schema 缺少来源类型：${sourceType}`);
}
const schemaDecisions = new Set(sourceRecord?.properties?.decision?.enum || []);
for (const decision of DECISIONS) {
  if (!schemaDecisions.has(decision)) errors.push(`Schema 缺少复核结论：${decision}`);
}

const validRecord = {
  datasetPath: 'cnc/alarm-data.js',
  itemKey: 'TEST-ALARM-001',
  sourceType: 'oem_manual',
  publisher: '测试发布机构',
  documentTitle: '结构校验测试文档',
  documentCodeOrRevision: 'TEST-REV-A',
  applicableSystemOrMachine: '测试控制器系列，仅用于门禁校验',
  pageOrSection: '测试章节 1.1',
  evidenceLocation: '受控测试位置/TEST-REV-A',
  fileSha256: 'a'.repeat(64),
  reviewedAt: '2026-08-01',
  reviewer: '测试复核员',
  verificationNotes: '仅用于验证字段和状态约束，不代表任何真实技术结论。',
  applicabilityNotes: '仅适用于自动化测试对象，不对应真实机床或控制器。',
  decision: 'insufficient_evidence',
  onMachineValidationRequired: true
};
const validDocument = { schemaVersion: 1, requiredNotice: REQUIRED_NOTICE, records: [validRecord] };
const validErrors = validateDocument(validDocument);
if (validErrors.length) errors.push(`合法测试记录被错误拒绝：${validErrors.join(' | ')}`);

const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const invalidCases = [
  {
    name: '占位发布机构',
    document: { ...validDocument, records: [{ ...validRecord, publisher: '待填写' }] },
    expected: '仍含占位或未核实内容'
  },
  {
    name: '复合占位页码',
    document: { ...validDocument, records: [{ ...validRecord, pageOrSection: '第 3 章 / 待填写页码' }] },
    expected: '仍含占位或未核实内容'
  },
  {
    name: '待确认适用范围',
    document: { ...validDocument, records: [{ ...validRecord, applicabilityNotes: '控制系统版本待确认，当前不能确定适用范围。' }] },
    expected: '仍含占位或未核实内容'
  },
  {
    name: 'TODO 复核备注',
    document: { ...validDocument, records: [{ ...validRecord, verificationNotes: '已查阅测试资料，TODO：仍需核对原厂手册后再确认。' }] },
    expected: '仍含占位或未核实内容'
  },
  {
    name: '关闭上机验证要求',
    document: { ...validDocument, records: [{ ...validRecord, onMachineValidationRequired: false }] },
    expected: '必须为 true'
  },
  {
    name: '错误数据集',
    document: { ...validDocument, records: [{ ...validRecord, datasetPath: 'cnc/other.js' }] },
    expected: '不在高风险数据集清单中'
  },
  {
    name: '伪造日期',
    document: { ...validDocument, records: [{ ...validRecord, reviewedAt: '2026-02-30' }] },
    expected: '真实的 YYYY-MM-DD'
  },
  {
    name: '未来复核日期',
    document: { ...validDocument, records: [{ ...validRecord, reviewedAt: futureDate }] },
    expected: '不得晚于当前 UTC 日期'
  },
  {
    name: '额外未受控记录字段',
    document: { ...validDocument, records: [{ ...validRecord, verified: true }] },
    expected: '含未允许字段'
  },
  {
    name: '额外未受控根字段',
    document: { ...validDocument, operationalUseAllowed: true },
    expected: '根节点含未允许字段'
  },
  {
    name: '无效模板说明',
    document: { ...validDocument, instructions: ['占位'] },
    expected: '至少包含 5 条说明'
  },
  {
    name: '重复记录',
    document: { ...validDocument, records: [validRecord, { ...validRecord, verificationNotes: '第二条重复测试记录，不应被接受为独立证据。' }] },
    expected: '与前面的来源记录重复'
  }
];

const invalidResults = invalidCases.map((testCase) => {
  const caseErrors = validateDocument(testCase.document);
  const passed = caseErrors.some((message) => message.includes(testCase.expected));
  if (!passed) errors.push(`${testCase.name} 未被正确拦截：${caseErrors.join(' | ')}`);
  return { name: testCase.name, passed, errors: caseErrors };
});

const report = {
  generatedAt: new Date().toISOString(),
  result: errors.length ? 'failure' : 'success',
  schemaVersion: schema.properties?.schemaVersion?.const,
  templateRecordCount: template.records?.length,
  templateInstructionCount: template.instructions?.length,
  templateAcceptedByValidator: templateValidationErrors.length === 0,
  requiredFieldCount: REQUIRED_FIELDS.length,
  datasetCount: DATASET_PATHS.size,
  sourceTypeCount: SOURCE_TYPES.size,
  decisionCount: DECISIONS.size,
  validFixtureAccepted: validErrors.length === 0,
  invalidCases: invalidResults,
  errors
};

fs.writeFileSync(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(OUTPUT_DIR, 'findings.txt'), [
  `CNC 来源记录模板审计：${report.result}`,
  `模板预填来源记录：${report.templateRecordCount}`,
  `模板填写说明：${report.templateInstructionCount}`,
  `模板通过正式校验器：${report.templateAcceptedByValidator}`,
  `必填字段：${report.requiredFieldCount}`,
  `高风险数据集：${report.datasetCount}`,
  `来源类型：${report.sourceTypeCount}`,
  `复核结论：${report.decisionCount}`,
  `非法场景拦截：${invalidResults.filter((item) => item.passed).length}/${invalidResults.length}`,
  '',
  ...(errors.length ? errors.map((item) => `ERROR: ${item}`) : ['PASS: 模板保持空白；占位或待核对内容、未来复核日期、根节点和记录字段、适用范围、复核结论及现场验证要求均已受控校验。'])
].join('\n') + '\n');

if (errors.length) {
  console.error('CNC 内容复核来源记录模板审计失败', report);
  process.exit(1);
}
console.log('CNC 内容复核来源记录模板审计通过', report);
