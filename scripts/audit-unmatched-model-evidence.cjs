#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "test-artifacts");
const reconciliationFile = path.join(outputDir, "video-model-category-reconciliation.json");
const MAX_TEXT_BYTES = 1024 * 1024;

function text(value) {
  return String(value == null ? "" : value).trim();
}

function normalize(value) {
  return text(value)
    .toUpperCase()
    .replace(/[（）()【】[\]，,。；;：:\s_/\\·—–－]+/g, "");
}

function csvCell(value) {
  return `"${text(value).replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

function loadWindowFile(relativePath) {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) return {};
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: relativePath });
  return sandbox.window;
}

function walk(directory, output = []) {
  if (!fs.existsSync(directory)) return output;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if ([".git", "node_modules", "test-artifacts", "assets/videos", "downloads"].includes(entry.name)) continue;
      walk(full, output);
    } else {
      output.push(full);
    }
  }
  return output;
}

if (!fs.existsSync(reconciliationFile)) {
  console.error("缺少 video-model-category-reconciliation.json，请先运行精确型号核对脚本");
  process.exit(1);
}

const reconciliation = JSON.parse(fs.readFileSync(reconciliationFile, "utf8"));
const unmatchedGroups = (reconciliation.groups || []).filter(
  (group) => group.decision === "产品数据库无精确型号记录"
);
const targetModels = [...new Set(unmatchedGroups.flatMap((group) => group.modelTokens || []).map(text).filter(Boolean))];
const normalizedTargets = new Map(targetModels.map((model) => [model, normalize(model)]));

const specsWindow = loadWindowFile("assets/specs.js");
const pagesWindow = loadWindowFile("assets/pages.js");
const specs = Array.isArray(specsWindow.SPECS) ? specsWindow.SPECS : [];
const pages = Array.isArray(pagesWindow.PAGES) ? pagesWindow.PAGES : [];
const publicExtensions = new Set([".html", ".htm", ".js", ".json", ".xml", ".txt", ".md", ".csv"]);
const files = walk(root).filter((file) => publicExtensions.has(path.extname(file).toLowerCase()));
const evidenceByModel = new Map(targetModels.map((model) => [model, []]));

for (const model of targetModels) {
  const normalizedModel = normalizedTargets.get(model);
  const modelEvidence = evidenceByModel.get(model);

  specs.forEach((spec, index) => {
    const fields = [spec.model, spec.title, spec.series, spec.page, spec.dl].map(text);
    if (fields.some((field) => normalize(field).includes(normalizedModel))) {
      modelEvidence.push({
        sourceType: "规格书记录",
        source: "assets/specs.js",
        sourceRecord: index + 1,
        matchedValue: fields.filter(Boolean).join(" | "),
        categoryKey: text(spec.key),
        categoryName: text(spec.series),
        confidence: "高"
      });
    }
  });

  pages.forEach((page, index) => {
    const prefixes = Array.isArray(page.prefixes) ? page.prefixes : [];
    const fields = [page.page].concat(prefixes).map(text);
    if (fields.some((field) => normalize(field).includes(normalizedModel))) {
      modelEvidence.push({
        sourceType: "详情页映射",
        source: "assets/pages.js",
        sourceRecord: index + 1,
        matchedValue: fields.filter(Boolean).join(" | "),
        categoryKey: "",
        categoryName: "",
        confidence: "高"
      });
    }
  });
}

let scannedTextFiles = 0;
let skippedLargeFiles = 0;
for (const file of files) {
  const relative = path.relative(root, file).replace(/\\/g, "/");
  if (["assets/videos.js", "assets/data.js"].includes(relative)) continue;

  const normalizedPath = normalize(relative);
  for (const model of targetModels) {
    if (normalizedPath.includes(normalizedTargets.get(model))) {
      evidenceByModel.get(model).push({
        sourceType: "公开文件名",
        source: relative,
        sourceRecord: "",
        matchedValue: relative,
        categoryKey: "",
        categoryName: "",
        confidence: "中高"
      });
    }
  }

  let stat;
  try {
    stat = fs.statSync(file);
  } catch (_) {
    continue;
  }
  if (stat.size > MAX_TEXT_BYTES) {
    skippedLargeFiles += 1;
    continue;
  }

  let content;
  try {
    content = fs.readFileSync(file, "utf8");
    scannedTextFiles += 1;
  } catch (_) {
    continue;
  }

  const normalizedContent = normalize(content);
  for (const model of targetModels) {
    const normalizedModel = normalizedTargets.get(model);
    if (!normalizedContent.includes(normalizedModel)) continue;
    const lines = content.split(/\r?\n/);
    const lineIndex = lines.findIndex((line) => normalize(line).includes(normalizedModel));
    const excerpt = lineIndex >= 0 ? lines[lineIndex].trim().slice(0, 240) : "";
    evidenceByModel.get(model).push({
      sourceType: "公开文本内容",
      source: relative,
      sourceRecord: lineIndex >= 0 ? lineIndex + 1 : "",
      matchedValue: excerpt,
      categoryKey: "",
      categoryName: "",
      confidence: "中"
    });
  }
}

const evidence = [];
for (const model of targetModels) {
  const modelEvidence = evidenceByModel.get(model) || [];
  const uniqueEvidence = [];
  const seen = new Set();
  for (const item of modelEvidence) {
    const key = [item.sourceType, item.source, item.sourceRecord, item.matchedValue].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueEvidence.push(item);
  }

  let conclusion;
  let recommendation;
  if (uniqueEvidence.some((item) => item.sourceType === "规格书记录" || item.sourceType === "详情页映射")) {
    conclusion = "存在正式资料结构证据，疑似产品数据库漏填型号";
    recommendation = "人工核对规格书或详情页原文后，再补充产品型号与分类；本脚本不修改数据";
  } else if (uniqueEvidence.length) {
    conclusion = "存在弱证据，但不足以补写产品数据库";
    recommendation = "人工查看命中文件与视频画面，确认型号归属";
  } else {
    conclusion = "仓库未发现独立型号证据";
    recommendation = "需要提供正式产品资料、图片或业务确认，保持现状";
  }

  evidence.push({
    model,
    normalizedModel: normalizedTargets.get(model),
    evidenceCount: uniqueEvidence.length,
    conclusion,
    recommendation,
    evidence: uniqueEvidence
  });
}

const rows = [];
evidence.forEach((result) => {
  if (!result.evidence.length) {
    rows.push({ ...result, sourceType: "", source: "", sourceRecord: "", matchedValue: "", confidence: "" });
    return;
  }
  result.evidence.forEach((item) => rows.push({ ...result, ...item }));
});

const summary = {
  generatedAt: new Date().toISOString(),
  targetModels: targetModels.length,
  modelsWithFormalEvidence: evidence.filter((item) => item.conclusion.startsWith("存在正式资料结构证据")).length,
  modelsWithWeakEvidence: evidence.filter((item) => item.conclusion.startsWith("存在弱证据")).length,
  modelsWithoutEvidence: evidence.filter((item) => item.conclusion.startsWith("仓库未发现")).length,
  totalEvidenceItems: evidence.reduce((sum, item) => sum + item.evidenceCount, 0),
  candidateFiles: files.length,
  scannedTextFiles,
  skippedLargeFiles,
  maxTextBytes: MAX_TEXT_BYTES
};

const headers = [
  "型号", "证据数量", "结论", "建议动作", "证据类型", "来源文件", "来源记录", "命中内容", "置信度"
];
const csvRows = [headers.map(csvCell).join(",")];
rows.forEach((row) => {
  csvRows.push([
    row.model,
    row.evidenceCount,
    row.conclusion,
    row.recommendation,
    row.sourceType,
    row.source,
    row.sourceRecord,
    row.matchedValue,
    row.confidence
  ].map(csvCell).join(","));
});

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  path.join(outputDir, "unmatched-model-evidence.json"),
  JSON.stringify({ summary, models: evidence }, null, 2)
);
fs.writeFileSync(
  path.join(outputDir, "unmatched-model-evidence.csv"),
  `\uFEFF${csvRows.join("\n")}`
);

console.log(JSON.stringify(summary, null, 2));
for (const result of evidence) {
  console.log(`${result.model}: ${result.conclusion}（${result.evidenceCount} 条证据）`);
}
console.log("该审计仅生成证据与人工建议，不修改产品、视频或规格书数据。");

if (evidence.length !== targetModels.length) {
  console.error("审计结果数量与目标型号数量不一致");
  process.exit(1);
}
