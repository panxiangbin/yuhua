#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "test-artifacts");
const triageFile = path.join(outputDir, "video-cross-category-record-triage.json");

function text(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeModel(value) {
  return text(value)
    .toUpperCase()
    .replace(/[（）()【】[\]，,。；;：:\s_/\\·—–]+/g, "")
    .replace(/－/g, "-");
}

function csvCell(value) {
  return `"${text(value).replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

function loadWindowFile(relativePath) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(path.join(root, relativePath), "utf8"),
    sandbox,
    { filename: relativePath }
  );
  return sandbox.window;
}

if (!fs.existsSync(triageFile)) {
  console.error("缺少 video-cross-category-record-triage.json，请先运行前置分级脚本");
  process.exit(1);
}

const triage = JSON.parse(fs.readFileSync(triageFile, "utf8"));
const groups = Array.isArray(triage.groups) ? triage.groups : [];
const records = Array.isArray(triage.records) ? triage.records : [];
const data = loadWindowFile("assets/data.js");
const products = Array.isArray(data.PRODUCTS) ? data.PRODUCTS : [];
const categories = Array.isArray(data.CATEGORIES) ? data.CATEGORIES : [];
const categoryNames = new Map(categories.map((item) => [text(item.key), text(item.name)]));

const productsByModel = new Map();
products.forEach((product, index) => {
  const model = normalizeModel(product["型号"]);
  if (!model) return;
  if (!productsByModel.has(model)) productsByModel.set(model, []);
  productsByModel.get(model).push({
    sourceRecord: index + 1,
    model: text(product["型号"]),
    name: text(product["产品名称"]),
    key: text(product.key),
    category: text(product["类别"]) || categoryNames.get(text(product.key)) || ""
  });
});

const recordsByReview = new Map();
records.forEach((record) => {
  const id = text(record.reviewId);
  if (!recordsByReview.has(id)) recordsByReview.set(id, []);
  recordsByReview.get(id).push(record);
});

const results = [];
const rows = [];

for (const group of groups) {
  const reviewId = text(group.reviewId);
  const videoRecords = recordsByReview.get(reviewId) || [];
  const modelTokens = Array.isArray(group.sharedModelTokens)
    ? group.sharedModelTokens.map(normalizeModel).filter(Boolean)
    : [];

  const exactMatches = [];
  modelTokens.forEach((token) => {
    (productsByModel.get(token) || []).forEach((product) => {
      exactMatches.push({ token, ...product });
    });
  });

  const productKeys = [...new Set(exactMatches.map((item) => item.key).filter(Boolean))];
  const videoKeys = [...new Set(videoRecords.map((item) => text(item.categoryKey)).filter(Boolean))];
  const matchingVideoKeys = videoKeys.filter((key) => productKeys.includes(key));

  let decision;
  let confidence;
  let suggestedCategoryKey = "";
  let reason;
  let suggestedAction;

  if (!modelTokens.length) {
    decision = "无可靠型号，保留人工审核";
    confidence = "低";
    reason = "上一轮未提取到共同型号词，不能与产品数据库做精确型号核对";
    suggestedAction = "结合视频画面或正式资料人工确认分类";
  } else if (!exactMatches.length) {
    decision = "产品数据库无精确型号记录";
    confidence = "低";
    reason = `产品数据库中未找到精确型号：${modelTokens.join("、")}`;
    suggestedAction = "核对型号写法或补充正式产品资料，不自动改分类";
  } else if (productKeys.length === 1 && matchingVideoKeys.length === 1) {
    suggestedCategoryKey = productKeys[0];
    decision = "产品数据库支持单一分类建议";
    confidence = "高";
    reason = `精确型号只出现在产品分类 ${suggestedCategoryKey}（${categoryNames.get(suggestedCategoryKey) || "未命名分类"}），且视频记录中存在该分类`;
    suggestedAction = `建议人工确认后，将同型号视频统一归入 ${suggestedCategoryKey}；本脚本不自动修改`;
  } else if (productKeys.length === 1 && matchingVideoKeys.length === 0) {
    suggestedCategoryKey = productKeys[0];
    decision = "视频分类均不匹配产品数据库";
    confidence = "中高";
    reason = `精确型号只出现在产品分类 ${suggestedCategoryKey}，但当前视频分类为 ${videoKeys.join("、") || "空"}`;
    suggestedAction = "优先人工核对产品数据库来源与视频画面，再决定是否修正视频分类";
  } else if (productKeys.length > 1) {
    decision = "产品数据库自身存在跨分类型号";
    confidence = "中";
    reason = `同一精确型号在产品数据库中分布于多个分类：${productKeys.join("、")}`;
    suggestedAction = "先审核产品数据库重复或别名记录，不自动判断视频正确分类";
  } else {
    decision = "证据不足，保留人工审核";
    confidence = "低";
    reason = "精确型号与当前视频分类之间没有形成唯一对应关系";
    suggestedAction = "保持现状并列入人工审核清单";
  }

  const result = {
    reviewId,
    duplicateGroupId: text(group.duplicateGroupId),
    modelTokens,
    videoCategoryKeys: videoKeys,
    exactProductMatchCount: exactMatches.length,
    productCategoryKeys: productKeys,
    matchingVideoCategoryKeys: matchingVideoKeys,
    decision,
    confidence,
    suggestedCategoryKey,
    suggestedCategoryName: categoryNames.get(suggestedCategoryKey) || "",
    reason,
    suggestedAction,
    exactProductMatches: exactMatches
  };
  results.push(result);

  videoRecords.forEach((video) => {
    rows.push({
      ...result,
      videoRecordNumber: video.recordNumber,
      videoSourceLine: video.sourceLine,
      videoTitle: video.title,
      currentCategoryKey: video.categoryKey,
      currentCategoryName: video.categoryName,
      videoFile: video.file
    });
  });
}

results.sort((a, b) => a.reviewId.localeCompare(b.reviewId, "zh-CN"));
rows.sort((a, b) => {
  const groupCompare = a.reviewId.localeCompare(b.reviewId, "zh-CN");
  return groupCompare || Number(a.videoRecordNumber) - Number(b.videoRecordNumber);
});

const summary = {
  generatedAt: new Date().toISOString(),
  reviewGroups: results.length,
  exactProductSupportedGroups: results.filter((item) => item.decision === "产品数据库支持单一分类建议").length,
  allVideoCategoriesMismatchGroups: results.filter((item) => item.decision === "视频分类均不匹配产品数据库").length,
  productDatabaseCrossCategoryGroups: results.filter((item) => item.decision === "产品数据库自身存在跨分类型号").length,
  noExactProductModelGroups: results.filter((item) => item.decision === "产品数据库无精确型号记录").length,
  manualReviewGroups: results.filter((item) => /人工审核|证据不足/.test(item.decision)).length
};

const headers = [
  "复核组", "重复组", "共同型号词", "视频分类键", "产品精确匹配数", "产品分类键",
  "匹配的视频分类", "结论", "置信度", "建议分类键", "建议分类名称", "判断依据",
  "建议动作", "视频源记录", "视频源行号", "视频标题", "当前分类键", "当前分类名称", "视频路径"
];
const csvRows = [headers.map(csvCell).join(",")];
rows.forEach((item) => {
  csvRows.push([
    item.reviewId,
    item.duplicateGroupId,
    item.modelTokens.join(" | "),
    item.videoCategoryKeys.join(" | "),
    item.exactProductMatchCount,
    item.productCategoryKeys.join(" | "),
    item.matchingVideoCategoryKeys.join(" | "),
    item.decision,
    item.confidence,
    item.suggestedCategoryKey,
    item.suggestedCategoryName,
    item.reason,
    item.suggestedAction,
    item.videoRecordNumber,
    item.videoSourceLine,
    item.videoTitle,
    item.currentCategoryKey,
    item.currentCategoryName,
    item.videoFile
  ].map(csvCell).join(","));
});

fs.writeFileSync(
  path.join(outputDir, "video-model-category-reconciliation.json"),
  JSON.stringify({ summary, groups: results, records: rows }, null, 2)
);
fs.writeFileSync(
  path.join(outputDir, "video-model-category-reconciliation.csv"),
  `\uFEFF${csvRows.join("\n")}`
);

console.log(JSON.stringify(summary, null, 2));
console.log("精确型号核对只生成分类建议，不自动修改视频或产品数据。");

if (results.length !== groups.length) {
  console.error("核对结果组数与前置分级组数不一致");
  process.exit(1);
}
