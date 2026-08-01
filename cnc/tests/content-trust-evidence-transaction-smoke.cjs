'use strict';

const fs = require('fs');
const path = require('path');
const {
  sha256,
  validateTransaction
} = require('../tools/validate-content-trust-evidence-transaction.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(ROOT, 'artifacts', 'content-trust-evidence-transaction');
const LEDGER_PATH = path.join(ROOT, 'cnc', 'content-trust-evidence-ledger.json');
const MANIFEST_PATH = path.join(ROOT, 'cnc', 'content-trust-manifest.json');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const baseLedger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function serialize(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function sourceFixture() {
  return {
    publisher: '自动化测试发布机构',
    documentTitle: '证据事务一致性测试文档',
    documentCodeOrRevision: 'TX-TEST-REV-1',
    applicableSystemOrMachine: '自动化测试系统与测试机床配置',
    pageOrSection: '测试章节 2',
    reviewedAt: '2026-08-02',
    reviewer: '自动化测试',
    verificationNotes: '仅用于验证资料导入事务完整性，不构成任何真实机床技术结论。'
  };
}

function itemFixture(itemKey = 'TX-ALARM-001') {
  return {
    datasetPath: 'cnc/alarm-data.js',
    itemKey,
    sourceType: 'oem_manual',
    publisher: '自动化测试发布机构',
    documentTitle: '证据事务一致性测试文档',
    documentCodeOrRevision: 'TX-TEST-REV-1',
    applicableSystemOrMachine: '自动化测试系统与测试机床配置',
    pageOrSection: '测试章节 2.1',
    evidenceLocation: 'test-fixture://transaction/manual/section-2-1',
    reviewedAt: '2026-08-02',
    reviewer: '自动化测试',
    verificationNotes: '此记录只用于验证事务原子性，不表示任何真实报警或恢复步骤已经核实。',
    applicabilityNotes: '仅适用于自动化测试夹具，真实机床必须核对原厂手册、机床配置和现场工艺。',
    decision: 'supported_for_stated_scope',
    onMachineValidationRequired: true
  };
}

function prepareSourcesReady() {
  const ledger = clone(baseLedger);
  const item = ledger.datasets.find((entry) => entry.path === 'cnc/alarm-data.js');
  item.sourceRecords = [sourceFixture()];
  item.readyForItemReview = true;
  item.state = 'sources_ready';
  item.blockedReason = '已登记自动化测试资料清单，仅允许进入结构化逐条复核测试，不构成真实技术结论。';
  ledger.generatedAt = '2026-08-02T02:20:00+08:00';
  return ledger;
}

function prepareInReview() {
  const ledger = prepareSourcesReady();
  const item = ledger.datasets.find((entry) => entry.path === 'cnc/alarm-data.js');
  item.itemReviewRecords = [itemFixture()];
  item.reviewedItemCount = 1;
  item.state = 'in_review';
  item.blockedReason = '正在进行自动化测试逐条复核，未覆盖条目继续保持待复核，不得直接用于上机。';
  ledger.generatedAt = '2026-08-02T02:21:00+08:00';
  return ledger;
}

function summarize(beforeLedger, afterLedger) {
  let datasetsChanged = 0;
  let sourceRecordsAdded = 0;
  let itemReviewRecordsAdded = 0;
  let reviewedItemsAdded = 0;
  let stateTransitions = 0;
  const beforeByPath = new Map(beforeLedger.datasets.map((item) => [item.path, item]));
  for (const afterItem of afterLedger.datasets) {
    const beforeItem = beforeByPath.get(afterItem.path);
    const materialFields = ['state', 'readyForItemReview', 'reviewedItemCount', 'sourceRecords', 'itemReviewRecords', 'blockedReason'];
    if (materialFields.some((field) => JSON.stringify(beforeItem[field]) !== JSON.stringify(afterItem[field]))) datasetsChanged += 1;
    if (beforeItem.state !== afterItem.state) stateTransitions += 1;
    sourceRecordsAdded += afterItem.sourceRecords.length - beforeItem.sourceRecords.length;
    itemReviewRecordsAdded += afterItem.itemReviewRecords.length - beforeItem.itemReviewRecords.length;
    const beforeKeys = new Set(beforeItem.itemReviewRecords.map((record) => record.itemKey));
    const afterKeys = new Set(afterItem.itemReviewRecords.map((record) => record.itemKey));
    reviewedItemsAdded += [...afterKeys].filter((key) => !beforeKeys.has(key)).length;
  }
  return { datasetsChanged, sourceRecordsAdded, itemReviewRecordsAdded, reviewedItemsAdded, stateTransitions };
}

function makeTransaction(beforeLedger, afterLedger, overrides = {}) {
  const beforeText = serialize(beforeLedger);
  const afterText = serialize(afterLedger);
  const transaction = {
    schemaVersion: 1,
    transactionId: 'CNC-EVIDENCE-TX-20260802-001',
    expectedBaseLedgerSha256: sha256(beforeText),
    nextLedgerSha256: sha256(afterText),
    committedAt: '2026-08-02T02:22:00+08:00',
    actor: '自动化测试',
    changeReason: '验证资料清单与逐条复核记录必须以原子事务方式更新。',
    operationSummary: summarize(beforeLedger, afterLedger),
    ...overrides
  };
  return { beforeText, afterText, transaction };
}

function runCase(name, beforeLedger, afterLedger, mutateTransaction, expectedValid, expectedText) {
  const prepared = makeTransaction(beforeLedger, afterLedger);
  if (mutateTransaction) mutateTransaction(prepared.transaction, prepared);
  const result = validateTransaction({
    beforeText: prepared.beforeText,
    afterText: prepared.afterText,
    manifest,
    transaction: prepared.transaction
  });
  const actualValid = result.errors.length === 0;
  const textMatched = !expectedText || result.errors.some((error) => error.includes(expectedText));
  return {
    name,
    expectedValid,
    actualValid,
    textMatched,
    passed: actualValid === expectedValid && textMatched,
    errors: result.errors,
    counts: result.counts
  };
}

const cases = [];
cases.push(runCase('资料清单原子导入', baseLedger, prepareSourcesReady(), null, true));
cases.push(runCase('资料清单与逐条记录同事务导入', baseLedger, prepareInReview(), null, true));

cases.push(runCase('过期基线摘要必须失败', baseLedger, prepareSourcesReady(), (transaction) => {
  transaction.expectedBaseLedgerSha256 = '0'.repeat(64);
}, false, '事务基线摘要不一致'));

cases.push(runCase('目标摘要不一致必须失败', baseLedger, prepareSourcesReady(), (transaction) => {
  transaction.nextLedgerSha256 = '1'.repeat(64);
}, false, '事务目标摘要不一致'));

cases.push(runCase('事务汇总数量漂移必须失败', baseLedger, prepareInReview(), (transaction) => {
  transaction.operationSummary.itemReviewRecordsAdded = 2;
}, false, '与真实事务差异不一致'));

cases.push(runCase('无意义事务必须失败', baseLedger, clone(baseLedger), null, false, '禁止提交无意义事务记录'));

cases.push(runCase('资料导入不得修改优先级', baseLedger, (() => {
  const ledger = prepareSourcesReady();
  ledger.datasets[0].reviewPriority = 'P1';
  return ledger;
})(), null, false, '不得修改治理字段'));

cases.push(runCase('新增逐条记录必须匹配资料清单版本', baseLedger, (() => {
  const ledger = prepareInReview();
  ledger.datasets[0].itemReviewRecords[0].documentCodeOrRevision = 'UNLISTED-REV-9';
  return ledger;
})(), null, false, '缺少同一资料版本和适用范围的资料清单记录'));

cases.push(runCase('半写入未同步状态和计数必须失败', baseLedger, (() => {
  const ledger = prepareSourcesReady();
  ledger.datasets[0].itemReviewRecords = [itemFixture()];
  return ledger;
})(), null, false, '事务目标台账无效'));

cases.push(runCase('既有资料清单记录不得删除', prepareSourcesReady(), (() => {
  const ledger = prepareSourcesReady();
  ledger.datasets[0].sourceRecords = [];
  ledger.datasets[0].readyForItemReview = false;
  ledger.datasets[0].state = 'awaiting_sources';
  ledger.datasets[0].blockedReason = '测试删除资料后回退状态，但事务规则应阻止丢失已经登记的可追溯资料记录。';
  ledger.generatedAt = '2026-08-02T02:23:00+08:00';
  return ledger;
})(), null, false, '不得删除既有记录'));

cases.push(runCase('既有逐条复核记录不得原地改写', prepareInReview(), (() => {
  const ledger = prepareInReview();
  ledger.datasets[0].itemReviewRecords[0].verificationNotes = '尝试原地改写既有复核记录，事务门禁必须要求追加可追溯记录而不是覆盖历史。';
  ledger.generatedAt = '2026-08-02T02:24:00+08:00';
  return ledger;
})(), null, false, '不得原地修改既有记录'));

cases.push(runCase('事务记录禁止未受控字段', baseLedger, prepareSourcesReady(), (transaction) => {
  transaction.force = true;
}, false, '事务记录含未允许字段'));

const failedCases = cases.filter((item) => !item.passed);
const report = {
  generatedAt: new Date().toISOString(),
  result: failedCases.length ? 'failure' : 'success',
  totalCases: cases.length,
  passedCases: cases.length - failedCases.length,
  cases
};

fs.writeFileSync(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(OUTPUT_DIR, 'findings.txt'), [
  `CNC 内容复核证据事务一致性：${report.result}`,
  `测试场景：${report.totalCases}`,
  `通过场景：${report.passedCases}`,
  '',
  ...cases.map((item) => `${item.passed ? 'PASS' : 'FAIL'} | ${item.name} | 预期 ${item.expectedValid ? '通过' : '失败'} | 实际 ${item.actualValid ? '通过' : '失败'}`),
  '',
  ...(failedCases.length ? failedCases.flatMap((item) => item.errors.map((error) => `ERROR ${item.name}: ${error}`)) : [
    'PASS: 基线摘要、目标摘要、追加不可变、来源匹配、状态计数和事务汇总均已形成原子一致性边界。'
  ])
].join('\n') + '\n');

if (failedCases.length) {
  console.error('CNC 内容复核证据事务一致性审计失败', report);
  process.exit(1);
}
console.log('CNC 内容复核证据事务一致性审计通过', {
  totalCases: report.totalCases,
  passedCases: report.passedCases
});
