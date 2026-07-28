#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "test-artifacts");
fs.mkdirSync(outputDir, { recursive: true });

function clean(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeModel(value) {
  let model = clean(value);
  if (!model) return "";
  if (model.normalize) model = model.normalize("NFKC");
  return model
    .toUpperCase()
    .replace(/\.(?:DOCX?|PDF)$/i, "")
    .replace(/[（(].*?[）)]$/g, "")
    .replace(/[＿_\s]+/g, "-")
    .replace(/[—–−]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, "");
}

function csvCell(value) {
  return `"${clean(value).replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

function load(relativePath, sandbox) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), "utf8"), sandbox, { filename: relativePath });
}

const sandbox = { window: {} };
vm.createContext(sandbox);
load("assets/data.js", sandbox);
load("assets/specs.js", sandbox);

const products = Array.isArray(sandbox.window.PRODUCTS) ? sandbox.window.PRODUCTS : [];
const specs = Array.isArray(sandbox.window.SPECS) ? sandbox.window.SPECS : [];
const categories = Array.isArray(sandbox.window.CATEGORIES) ? sandbox.window.CATEGORIES : [];
const categoryNames = Object.fromEntries(categories.map((item) => [clean(item.key), clean(item.name)]));
categoryNames.misc = categoryNames.misc || "其他设备";

const specsByModel = new Map();
specs.forEach((spec, index) => {
  const model = normalizeModel(spec.model);
  if (!model) return;
  if (!specsByModel.has(model)) specsByModel.set(model, []);
  specsByModel.get(model).push({
    index: index + 1,
    model: clean(spec.model),
    title: clean(spec.title),
    key: clean(spec.key),
    page: clean(spec.page),
    dl: clean(spec.dl)
  });
});

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function titleSupportsCategory(title, key) {
  const text = clean(title).toLowerCase();
  const rules = {
    mag_stir: ["磁力搅拌", "搅拌器", "恒温搅拌", "hj-"],
    glass_reactor: ["反应釜", "反应装置", "精馏塔", "精馏釜"],
    rotary: ["旋转蒸发", "旋蒸"],
    hp_reactor: ["高压反应", "高压釜", "水热合成"],
    vacuum: ["真空泵", "循环水"],
    chiller: ["低温冷却", "冷却液循环"],
    hilo_circ: ["高低温循环"],
    hi_circ: ["高温循环"]
  };
  return (rules[key] || []).some((token) => text.includes(token));
}

const rows = [];
products.forEach((product, productIndex) => {
  const model = clean(product["型号"]);
  const normalizedModel = normalizeModel(model);
  const currentKey = clean(product.key);
  if (!normalizedModel || currentKey !== "misc") return;

  const exactSpecs = specsByModel.get(normalizedModel) || [];
  const otherCategorySpecs = exactSpecs.filter((entry) => entry.key && entry.key !== currentKey);
  if (!otherCategorySpecs.length) return;

  const candidateKeys = unique(otherCategorySpecs.map((entry) => entry.key));
  const candidatePages = unique(otherCategorySpecs.map((entry) => entry.page));
  const candidateDownloads = unique(otherCategorySpecs.map((entry) => entry.dl));
  const titles = unique(otherCategorySpecs.map((entry) => entry.title));
  const targetKey = candidateKeys.length === 1 ? candidateKeys[0] : "";
  const pageExists = candidatePages.length === 1 && fs.existsSync(path.join(root, candidatePages[0]));
  const nameMissing = !clean(product["产品名称"]);
  const titleEvidence = targetKey && titles.some((title) => titleSupportsCategory(title, targetKey));

  let confidence = "低";
  let action = "人工判断";
  let reason = "跨分类精确型号存在，但证据不足以形成唯一分类建议";

  if (targetKey && candidatePages.length === 1 && pageExists && nameMissing && titleEvidence) {
    confidence = "高";
    action = "建议人工确认后修正分类并绑定页面";
    reason = "精确型号唯一命中一个其他分类，页面真实存在，产品名称为空，规格书标题支持目标分类";
  } else if (targetKey && candidatePages.length === 1 && pageExists) {
    confidence = "中";
    action = "优先人工核对分类";
    reason = "精确型号唯一命中一个其他分类且页面存在，但标题或产品名称证据不足";
  } else if (candidateKeys.length > 1 || candidatePages.length > 1) {
    confidence = "低";
    action = "禁止自动修正";
    reason = "精确型号对应多个分类或多个页面，存在歧义";
  }

  rows.push({
    productIndex: productIndex + 1,
    model,
    productName: clean(product["产品名称"]),
    currentKey,
    currentCategory: categoryNames[currentKey] || currentKey,
    candidateKey: targetKey,
    candidateCategory: targetKey ? (categoryNames[targetKey] || targetKey) : candidateKeys.join(" | "),
    confidence,
    action,
    reason,
    specRecords: otherCategorySpecs.map((entry) => `#${entry.index} ${entry.title || entry.model}`).join(" | "),
    pages: candidatePages.join(" | "),
    downloads: candidateDownloads.join(" | "),
    titleEvidence: titleEvidence ? "是" : "否",
    pageExists: pageExists ? "是" : "否"
  });
});

const summary = {
  generatedAt: new Date().toISOString(),
  reviewedRecords: rows.length,
  highConfidence: rows.filter((row) => row.confidence === "高").length,
  mediumConfidence: rows.filter((row) => row.confidence === "中").length,
  lowConfidence: rows.filter((row) => row.confidence === "低").length,
  safetyRule: "仅生成分类与详情页建议；不修改产品数据、参数、分类或详情页绑定"
};

const report = { summary, records: rows };
const headers = [
  "产品记录序号", "型号", "产品名称", "当前分类键", "当前分类", "候选分类键", "候选分类",
  "证据置信度", "建议操作", "判断依据", "规格书记录", "候选页面", "下载文件", "标题支持分类", "页面存在"
];
const csvRows = [headers.map(csvCell).join(",")].concat(rows.map((row) => [
  row.productIndex, row.model, row.productName, row.currentKey, row.currentCategory,
  row.candidateKey, row.candidateCategory, row.confidence, row.action, row.reason,
  row.specRecords, row.pages, row.downloads, row.titleEvidence, row.pageExists
].map(csvCell).join(",")));

fs.writeFileSync(path.join(outputDir, "cross-category-detail-evidence.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(outputDir, "cross-category-detail-evidence.csv"), `\uFEFF${csvRows.join("\n")}`);

console.log(JSON.stringify(summary, null, 2));
rows.forEach((row) => {
  console.log(`${row.model}: ${row.currentCategory} -> ${row.candidateCategory} [${row.confidence}] ${row.action}`);
});

if (!rows.length) {
  console.error("ERROR: 未找到待核对的跨分类精确型号记录，可能与上游审计基线不一致");
  process.exitCode = 1;
}

if (rows.some((row) => row.pageExists === "否" && row.pages)) {
  console.error("ERROR: 候选详情页路径不存在");
  process.exitCode = 1;
}
