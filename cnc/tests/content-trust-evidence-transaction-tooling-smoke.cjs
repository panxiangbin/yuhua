'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  TRANSACTION_FIELDS,
  SUMMARY_FIELDS,
  sha256,
  validateTransaction
} = require('../tools/validate-content-trust-evidence-transaction.cjs');
const {
  generateTransaction,
  parseArgs
} = require('../tools/generate-content-trust-evidence-transaction.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const LEDGER_PATH = path.join(ROOT, 'cnc', 'content-trust-evidence-ledger.json');
const MANIFEST_PATH = path.join(ROOT, 'cnc', 'content-trust-manifest.json');
const SCHEMA_PATH = path.join(ROOT, 'cnc', 'content-trust-evidence-transaction.schema.json');
const TEMPLATE_PATH = path.join(ROOT, 'cnc', 'content-trust-evidence-transaction-template.json');
const GENERATOR_PATH = path.join(ROOT, 'cnc', 'tools', 'generate-content-trust-evidence-transaction.cjs');
const OUTPUT_DIR = path.join(ROOT, 'artifacts', 'content-trust-evidence-transaction-tooling');
const TEMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-evidence-transaction-tooling-'));

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const beforeText = fs.readFileSync(LEDGER_PATH, 'utf8');
const baseLedger = JSON.parse(beforeText);
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
const template = JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf8'));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sourceFixture() {
  return {
    publisher: '自动化测试发布机构',
    documentTitle: '证据事务生成工具测试文档',
    documentCodeOrRevision: 'TOOLING-TEST-REV-1',
    applicableSystemOrMachine: '自动化测试系统与测试机床配置',
    pageOrSection: '测试章节 3',
    reviewedAt: '2026-08-02',
    reviewer: '自动化测试',
    verificationNotes: '仅用于验证事务摘要生成工具，不构成任何真实机床技术结论。'
  };
}

function prepareSourcesReady() {
  const ledger = clone(baseLedger);
  const item = ledger.datasets.find((entry) => entry.path === 'cnc/alarm-data.js');
  item.sourceRecords = [sourceFixture()];
  item.readyForItemReview = true;
  item.state = 'sources_ready';
  item.blockedReason = '已登记自动化测试资料清单，仅允许进入结构化测试，不构成真实技术结论。';
  ledger.generatedAt = '2026-08-02T03:20:00+08:00';
  return ledger;
}

function makeOptions(afterText) {
  return {
    beforeText,
    afterText,
    manifest,
    transactionId: 'CNC-EVIDENCE-TOOLING-20260802-001',
    actor: '自动化测试',
    changeReason: '验证工具只按真实台账差异生成哈希和受控汇总。',
    committedAt: '2026-08-02T03:21:00+08:00'
  };
}

const cases = [];
function runCase(name, fn) {
  try {
    const detail = fn() || {};
    cases.push({ name, passed: true, detail });
  } catch (error) {
    cases.push({ name, passed: false, error: error.stack || error.message });
  }
}

runCase('Schema 与正式校验器字段保持一致', () => {
  assert.strictEqual(schema.additionalProperties, false);
  assert.deepStrictEqual([...schema.required].sort(), [...TRANSACTION_FIELDS].sort());
  assert.strictEqual(schema.properties.operationSummary.additionalProperties, false);
  assert.deepStrictEqual(
    [...schema.properties.operationSummary.required].sort(),
    [...SUMMARY_FIELDS].sort()
  );
  for (const field of SUMMARY_FIELDS) {
    assert.strictEqual(schema.properties.operationSummary.properties[field].type, 'integer');
    assert.strictEqual(schema.properties.operationSummary.properties[field].minimum, 0);
  }
  return { transactionFields: schema.required.length, summaryFields: schema.properties.operationSummary.required.length };
});

runCase('空白模板字段受控且不能直接提交', () => {
  assert.deepStrictEqual(Object.keys(template).sort(), [...TRANSACTION_FIELDS].sort());
  assert.deepStrictEqual(Object.keys(template.operationSummary).sort(), [...SUMMARY_FIELDS].sort());
  assert.strictEqual(template.expectedBaseLedgerSha256, '');
  assert.strictEqual(template.nextLedgerSha256, '');
  const result = validateTransaction({
    beforeText,
    afterText: beforeText,
    manifest,
    transaction: template
  });
  assert.ok(result.errors.length > 0);
  assert.ok(result.errors.some((error) => error.includes('transactionId')));
  assert.ok(result.errors.some((error) => error.includes('禁止提交无意义事务记录')));
  return { rejectedErrors: result.errors.length };
});

const afterLedger = prepareSourcesReady();
const afterText = serialize(afterLedger);
let generatedTransaction;

runCase('生成器计算真实哈希和差异汇总', () => {
  const generated = generateTransaction(makeOptions(afterText));
  generatedTransaction = generated.transaction;
  assert.strictEqual(generated.transaction.expectedBaseLedgerSha256, sha256(beforeText));
  assert.strictEqual(generated.transaction.nextLedgerSha256, sha256(afterText));
  assert.deepStrictEqual(generated.transaction.operationSummary, {
    datasetsChanged: 1,
    sourceRecordsAdded: 1,
    itemReviewRecordsAdded: 0,
    reviewedItemsAdded: 0,
    stateTransitions: 1
  });
  assert.deepStrictEqual(generated.validation.errors, []);
  return generated.transaction.operationSummary;
});

runCase('同一输入和固定时间生成确定性结果', () => {
  const first = generateTransaction(makeOptions(afterText)).transaction;
  const second = generateTransaction(makeOptions(afterText)).transaction;
  assert.deepStrictEqual(first, second);
  return { deterministic: true };
});

