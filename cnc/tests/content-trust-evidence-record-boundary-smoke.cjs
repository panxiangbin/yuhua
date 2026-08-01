'use strict';

const fs = require('fs');
const path = require('path');
const { validateLedger } = require('../tools/validate-content-trust-evidence-ledger.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(ROOT, 'artifacts', 'content-trust-evidence-record-boundary');
const LEDGER_PATH = path.join(ROOT, 'cnc', 'content-trust-evidence-ledger.json');
const MANIFEST_PATH = path.join(ROOT, 'cnc', 'content-trust-manifest.json');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const baseLedger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sourceInventoryFixture() {
  return {
    publisher: '自动化测试发布机构',
    documentTitle: '受控资料清单测试文档',
    documentCodeOrRevision: 'TEST-REV-1',
    applicableSystemOrMachine: '测试系统与测试机床配置',
    pageOrSection: '测试章节 1',
    reviewedAt: '2026-08-02',
    reviewer: '自动化测试',
    verificationNotes: '仅用于验证资料清单结构和状态流转，不构成任何现场技术结论。'
  };
}

function itemReviewFixture(decision = 'supported_for_stated_scope') {
  return {
    datasetPath: 'cnc/alarm-data.js',
    itemKey: 'TEST-ALARM-001',
    sourceType: 'oem_manual',
    publisher: '自动化测试发布机构',
    documentTitle: '逐条复核记录测试文档',
    documentCodeOrRevision: 'TEST-REV-1',
    applicableSystemOrMachine: '测试系统与测试机床配置',
    pageOrSection: '测试章节 1.1',
    evidenceLocation: 'test-fixture://controlled-manual/section-1-1',
    reviewedAt: '2026-08-02',
    reviewer: '自动化测试',
    verificationNotes: '此记录只用于验证完整 Schema，不表示任何真实报警内容已经核实。',
    applicabilityNotes: '仅适用于自动化测试夹具，真实机床必须核对原厂手册和现场配置。',
    decision,
    onMachineValidationRequired: true
  };
}

function prepareDataset(state, withItemRecord = false) {
  const ledger = clone(baseLedger);
  const item = ledger.datasets.find((entry) => entry.path === 'cnc/alarm-data.js');
  item.sourceRecords = [sourceInventoryFixture()];
  item.readyForItemReview = true;
  item.state = state;
  item.itemReviewRecords = withItemRecord ? [itemReviewFixture()] : [];
  item.reviewedItemCount = withItemRecord ? 1 : 0;
  return ledger;
}

function runCase(name, mutate, expectedValid, expectedText) {
  const ledger = mutate(clone(baseLedger));
  const result = validateLedger(ledger, manifest);
  const actualValid = result.errors.length === 0;
  const textMatched = !expectedText || result.errors.some((error) => error.includes(expectedText));
  return {
    name,
    expectedValid,
    actualValid,
    textMatched,
    passed: actualValid === expectedValid && textMatched,
    errors: result.errors
  };
}

const cases = [];
const baseline = validateLedger(baseLedger, manifest);
cases.push({
  name: '当前空白证据台账保持诚实基线',
  expectedValid: true,
  actualValid: baseline.errors.length === 0,
  textMatched: true,
  passed: baseline.errors.length === 0,
  errors: baseline.errors
});

const sourcesReady = validateLedger(prepareDataset('sources_ready', false), manifest);
cases.push({
  name: '资料清单完整但尚未逐条复核',
  expectedValid: true,
  actualValid: sourcesReady.errors.length === 0,
  textMatched: true,
  passed: sourcesReady.errors.length === 0,
  errors: sourcesReady.errors
});

const inReview = validateLedger(prepareDataset('in_review', true), manifest);
cases.push({
  name: '完整逐条记录允许进入复核中',
  expectedValid: true,
  actualValid: inReview.errors.length === 0,
  textMatched: true,
  passed: inReview.errors.length === 0,
  errors: inReview.errors
});

cases.push(runCase('逐条记录缺少 decision', (ledger) => {
  const prepared = prepareDataset('in_review', true);
  delete prepared.datasets[0].itemReviewRecords[0].decision;
  return prepared;
}, false, '缺少必填字段：decision'));

cases.push(runCase('逐条记录数据集路径错位', () => {
  const prepared = prepareDataset('in_review', true);
  prepared.datasets[0].itemReviewRecords[0].datasetPath = 'cnc/diagnosis-data.js';
  return prepared;
}, false, '必须与所属数据集一致'));

cases.push(runCase('已复核数量不得手工夸大', () => {
  const prepared = prepareDataset('in_review', true);
  prepared.datasets[0].reviewedItemCount = 2;
  return prepared;
}, false, '必须等于已登记的唯一逐条复核 itemKey 数量'));

cases.push(runCase('in_review 不得缺少逐条记录', () => prepareDataset('in_review', false), false, '进入 in_review 前'));

cases.push(runCase('证据不足时不得标记复核完成', () => {
  const prepared = prepareDataset('review_complete', true);
  prepared.datasets[0].itemReviewRecords[0].decision = 'insufficient_evidence';
  return prepared;
}, false, '不得标记 review_complete'));

cases.push(runCase('没有资料清单不得登记逐条记录', (ledger) => {
  const item = ledger.datasets[0];
  item.itemReviewRecords = [itemReviewFixture()];
  item.reviewedItemCount = 1;
  item.state = 'in_review';
  item.readyForItemReview = false;
  return ledger;
}, false, '进入 in_review 前'));

cases.push(runCase('资料清单禁止未受控字段', () => {
  const prepared = prepareDataset('sources_ready', false);
  prepared.datasets[0].sourceRecords[0].operationalUseAllowed = true;
  return prepared;
}, false, '含未允许字段'));

cases.push(runCase('数据集根节点禁止未受控字段', (ledger) => {
  ledger.datasets[0].verified = true;
  return ledger;
}, false, '含未允许字段'));

const failedCases = cases.filter((item) => !item.passed);
const report = {
  generatedAt: new Date().toISOString(),
  result: failedCases.length ? 'failure' : 'success',
  baselineCounts: baseline.counts,
  totalCases: cases.length,
  passedCases: cases.length - failedCases.length,
  cases
};

fs.writeFileSync(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(OUTPUT_DIR, 'findings.txt'), [
  `CNC 资料清单与逐条复核记录边界：${report.result}`,
  `测试场景：${report.totalCases}`,
  `通过场景：${report.passedCases}`,
  '',
  ...cases.map((item) => `${item.passed ? 'PASS' : 'FAIL'} | ${item.name} | 预期 ${item.expectedValid ? '通过' : '失败'} | 实际 ${item.actualValid ? '通过' : '失败'}`),
  '',
  ...(failedCases.length ? failedCases.flatMap((item) => item.errors.map((error) => `ERROR ${item.name}: ${error}`)) : [
    'PASS: 资料清单只决定是否可开始逐条复核；逐条结论必须满足完整 Schema、数据集归属、计数和状态流转约束。'
  ])
].join('\n') + '\n');

if (failedCases.length) {
  console.error('CNC 证据记录分层边界审计失败', report);
  process.exit(1);
}
console.log('CNC 证据记录分层边界审计通过', {
  totalCases: report.totalCases,
  passedCases: report.passedCases,
  baselineCounts: report.baselineCounts
});
