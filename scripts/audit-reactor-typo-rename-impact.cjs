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

function csvCell(value) {
  return `"${clean(value).replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
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
    if (entry.isDirectory()) {
      walkTextFiles(fullPath, result);
      continue;
    }
    if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) result.push(fullPath);
  }
  return result;
}

function findOccurrences(text, needle) {
  if (!needle) return [];
  const matches = [];
  let offset = 0;
  while ((offset = text.indexOf(needle, offset)) !== -1) {
    const line = text.slice(0, offset).split("\n").length;
    matches.push({ offset, line });
    offset += needle.length;
  }
  return matches;
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

const genericTypoLocations = textFiles.flatMap((file) => {
  const matches = findOccurrences(file.content, TYPO);
  if (!matches.length) return [];
  return [{
    file: file.relativePath,
    occurrences: matches.length,
    lines: Array.from(new Set(matches.map((match) => match.line))).join(";")
  }];
});

const records = specs.flatMap((spec, index) => {
  const fields = {
    title: clean(spec.title),
    series: clean(spec.series),
    page: clean(spec.page),
    download: clean(spec.dl)
  };
  if (!Object.values(fields).some((value) => value.includes(TYPO))) return [];

  const corrected = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, value.replaceAll(TYPO, CORRECT)])
  );
  const typoValues = Array.from(new Set(Object.values(fields).filter((value) => value.includes(TYPO))));

  const references = [];
  for (const file of textFiles) {
    const matchedValues = [];
    const matchedLines = new Set();
    let occurrences = 0;

    for (const value of typoValues) {
      const matches = findOccurrences(file.content, value);
      if (!matches.length) continue;
      occurrences += matches.length;
      matchedValues.push(value);
      matches.forEach((match) => matchedLines.add(match.line));
    }

    if (occurrences) {
      references.push({
        file: file.relativePath,
        occurrences,
        lines: Array.from(matchedLines).sort((a, b) => a - b).join(";"),
        matchedValues: matchedValues.join(" | ")
      });
    }
  }

  const currentPageExists = Boolean(fields.page) && fs.existsSync(path.join(root, fields.page));
  const proposedPageExists = Boolean(corrected.page) && fs.existsSync(path.join(root, corrected.page));
  const currentDownloadExists = Boolean(fields.download) && fs.existsSync(path.join(root, fields.download));
  const proposedDownloadExists = Boolean(corrected.download) && fs.existsSync(path.join(root, corrected.download));

  let risk = "中";
  const blockers = [];
  if (corrected.page !== fields.page && proposedPageExists) blockers.push("修正后的页面路径已存在，重命名前需处理冲突");
  if (corrected.download !== fields.download && proposedDownloadExists) blockers.push("修正后的下载路径已存在，重命名前需处理冲突");
  if (fields.page && !currentPageExists) blockers.push("当前页面路径已缺失");
  if (fields.download && !currentDownloadExists) blockers.push("当前下载文件已缺失");
  if (blockers.length) risk = "高";

  return [{
    specIndex: index + 1,
    model: clean(spec.model),
    currentTitle: fields.title,
    proposedTitle: corrected.title,
    currentSeries: fields.series,
    proposedSeries: corrected.series,
    currentPage: fields.page,
    proposedPage: corrected.page,
    currentPageExists: currentPageExists ? "是" : "否",
    proposedPageConflict: proposedPageExists ? "是" : "否",
    currentDownload: fields.download,
    proposedDownload: corrected.download,
    currentDownloadExists: currentDownloadExists ? "是" : "否",
    proposedDownloadConflict: proposedDownloadExists ? "是" : "否",
    exactReferenceFileCount: references.length,
    exactReferenceOccurrenceCount: references.reduce((sum, item) => sum + item.occurrences, 0),
    exactReferenceFiles: references.map((item) => `${item.file}:${item.lines} (${item.occurrences})`).join(" | "),
    risk,
    blockers: blockers.join(" | "),
    recommendation: blockers.length
      ? "先人工处理冲突或缺失资源，再同步修正标题、页面路径、下载路径和全部精确引用"
      : "可进入人工批准后的原子重命名计划；必须在同一提交中同步更新标题、文件路径和全部精确引用"
  }];
});

const summary = {
  generatedAt: new Date().toISOString(),
  typoSpecRecords: records.length,
  highRiskRecords: records.filter((record) => record.risk === "高").length,
  missingCurrentPages: records.filter((record) => record.currentPage && record.currentPageExists === "否").length,
  missingCurrentDownloads: records.filter((record) => record.currentDownload && record.currentDownloadExists === "否").length,
  proposedPageConflicts: records.filter((record) => record.proposedPageConflict === "是").length,
  proposedDownloadConflicts: records.filter((record) => record.proposedDownloadConflict === "是").length,
  exactReferencedFiles: new Set(records.flatMap((record) => record.exactReferenceFiles.split(" | ").filter(Boolean).map((entry) => entry.split(":")[0]))).size,
  genericTypoFiles: genericTypoLocations.length,
  genericTypoOccurrences: genericTypoLocations.reduce((sum, item) => sum + item.occurrences, 0),
  automaticRenames: 0,
  safetyRule: "本脚本只生成重命名影响清单，不修改规格书标题、HTML文件、下载文件、产品参数、分类或联系方式",
  referenceRule: "每条规格书仅统计其完整字段值的精确引用；仓库内其他仅含错字的位置单独列出，避免重复归因和引用数量膨胀",
  recommendation: "人工批准后再采用单次原子提交同步重命名资源与精确引用，并运行静态资源、跳转、桌面端和手机端测试"
};

const report = { summary, records, genericTypoLocations };
const headers = [
  "规格书序号", "型号", "当前标题", "建议标题", "当前系列名", "建议系列名",
  "当前页面", "建议页面", "当前页面存在", "建议页面冲突", "当前下载文件", "建议下载文件",
  "当前下载存在", "建议下载冲突", "精确引用文件数", "精确引用次数", "精确引用位置", "风险", "阻断事项", "建议处理"
];
const rows = [headers.map(csvCell).join(",")].concat(records.map((record) => [
  record.specIndex, record.model, record.currentTitle, record.proposedTitle,
  record.currentSeries, record.proposedSeries, record.currentPage, record.proposedPage,
  record.currentPageExists, record.proposedPageConflict, record.currentDownload,
  record.proposedDownload, record.currentDownloadExists, record.proposedDownloadConflict,
  record.exactReferenceFileCount, record.exactReferenceOccurrenceCount, record.exactReferenceFiles,
  record.risk, record.blockers, record.recommendation
].map(csvCell).join(",")));

fs.writeFileSync(
  path.join(outputDir, "reactor-typo-rename-impact.json"),
  JSON.stringify(report, null, 2)
);
fs.writeFileSync(
  path.join(outputDir, "reactor-typo-rename-impact.csv"),
  `\uFEFF${rows.join("\n")}`
);

console.log(JSON.stringify(summary, null, 2));
records.forEach((record) => {
  console.log(`${record.model || "(无型号)"}: ${record.risk} - ${record.currentTitle}`);
});

if (!records.length) {
  console.error("ERROR: 未找到“发应釜”规格书记录，可能与上一轮审计基线不一致");
  process.exitCode = 1;
}
