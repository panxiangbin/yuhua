'use strict';

const fs = require('fs');
const path = require('path');
const {
  SUMMARY_FIELDS,
  sha256,
  validateTransaction
} = require('./validate-content-trust-evidence-transaction.cjs');

const OPTION_NAMES = new Set([
  'before',
  'after',
  'manifest',
  'transaction-id',
  'actor',
  'reason',
  'committed-at',
  'output'
]);
const REQUIRED_OPTIONS = ['before', 'after', 'manifest', 'transaction-id', 'actor', 'reason'];

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help') return { help: true };
    if (!token.startsWith('--')) throw new Error(`无法识别的参数：${token}`);
    const name = token.slice(2);
    if (!OPTION_NAMES.has(name)) throw new Error(`不允许的参数：--${name}`);
    if (Object.prototype.hasOwnProperty.call(options, name)) throw new Error(`参数重复：--${name}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`参数缺少值：--${name}`);
    options[name] = value;
    index += 1;
  }
  for (const name of REQUIRED_OPTIONS) {
    if (typeof options[name] !== 'string' || options[name].trim() === '') {
      throw new Error(`缺少必填参数：--${name}`);
    }
  }
  return options;
}

function zeroSummary() {
  return Object.fromEntries([...SUMMARY_FIELDS].map((field) => [field, 0]));
}

function summaryFromCounts(counts) {
  const summary = {};
  for (const field of SUMMARY_FIELDS) {
    if (!Number.isInteger(counts && counts[field]) || counts[field] < 0) {
      throw new Error(`正式事务校验器未返回有效差异计数：${field}`);
    }
    summary[field] = counts[field];
  }
  return summary;
}

function generateTransaction({
  beforeText,
  afterText,
  manifest,
  transactionId,
  actor,
  changeReason,
  committedAt
}) {
  const base = {
    schemaVersion: 1,
    transactionId,
    expectedBaseLedgerSha256: sha256(beforeText),
    nextLedgerSha256: sha256(afterText),
    committedAt,
    actor,
    changeReason
  };

  const probe = validateTransaction({
    beforeText,
    afterText,
    manifest,
    transaction: {
      ...base,
      operationSummary: zeroSummary()
    }
  });

  const transaction = {
    ...base,
    operationSummary: summaryFromCounts(probe.counts)
  };
  const validation = validateTransaction({ beforeText, afterText, manifest, transaction });
  if (validation.errors.length) {
    throw new Error(`无法生成有效的 CNC 证据事务记录：\n- ${validation.errors.join('\n- ')}`);
  }
  return { transaction, validation };
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} 无法读取或解析：${error.message}`);
  }
}

function resolveSafeOutput(outputPath, protectedPaths) {
  if (!outputPath) return null;
  const resolved = path.resolve(process.cwd(), outputPath);
  if (protectedPaths.includes(resolved)) {
    throw new Error('输出路径不得覆盖基线台账、目标台账或可信度清单');
  }
  return resolved;
}

function usage() {
  return [
    '用法：',
    'node cnc/tools/generate-content-trust-evidence-transaction.cjs \\',
    '  --before <更新前台账.json> \\',
    '  --after <更新后台账.json> \\',
    '  --manifest <可信度清单.json> \\',
    '  --transaction-id <CNC-EVIDENCE-...> \\',
    '  --actor <执行人或受控工具名称> \\',
    '  --reason <至少 12 个字符的变更原因> \\',
    '  [--committed-at <ISO 8601 时间>] \\',
    '  [--output <事务记录.json>]',
    '',
    '未指定 --output 时，事务 JSON 输出到标准输出。工具只计算摘要和真实差异，不生成任何技术结论。'
  ].join('\n');
}

function runCli(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }

  const beforePath = path.resolve(process.cwd(), options.before);
  const afterPath = path.resolve(process.cwd(), options.after);
  const manifestPath = path.resolve(process.cwd(), options.manifest);
  const outputPath = resolveSafeOutput(options.output, [beforePath, afterPath, manifestPath]);
  const beforeText = fs.readFileSync(beforePath, 'utf8');
  const afterText = fs.readFileSync(afterPath, 'utf8');
  const manifest = readJson(manifestPath, '可信度清单');
  const committedAt = options['committed-at'] || new Date().toISOString();

  const { transaction, validation } = generateTransaction({
    beforeText,
    afterText,
    manifest,
    transactionId: options['transaction-id'],
    actor: options.actor,
    changeReason: options.reason,
    committedAt
  });
  const output = `${JSON.stringify(transaction, null, 2)}\n`;

  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, output, 'utf8');
    process.stdout.write(`CNC 证据事务记录已生成：${outputPath}\n`);
    process.stdout.write(`${JSON.stringify(validation.counts)}\n`);
  } else {
    process.stdout.write(output);
  }
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = runCli(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    process.exitCode = 1;
  }
}

module.exports = {
  OPTION_NAMES,
  REQUIRED_OPTIONS,
  parseArgs,
  zeroSummary,
  summaryFromCounts,
  generateTransaction,
  runCli
};