runCase('命令行生成文件并再次通过正式校验器', () => {
  const beforePath = path.join(TEMP_DIR, 'before.json');
  const afterPath = path.join(TEMP_DIR, 'after.json');
  const manifestPath = path.join(TEMP_DIR, 'manifest.json');
  const outputPath = path.join(TEMP_DIR, 'transaction.json');
  fs.writeFileSync(beforePath, beforeText, 'utf8');
  fs.writeFileSync(afterPath, afterText, 'utf8');
  fs.writeFileSync(manifestPath, serialize(manifest), 'utf8');
  const run = spawnSync(process.execPath, [
    GENERATOR_PATH,
    '--before', beforePath,
    '--after', afterPath,
    '--manifest', manifestPath,
    '--transaction-id', 'CNC-EVIDENCE-TOOLING-20260802-001',
    '--actor', '自动化测试',
    '--reason', '验证命令行只按真实台账差异生成事务记录。',
    '--committed-at', '2026-08-02T03:21:00+08:00',
    '--output', outputPath
  ], { cwd: ROOT, encoding: 'utf8' });
  assert.strictEqual(run.status, 0, run.stderr || run.stdout);
  assert.ok(fs.existsSync(outputPath));
  const transaction = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  const validation = validateTransaction({ beforeText, afterText, manifest, transaction });
  assert.deepStrictEqual(validation.errors, []);
  assert.deepStrictEqual(transaction, generatedTransaction);
  return { stdout: run.stdout.trim(), outputBytes: fs.statSync(outputPath).size };
});

runCase('非法治理字段变化时禁止生成事务记录', () => {
  const invalidLedger = prepareSourcesReady();
  invalidLedger.datasets[0].reviewPriority = 'P1';
  assert.throws(
    () => generateTransaction(makeOptions(serialize(invalidLedger))),
    /不得修改治理字段|复核优先级与可信度清单不一致/
  );
  return { rejected: true };
});

runCase('目标台账变化后旧事务摘要立即失效', () => {
  const changedLedger = prepareSourcesReady();
  changedLedger.datasets[0].blockedReason += ' 后续文件发生了未同步变化。';
  const changedText = serialize(changedLedger);
  const result = validateTransaction({
    beforeText,
    afterText: changedText,
    manifest,
    transaction: generatedTransaction
  });
  assert.ok(result.errors.some((error) => error.includes('事务目标摘要不一致')));
  return { rejected: true };
});

runCase('命令行缺少变更原因时必须失败', () => {
  assert.throws(
    () => parseArgs([
      '--before', 'before.json',
      '--after', 'after.json',
      '--manifest', 'manifest.json',
      '--transaction-id', 'CNC-EVIDENCE-TOOLING-20260802-001',
      '--actor', '自动化测试'
    ]),
    /缺少必填参数：--reason/
  );
  return { rejected: true };
});

runCase('输出路径不得覆盖输入文件', () => {
  const beforePath = path.join(TEMP_DIR, 'protected-before.json');
  const afterPath = path.join(TEMP_DIR, 'protected-after.json');
  const manifestPath = path.join(TEMP_DIR, 'protected-manifest.json');
  fs.writeFileSync(beforePath, beforeText, 'utf8');
  fs.writeFileSync(afterPath, afterText, 'utf8');
  fs.writeFileSync(manifestPath, serialize(manifest), 'utf8');
  const run = spawnSync(process.execPath, [
    GENERATOR_PATH,
    '--before', beforePath,
    '--after', afterPath,
    '--manifest', manifestPath,
    '--transaction-id', 'CNC-EVIDENCE-TOOLING-20260802-001',
    '--actor', '自动化测试',
    '--reason', '验证输出文件不能覆盖事务输入文件。',
    '--committed-at', '2026-08-02T03:21:00+08:00',
    '--output', afterPath
  ], { cwd: ROOT, encoding: 'utf8' });
  assert.notStrictEqual(run.status, 0);
  assert.match(run.stderr, /输出路径不得覆盖/);
  assert.strictEqual(fs.readFileSync(afterPath, 'utf8'), afterText);
  return { rejected: true };
});

const failedCases = cases.filter((item) => !item.passed);
const report = {
  generatedAt: new Date().toISOString(),
  result: failedCases.length ? 'failure' : 'success',
  totalCases: cases.length,
  passedCases: cases.length - failedCases.length,
  schemaFields: schema.required.length,
  summaryFields: schema.properties.operationSummary.required.length,
  cases
};

fs.writeFileSync(path.join(OUTPUT_DIR, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(OUTPUT_DIR, 'findings.txt'), [
  `CNC 证据事务模板与生成工具：${report.result}`,
  `测试场景：${report.totalCases}`,
  `通过场景：${report.passedCases}`,
  `事务字段：${report.schemaFields}`,
  `汇总字段：${report.summaryFields}`,
  '',
  ...cases.map((item) => `${item.passed ? 'PASS' : 'FAIL'} | ${item.name}`),
  '',
  ...(failedCases.length
    ? failedCases.map((item) => `ERROR ${item.name}: ${item.error}`)
    : ['PASS: Schema、不可直接提交的空白模板、真实哈希、差异汇总、确定性输出和输入文件保护均通过。'])
].join('\n') + '\n', 'utf8');

fs.rmSync(TEMP_DIR, { recursive: true, force: true });

if (failedCases.length) {
  console.error('CNC 证据事务模板与生成工具审计失败', report);
  process.exit(1);
}
console.log('CNC 证据事务模板与生成工具审计通过', {
  totalCases: report.totalCases,
  passedCases: report.passedCases,
  schemaFields: report.schemaFields,
  summaryFields: report.summaryFields
});
