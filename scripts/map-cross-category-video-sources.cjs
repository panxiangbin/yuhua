#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "test-artifacts");
const videosFile = path.join(root, "assets/videos.js");
const classificationFile = path.join(outputDir, "video-cross-category-classification.json");

function text(value) {
  return String(value == null ? "" : value).trim();
}

function csvCell(value) {
  return `"${text(value).replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

function normalizePath(value) {
  return text(value).replace(/\\/g, "/").replace(/^\.\//, "");
}

function loadVideos() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(videosFile, "utf8"), sandbox, { filename: "assets/videos.js" });
  return Array.isArray(sandbox.window.VIDEOS) ? sandbox.window.VIDEOS : [];
}

function sourceLineMap(raw) {
  const lines = raw.split(/\r?\n/);
  const map = new Map();
  lines.forEach((line, index) => {
    const match = line.match(/"file"\s*:\s*"([^"]+)"/);
    if (!match) return;
    const file = normalizePath(match[1]);
    if (!map.has(file)) map.set(file, []);
    map.get(file).push(index + 1);
  });
  return map;
}

function modelTokens(title) {
  return [...new Set(text(title)
    .toUpperCase()
    .match(/[A-Z]{1,8}(?:[-_/]?[A-Z0-9]{1,12})+/g) || [])]
    .map((item) => item.replace(/_/g, "-"));
}

if (!fs.existsSync(classificationFile)) {
  console.error("缺少 video-cross-category-classification.json，请先运行前置视频审计脚本");
  process.exit(1);
}

const videosRaw = fs.readFileSync(videosFile, "utf8");
const videos = loadVideos();
const lineMap = sourceLineMap(videosRaw);
const classification = JSON.parse(fs.readFileSync(classificationFile, "utf8"));
const groups = Array.isArray(classification.groups) ? classification.groups : [];

const recordsByFile = new Map();
videos.forEach((video, index) => {
  const file = normalizePath(video.file);
  if (!recordsByFile.has(file)) recordsByFile.set(file, []);
  recordsByFile.get(file).push({
    recordNumber: index + 1,
    sourceLine: (lineMap.get(file) || [])[recordsByFile.get(file).length] || "",
    title: text(video.title),
    categoryKey: text(video.key),
    categoryName: text(video.sub),
    file,
    poster: normalizePath(video.poster),
    modelTokens: modelTokens(video.title)
  });
});

const rows = [];
const unresolved = [];

groups.forEach((group) => {
  const detected = Array.isArray(group.detectedEquipmentCategories)
    ? group.detectedEquipmentCategories.map(text).filter(Boolean)
    : [];
  const mismatched = Array.isArray(group.mismatchedCategories)
    ? group.mismatchedCategories.map(text).filter(Boolean)
    : [];

  (group.items || []).forEach((item) => {
    const file = normalizePath(item.file);
    const matches = recordsByFile.get(file) || [];
    if (!matches.length) {
      unresolved.push({ reviewId: group.reviewId, file, reason: "在 assets/videos.js 中未找到对应路径" });
      return;
    }

    matches.forEach((record) => {
      const categoryStatus = detected.length === 0
        ? "无法仅凭标题判断"
        : detected.includes(record.categoryKey)
          ? "标题与分类方向一致"
          : "标题与分类方向不一致";
      const reviewAction = mismatched.includes(record.categoryKey)
        ? "优先人工核对该分类记录"
        : "保留候选，等待人工确认";

      rows.push({
        reviewId: group.reviewId,
        duplicateGroupId: group.duplicateGroupId,
        priority: group.priority,
        classification: group.classification,
        recordNumber: record.recordNumber,
        sourceLine: record.sourceLine,
        title: record.title,
        modelTokens: record.modelTokens.join(" | "),
        categoryKey: record.categoryKey,
        categoryName: record.categoryName,
        categoryStatus,
        reviewAction,
        file: record.file,
        poster: record.poster,
        sha256: group.sha256,
        reason: group.reason
      });
    });
  });
});

rows.sort((a, b) => {
  const reviewCompare = a.reviewId.localeCompare(b.reviewId, "zh-CN");
  if (reviewCompare) return reviewCompare;
  return a.recordNumber - b.recordNumber;
});

const summary = {
  generatedAt: new Date().toISOString(),
  totalClassificationGroups: groups.length,
  mappedSourceRecords: rows.length,
  unresolvedMappings: unresolved.length,
  highPrioritySourceRecords: rows.filter((item) => item.priority === "高").length,
  inconsistentCategoryRecords: rows.filter((item) => item.categoryStatus === "标题与分类方向不一致").length,
  reviewGroups: [...new Set(rows.map((item) => item.reviewId))]
};

const headers = [
  "复核组", "重复组", "优先级", "判断结果", "源记录序号", "源文件行号",
  "视频标题", "识别型号词", "分类键", "分类名称", "标题分类一致性",
  "建议人工动作", "视频路径", "封面路径", "SHA256", "判断依据"
];

const csvRows = [headers.map(csvCell).join(",")];
rows.forEach((item) => {
  csvRows.push([
    item.reviewId,
    item.duplicateGroupId,
    item.priority,
    item.classification,
    item.recordNumber,
    item.sourceLine,
    item.title,
    item.modelTokens,
    item.categoryKey,
    item.categoryName,
    item.categoryStatus,
    item.reviewAction,
    item.file,
    item.poster,
    item.sha256,
    item.reason
  ].map(csvCell).join(","));
});

fs.writeFileSync(
  path.join(outputDir, "video-cross-category-source-map.json"),
  JSON.stringify({ summary, records: rows, unresolved }, null, 2)
);
fs.writeFileSync(
  path.join(outputDir, "video-cross-category-source-map.csv"),
  `\uFEFF${csvRows.join("\n")}`
);

console.log(JSON.stringify(summary, null, 2));
console.log("源记录映射仅用于人工核对，不自动修改视频标题、分类、路径或文件。 ");

if (unresolved.length) {
  console.error(`存在 ${unresolved.length} 条无法映射的跨分类视频记录`);
  process.exit(1);
}
