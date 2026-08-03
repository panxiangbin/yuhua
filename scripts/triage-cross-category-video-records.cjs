#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "test-artifacts");
const sourceMapFile = path.join(outputDir, "video-cross-category-source-map.json");

function text(value) {
  return String(value == null ? "" : value).trim();
}

function csvCell(value) {
  return `"${text(value).replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

function normalizeTitle(value) {
  return text(value)
    .toUpperCase()
    .replace(/[（）()【】[\]，,。；;：:\s_/\\·—–-]+/g, "");
}

function tokens(value) {
  return [...new Set(text(value)
    .split("|")
    .map((item) => item.trim().toUpperCase().replace(/_/g, "-"))
    .filter(Boolean))];
}

function intersection(groups) {
  if (!groups.length) return [];
  return groups[0].filter((item) => groups.every((group) => group.includes(item)));
}

if (!fs.existsSync(sourceMapFile)) {
  console.error("缺少 video-cross-category-source-map.json，请先运行前置映射脚本");
  process.exit(1);
}

const sourceMap = JSON.parse(fs.readFileSync(sourceMapFile, "utf8"));
const records = Array.isArray(sourceMap.records) ? sourceMap.records : [];
const unresolved = Array.isArray(sourceMap.unresolved) ? sourceMap.unresolved : [];

if (unresolved.length) {
  console.error(`源记录映射仍有 ${unresolved.length} 条未解决，无法可靠分级`);
  process.exit(1);
}

const byReview = new Map();
records.forEach((record) => {
  const id = text(record.reviewId);
  if (!byReview.has(id)) byReview.set(id, []);
  byReview.get(id).push(record);
});

const groups = [];
const rows = [];

for (const [reviewId, items] of byReview.entries()) {
  const titleForms = [...new Set(items.map((item) => normalizeTitle(item.title)).filter(Boolean))];
  const categoryKeys = [...new Set(items.map((item) => text(item.categoryKey)).filter(Boolean))];
  const categoryNames = [...new Set(items.map((item) => text(item.categoryName)).filter(Boolean))];
  const tokenGroups = items.map((item) => tokens(item.modelTokens));
  const sharedModelTokens = intersection(tokenGroups);
  const allHaveModelTokens = tokenGroups.length > 0 && tokenGroups.every((group) => group.length > 0);
  const sameNormalizedTitle = titleForms.length === 1 && titleForms[0] !== "";
  const sameMediaHash = new Set(items.map((item) => text(item.sha256)).filter(Boolean)).size <= 1;

  let decision;
  let confidence;
  let reason;
  let suggestedAction;

  if (sameNormalizedTitle && sharedModelTokens.length && categoryKeys.length > 1) {
    decision = "同一型号疑似重复建立分类记录";
    confidence = "高";
    reason = `标题一致，且共同识别型号为 ${sharedModelTokens.join("、")}，但分类键不同`;
    suggestedAction = "人工确认正确分类后，只保留一条前台分类记录；暂不删除媒体文件";
  } else if (sharedModelTokens.length && categoryKeys.length > 1) {
    decision = "同一型号跨分类记录";
    confidence = "中高";
    reason = `标题文字不完全一致，但共同识别型号为 ${sharedModelTokens.join("、")}，且分类键不同`;
    suggestedAction = "核对型号对应产品系列，确认是否为别名或重复记录";
  } else if (sameNormalizedTitle && !allHaveModelTokens && categoryKeys.length > 1) {
    decision = "相同标题跨分类复用";
    confidence = "中";
    reason = "标题一致但无法提取可靠型号词，不能仅凭标题决定正确分类";
    suggestedAction = "结合视频画面或原始资料人工确认，不自动改分类";
  } else if (sameMediaHash && categoryKeys.length > 1) {
    decision = "同一媒体跨分类复用";
    confidence = "中低";
    reason = "媒体内容相同，但标题或型号证据不足，可能是通用演示或错误复用";
    suggestedAction = "人工查看视频内容，判断是否为通用素材";
  } else {
    decision = "必须人工判断";
    confidence = "低";
    reason = "标题、型号和分类之间没有足够一致证据";
    suggestedAction = "保留现状，仅列入人工审核清单";
  }

  const group = {
    reviewId,
    duplicateGroupId: text(items[0] && items[0].duplicateGroupId),
    decision,
    confidence,
    recordCount: items.length,
    categoryKeys,
    categoryNames,
    sharedModelTokens,
    sameNormalizedTitle,
    sameMediaHash,
    reason,
    suggestedAction
  };
  groups.push(group);

  items.forEach((item) => {
    rows.push({
      ...group,
      recordNumber: item.recordNumber,
      sourceLine: item.sourceLine,
      title: item.title,
      modelTokens: item.modelTokens,
      categoryKey: item.categoryKey,
      categoryName: item.categoryName,
      file: item.file,
      poster: item.poster
    });
  });
}

groups.sort((a, b) => a.reviewId.localeCompare(b.reviewId, "zh-CN"));
rows.sort((a, b) => {
  const groupCompare = a.reviewId.localeCompare(b.reviewId, "zh-CN");
  return groupCompare || Number(a.recordNumber) - Number(b.recordNumber);
});

const summary = {
  generatedAt: new Date().toISOString(),
  reviewGroups: groups.length,
  sourceRecords: rows.length,
  highConfidenceDuplicateGroups: groups.filter((item) => item.decision === "同一型号疑似重复建立分类记录").length,
  sameModelCrossCategoryGroups: groups.filter((item) => item.decision === "同一型号跨分类记录").length,
  titleOnlyGroups: groups.filter((item) => item.decision === "相同标题跨分类复用").length,
  mediaOnlyGroups: groups.filter((item) => item.decision === "同一媒体跨分类复用").length,
  manualDecisionGroups: groups.filter((item) => item.decision === "必须人工判断").length
};

const headers = [
  "复核组", "重复组", "分级结论", "置信度", "共同型号词", "分类键集合", "分类名称集合",
  "判断依据", "建议动作", "源记录序号", "源文件行号", "视频标题", "记录型号词",
  "当前分类键", "当前分类名称", "视频路径", "封面路径"
];
const csvRows = [headers.map(csvCell).join(",")];
rows.forEach((item) => {
  csvRows.push([
    item.reviewId,
    item.duplicateGroupId,
    item.decision,
    item.confidence,
    item.sharedModelTokens.join(" | "),
    item.categoryKeys.join(" | "),
    item.categoryNames.join(" | "),
    item.reason,
    item.suggestedAction,
    item.recordNumber,
    item.sourceLine,
    item.title,
    item.modelTokens,
    item.categoryKey,
    item.categoryName,
    item.file,
    item.poster
  ].map(csvCell).join(","));
});

fs.writeFileSync(
  path.join(outputDir, "video-cross-category-record-triage.json"),
  JSON.stringify({ summary, groups, records: rows }, null, 2)
);
fs.writeFileSync(
  path.join(outputDir, "video-cross-category-record-triage.csv"),
  `\uFEFF${csvRows.join("\n")}`
);

console.log(JSON.stringify(summary, null, 2));
console.log("分级结果只用于人工复核，不自动修改视频分类、标题、路径或文件。 ");

if (groups.length !== new Set(records.map((item) => text(item.reviewId))).size) {
  console.error("复核组数量与源映射不一致");
  process.exit(1);
}
