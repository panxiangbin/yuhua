#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "test-artifacts");
const sourceFile = path.join(outputDir, "video-cross-category-review.json");

function text(value) {
  return String(value == null ? "" : value).trim();
}

function csvCell(value) {
  return `"${text(value).replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

if (!fs.existsSync(sourceFile)) {
  console.error("缺少 video-cross-category-review.json，请先运行 audit-video-data.cjs");
  process.exit(1);
}

const groups = JSON.parse(fs.readFileSync(sourceFile, "utf8"));
if (!Array.isArray(groups)) {
  console.error("跨分类视频报告格式无效");
  process.exit(1);
}

const genericHints = [
  "公司", "企业", "工厂", "车间", "厂区", "展会", "宣传", "介绍", "生产",
  "装配", "调试", "检验", "包装", "发货", "安装", "客户", "案例", "实验室",
  "设备运行", "产品展示", "实力", "服务", "售后"
];

const categoryHints = {
  rotary: ["旋转蒸发", "旋蒸", "蒸发仪"],
  glass_reactor: ["玻璃反应釜", "双层反应釜", "单层反应釜", "反应器"],
  hp_reactor: ["高压反应釜", "高压釜", "水热合成"],
  vacuum: ["真空泵", "循环水泵", "隔膜泵", "抽滤"],
  hilo_circ: ["高低温循环", "冷热一体"],
  chiller: ["低温冷却", "低温泵", "冷却循环"],
  hi_circ: ["高温循环", "油浴循环"],
  bath: ["恒温槽", "水浴", "油浴", "反应浴"],
  mag_stir: ["磁力搅拌", "集热式", "电热套"],
  elec_stir: ["电动搅拌", "搅拌器", "分散", "乳化"],
  mol_dist: ["分子蒸馏", "短程蒸馏"]
};

function hintedCategories(titles) {
  const joined = titles.join(" ").toLowerCase();
  return Object.entries(categoryHints)
    .filter(([, hints]) => hints.some((hint) => joined.includes(hint.toLowerCase())))
    .map(([key]) => key);
}

function classify(group) {
  const titles = Array.isArray(group.titles) ? group.titles.map(text).filter(Boolean) : [];
  const categoryKeys = Array.isArray(group.categoryKeys) ? group.categoryKeys.map(text).filter(Boolean) : [];
  const titleText = titles.join(" ");
  const genericMatches = genericHints.filter((hint) => titleText.includes(hint));
  const equipmentMatches = hintedCategories(titles);
  const mismatchedCategories = categoryKeys.filter((key) => equipmentMatches.length && !equipmentMatches.includes(key));

  let classification = "需要人工判断";
  let priority = "中";
  let reason = "标题信息不足，无法仅凭文件哈希和分类安全判断复用是否合理。";

  if (genericMatches.length && equipmentMatches.length === 0) {
    classification = "倾向通用企业视频";
    priority = "低";
    reason = `标题包含通用场景词：${genericMatches.join("、")}；未识别出明确设备类别。`;
  } else if (equipmentMatches.length && mismatchedCategories.length) {
    classification = "疑似分类标注错误";
    priority = "高";
    reason = `标题指向 ${equipmentMatches.join("、")}，但当前还被用于 ${mismatchedCategories.join("、")} 分类。`;
  } else if (equipmentMatches.length && categoryKeys.every((key) => equipmentMatches.includes(key))) {
    classification = "倾向合理复用";
    priority = "低";
    reason = "标题识别出的设备类别与当前分类集合一致。";
  }

  return {
    reviewId: group.reviewId,
    duplicateGroupId: group.duplicateGroupId,
    classification,
    priority,
    reason,
    categoryKeys,
    categoryNames: group.categoryNames || [],
    titles,
    detectedEquipmentCategories: equipmentMatches,
    detectedGenericHints: genericMatches,
    mismatchedCategories,
    suggestedKeep: group.suggestedKeep,
    sha256: group.sha256,
    items: group.items || []
  };
}

const results = groups.map(classify);
const summary = {
  generatedAt: new Date().toISOString(),
  totalGroups: results.length,
  classificationCounts: results.reduce((counts, item) => {
    counts[item.classification] = (counts[item.classification] || 0) + 1;
    return counts;
  }, {}),
  priorityCounts: results.reduce((counts, item) => {
    counts[item.priority] = (counts[item.priority] || 0) + 1;
    return counts;
  }, {}),
  highPriorityGroups: results.filter((item) => item.priority === "高").map((item) => item.reviewId)
};

const headers = [
  "复核组", "重复组", "判断结果", "优先级", "判断依据", "当前分类键",
  "当前分类名称", "标题集合", "识别设备类别", "不匹配分类", "建议保留路径", "SHA256"
];
const rows = [headers.map(csvCell).join(",")];
results.forEach((item) => {
  rows.push([
    item.reviewId,
    item.duplicateGroupId,
    item.classification,
    item.priority,
    item.reason,
    item.categoryKeys.join(" | "),
    item.categoryNames.join(" | "),
    item.titles.join(" | "),
    item.detectedEquipmentCategories.join(" | "),
    item.mismatchedCategories.join(" | "),
    item.suggestedKeep,
    item.sha256
  ].map(csvCell).join(","));
});

fs.writeFileSync(path.join(outputDir, "video-cross-category-classification.json"), JSON.stringify({ summary, groups: results }, null, 2));
fs.writeFileSync(path.join(outputDir, "video-cross-category-classification.csv"), `\uFEFF${rows.join("\n")}`);

console.log(JSON.stringify(summary, null, 2));
console.log("分类结果仅用于确定人工复核优先级，不自动修改视频分类、标题或文件。 ");
