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

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function textSupportsCategory(value, key) {
  const text = clean(value).toLowerCase();
  const rules = {
    mag_stir: ["磁力搅拌", "搅拌器", "恒温搅拌"],
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
    title: clean(spec.title),
    key: clean(spec.key),
    page: clean(spec.page),
    dl: clean(spec.dl)
  });
});

const records = [];
products.forEach((product, productIndex) => {
  const model = clean(product["型号"]);
  const normalizedModel = normalizeModel(model);
  const currentKey = clean(product.key);
  if (!normalizedModel || currentKey !== "misc") return;

  const candidates = (specsByModel.get(normalizedModel) || []).filter((entry) => entry.key && entry.key !== currentKey);
  if (!candidates.length) return;

  const candidateKeys = unique(candidates.map((entry) => entry.key));
  const pages = unique(candidates.map((entry) => entry.page));
  const downloads = unique(candidates.map((entry) => entry.dl));
  const targetKey = candidateKeys.length === 1 ? candidateKeys[0] : "";
  if (!targetKey) return;

  const pageExists = pages.length === 1 && fs.existsSync(path.join(root, pages[0]));
  const downloadExists = downloads.length === 1 && fs.existsSync(path.join(root, downloads[0]));
  const titleEvidence = candidates.some((entry) => textSupportsCategory(entry.title, targetKey));
  const productName = clean(product["产品名称"]);
  const productNameSupportsTarget = textSupportsCategory(productName, targetKey);

  let medium = false;
  if (pages.length === 1 && pageExists && !(productName === "" && titleEvidence)) medium = true;
  if (titleEvidence && !pageExists && downloadExists) medium = true;
  if (!medium) return;

  let queue = "人工分类决策";
  let priority = "中";
  let recommendedNextStep = "核对产品归属后再决定是否修改分类或绑定详情页";
  let reason = "精确型号只命中一个候选分类，但现有证据不足以自动修改产品记录";

  if (pageExists && titleEvidence && productNameSupportsTarget) {
    queue = "分类与名称一致性复核";
    priority = "高";
    recommendedNextStep = "人工确认该记录是否误归入其他设备；确认后可修正分类并绑定现有页面";
    reason = "候选页面存在，规格书标题和产品名称均支持同一候选分类";
  } else if (pageExists && titleEvidence) {
    queue = "现有页面分类复核";
    priority = "高";
    recommendedNextStep = "查看现有页面与产品实物资料，确认分类后再绑定";
    reason = "候选页面存在且规格书标题支持候选分类，但产品名称为空或不足以独立确认";
  } else if (pageExists) {
    queue = "页面存在但分类证据不足";
    priority = "中";
    recommendedNextStep = "人工查看候选页面正文，确认其是否确属当前型号";
    reason = "精确型号对应唯一现有页面，但标题和产品名称未形成一致分类证据";
  } else if (downloadExists && titleEvidence) {
    queue = "下载资料存在、在线页面缺失";
    priority = "中";
    recommendedNextStep = "先人工核对下载资料；确认归属后补建在线详情页";
    reason = "下载资料真实存在且标题支持候选分类，但在线页面路径缺失";
  }

  records.push({
    productIndex: productIndex + 1,
    model,
    productName,
    currentCategory: categoryNames[currentKey] || currentKey,
    candidateKey: targetKey,
    candidateCategory: categoryNames[targetKey] || targetKey,
    queue,
    priority,
    recommendedNextStep,
    reason,
    specRecords: candidates.map((entry) => `#${entry.index} ${entry.title}`).join(" | "),
    pages: pages.join(" | "),
    downloads: downloads.join(" | "),
    pageExists: pageExists ? "是" : "否",
    downloadExists: downloadExists ? "是" : "否",
    titleEvidence: titleEvidence ? "是" : "否",
    productNameSupportsTarget: productNameSupportsTarget ? "是" : "否"
  });
});

const queueCounts = records.reduce((counts, record) => {
  counts[record.queue] = (counts[record.queue] || 0) + 1;
  return counts;
}, {});

const summary = {
  generatedAt: new Date().toISOString(),
  mediumConfidenceRecords: records.length,
  highPriorityReview: records.filter((record) => record.priority === "高").length,
  mediumPriorityReview: records.filter((record) => record.priority === "中").length,
  queueCounts,
  safetyRule: "仅生成审核队列和下一步建议；不修改产品分类、名称、参数或详情页绑定"
};

const report = { summary, records };
const headers = [
  "产品记录序号", "型号", "产品名称", "当前分类", "候选分类键", "候选分类",
  "审核队列", "优先级", "建议下一步", "判断依据", "规格书记录", "候选页面",
  "下载文件", "页面存在", "下载文件存在", "标题支持分类", "产品名称支持分类"
];
const csvRows = [headers.map(csvCell).join(",")].concat(records.map((record) => [
  record.productIndex, record.model, record.productName, record.currentCategory,
  record.candidateKey, record.candidateCategory, record.queue, record.priority,
  record.recommendedNextStep, record.reason, record.specRecords, record.pages,
  record.downloads, record.pageExists, record.downloadExists, record.titleEvidence,
  record.productNameSupportsTarget
].map(csvCell).join(",")));

fs.writeFileSync(path.join(outputDir, "medium-cross-category-detail-triage.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(outputDir, "medium-cross-category-detail-triage.csv"), `\uFEFF${csvRows.join("\n")}`);

console.log(JSON.stringify(summary, null, 2));
records.forEach((record) => {
  console.log(`${record.model}: ${record.queue} [${record.priority}] -> ${record.candidateCategory}`);
});

if (!records.length) {
  console.error("ERROR: 未找到中等置信度跨分类详情记录，可能与上游审计基线不一致");
  process.exitCode = 1;
}
