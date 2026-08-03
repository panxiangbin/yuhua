#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "test-artifacts");
fs.mkdirSync(outputDir, { recursive: true });

const TYPO = "发应釜";
const CORRECT = "反应釜";
const TEXT_EXTENSIONS = new Set([
  ".html", ".htm", ".js", ".cjs", ".mjs", ".json", ".css", ".md", ".txt",
  ".xml", ".yml", ".yaml", ".csv", ".svg"
]);
const SKIP_DIRS = new Set([".git", "node_modules", "test-artifacts"]);

function clean(value) {
  return String(value == null ? "" : value).trim();
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function csvCell(value) {
  return `"${clean(value).replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

function load(relativePath, sandbox) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), "utf8"), sandbox, {
    filename: relativePath
  });
}

function walkTextFiles(directory, result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walkTextFiles(fullPath, result);
    else if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) result.push(fullPath);
  }
  return result;
}

function occurrences(text, needle) {
  if (!needle) return [];
  const result = [];
  let offset = 0;
  while ((offset = text.indexOf(needle, offset)) !== -1) {
    result.push(text.slice(0, offset).split("\n").length);
    offset += needle.length;
  }
  return result;
}

const sandbox = { window: {} };
vm.createContext(sandbox);
load("assets/specs.js", sandbox);
const specs = Array.isArray(sandbox.window.SPECS) ? sandbox.window.SPECS : [];

const textFiles = walkTextFiles(root).map((absolutePath) => ({
  absolutePath,
  relativePath: toPosix(path.relative(root, absolutePath)),
  content: fs.readFileSync(absolutePath, "utf8")
}));

const records = specs.flatMap((spec, index) => {
  const current = {
    title: clean(spec.title),
    series: clean(spec.series),
    page: clean(spec.page),
    download: clean(spec.dl)
  };
  if (!Object.values(current).some((value) => value.includes(TYPO))) return [];

  const proposed = Object.fromEntries(
    Object.entries(current).map(([key, value]) => [key, value.replaceAll(TYPO, CORRECT)])
  );
  const replacements = Array.from(new Set(Object.values(current).filter((value) => value.includes(TYPO))))
    .map((from) => ({ from, to: from.replaceAll(TYPO, CORRECT) }));

  const contentEdits = [];
  for (const file of textFiles) {
    const edits = replacements.flatMap((replacement) => {
      const lines = occurrences(file.content, replacement.from);
      return lines.length ? [{ ...replacement, occurrences: lines.length, lines }] : [];
    });
    if (edits.length) contentEdits.push({ file: file.relativePath, edits });
  }

  const fileMoves = [];
  if (current.page && current.page !== proposed.page) {
    fileMoves.push({ kind: "page", from: current.page, to: proposed.page });
  }
  if (current.download && current.download !== proposed.download) {
    fileMoves.push({ kind: "download", from: current.download, to: proposed.download });
  }

  const blockers = [];
  for (const move of fileMoves) {
    if (!fs.existsSync(path.join(root, move.from))) blockers.push(`源文件缺失：${move.from}`);
    if (fs.existsSync(path.join(root, move.to))) blockers.push(`目标路径已存在：${move.to}`);
  }
  for (const replacement of replacements) {
    if (replacement.from !== replacement.to && replacement.to.includes(TYPO)) {
      blockers.push(`替换结果仍含错字：${replacement.to}`);
    }
  }

  return [{
    specIndex: index + 1,
    model: clean(spec.model),
    current,
    proposed,
    fileMoves,
    contentEdits,
    blockers,
    readyForHumanApproval: blockers.length === 0,
    automaticExecution: false
  }];
});

const moveTargets = new Map();
for (const record of records) {
  for (const move of record.fileMoves) {
    const owners = moveTargets.get(move.to) || [];
    owners.push(record.specIndex);
    moveTargets.set(move.to, owners);
  }
}
for (const record of records) {
  for (const move of record.fileMoves) {
    const owners = moveTargets.get(move.to) || [];
    if (owners.length > 1) record.blockers.push(`多个规格书计划写入同一目标：${move.to}`);
  }
  record.blockers = Array.from(new Set(record.blockers));
  record.readyForHumanApproval = record.blockers.length === 0;
}

const allMoves = records.flatMap((record) => record.fileMoves.map((move) => ({
  specIndex: record.specIndex,
  model: record.model,
  ...move
})));
const allContentFiles = Array.from(new Set(records.flatMap((record) => record.contentEdits.map((edit) => edit.file))));
const summary = {
  generatedAt: new Date().toISOString(),
  typoSpecRecords: records.length,
  plannedFileMoves: allMoves.length,
  plannedContentFiles: allContentFiles.length,
  recordsReadyForHumanApproval: records.filter((record) => record.readyForHumanApproval).length,
  blockedRecords: records.filter((record) => !record.readyForHumanApproval).length,
  automaticExecution: 0,
  scope: "仅生成原子重命名计划，不移动文件、不替换内容、不修改产品参数、分类或联系方式",
  requiredValidation: [
    "node scripts/check-no-direct-contact.cjs",
    "node scripts/audit-public-contact-leaks.cjs",
    "node scripts/audit-static-assets.cjs",
    "node scripts/audit-reactor-typo-rename-impact.cjs",
    "node scripts/build-reactor-typo-atomic-rename-plan.cjs",
    "运行网站完整CI、桌面端和手机端浏览器测试、可访问性检查"
  ]
};

const plan = {
  summary,
  executionOrder: [
    "人工批准整批计划并确认目标命名",
    "在同一分支和同一提交中先移动页面及下载文件",
    "同步替换 assets/specs.js 和所有精确引用文件",
    "全仓库复查“发应釜”残留与旧路径引用",
    "运行全部自动验证；任何失败立即撤销整批提交"
  ],
  rollbackRule: "必须保持单次原子提交；验证失败时整体回退，不允许留下部分重命名状态",
  records
};

fs.writeFileSync(
  path.join(outputDir, "reactor-typo-atomic-rename-plan.json"),
  JSON.stringify(plan, null, 2)
);

const headers = [
  "规格书序号", "型号", "可提交人工批准", "阻断事项", "文件移动数", "内容引用文件数",
  "当前标题", "建议标题", "当前页面", "建议页面", "当前下载", "建议下载"
];
const rows = [headers.map(csvCell).join(",")].concat(records.map((record) => [
  record.specIndex,
  record.model,
  record.readyForHumanApproval ? "是" : "否",
  record.blockers.join(" | "),
  record.fileMoves.length,
  record.contentEdits.length,
  record.current.title,
  record.proposed.title,
  record.current.page,
  record.proposed.page,
  record.current.download,
  record.proposed.download
].map(csvCell).join(",")));
fs.writeFileSync(
  path.join(outputDir, "reactor-typo-atomic-rename-plan.csv"),
  `\uFEFF${rows.join("\n")}`
);

console.log(JSON.stringify(summary, null, 2));
records.filter((record) => record.blockers.length).forEach((record) => {
  console.log(`${record.model || "(无型号)"}: ${record.blockers.join(" | ")}`);
});

if (!records.length) {
  console.error("ERROR: 未找到待规划的“发应釜”规格书记录，可能与审计基线不一致");
  process.exitCode = 1;
}
