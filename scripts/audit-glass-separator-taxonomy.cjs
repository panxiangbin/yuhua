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
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), "utf8"), sandbox, {
    filename: relativePath
  });
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

const sandbox = { window: {} };
vm.createContext(sandbox);
load("assets/data.js", sandbox);
load("assets/specs.js", sandbox);

const products = Array.isArray(sandbox.window.PRODUCTS) ? sandbox.window.PRODUCTS : [];
const specs = Array.isArray(sandbox.window.SPECS) ? sandbox.window.SPECS : [];
const categories = Array.isArray(sandbox.window.CATEGORIES) ? sandbox.window.CATEGORIES : [];
const categoryNames = Object.fromEntries(categories.map((item) => [clean(item.key), clean(item.name)]));

const productsByModel = new Map();
products.forEach((product, index) => {
  const model = normalizeModel(product["型号"]);
  if (!model) return;
  if (!productsByModel.has(model)) productsByModel.set(model, []);
  productsByModel.get(model).push({
    index: index + 1,
    model: clean(product["型号"]),
    name: clean(product["产品名称"]),
    key: clean(product.key)
  });
});

const records = [];
specs.forEach((spec, index) => {
  const title = clean(spec.title);
  const model = clean(spec.model);
  const normalizedModel = normalizeModel(model);
  const page = clean(spec.page);
  const download = clean(spec.dl);
  const key = clean(spec.key);
  const isSeparator = /分液器|分液装置/.test(title);
  const hasReactorTypo = /发应釜/.test(title);

  if (!isSeparator && !hasReactorTypo) return;

  const matchedProducts = productsByModel.get(normalizedModel) || [];
  const productKeys = unique(matchedProducts.map((item) => item.key));
  const productNames = unique(matchedProducts.map((item) => item.name));
  const pageExists = Boolean(page) && fs.existsSync(path.join(root, page));
  const downloadExists = Boolean(download) && fs.existsSync(path.join(root, download));

  let issueType = "资料标题错字";
  let priority = "中";
  let decision = "人工修正资料标题后重新运行审计";
  let reason = "规格书标题出现“发应釜”，可能影响搜索、分类判断和页面一致性";

  if (isSeparator) {
    issueType = "分类体系边界待确认";
    priority = "高";
    decision = "人工决定玻璃分液器应作为独立分类、反应釜附件子类，或继续归入玻璃反应釜；确认前不得自动改分类或详情页绑定";
    reason = key === "glass_reactor"
      ? "规格书标题明确为玻璃分液器，但当前规格书分类键属于玻璃反应釜，现有分类粒度不足以形成唯一自动结论"
      : "规格书标题明确为玻璃分液器，需要人工核对当前分类键是否符合业务分类规则";
  }

  records.push({
    specIndex: index + 1,
    model,
    title,
    specKey: key,
    specCategory: categoryNames[key] || key,
    issueType,
    priority,
    decision,
    reason,
    page,
    pageExists: pageExists ? "是" : "否",
    download,
    downloadExists: downloadExists ? "是" : "否",
    matchedProductIndexes: matchedProducts.map((item) => item.index).join(" | "),
    matchedProductCategories: productKeys.map((item) => categoryNames[item] || item).join(" | "),
    matchedProductNames: productNames.join(" | ")
  });
});

const separatorRecords = records.filter((record) => record.issueType === "分类体系边界待确认");
const typoRecords = records.filter((record) => record.issueType === "资料标题错字");
const missingPages = records.filter((record) => record.page && record.pageExists === "否");
const missingDownloads = records.filter((record) => record.download && record.downloadExists === "否");

const summary = {
  generatedAt: new Date().toISOString(),
  reviewedRecords: records.length,
  glassSeparatorRecords: separatorRecords.length,
  reactorTitleTypoRecords: typoRecords.length,
  missingCandidatePages: missingPages.length,
  missingCandidateDownloads: missingDownloads.length,
  automaticDataChanges: 0,
  recommendation: "先由人工确认玻璃分液器的业务分类结构，并修正规格书标题错字；确认前只保留审核清单",
  safetyRule: "本脚本只读取产品与规格书数据并生成报告，不修改分类、型号、名称、参数、页面映射或联系方式"
};

const report = { summary, records };
const headers = [
  "规格书序号", "型号", "规格书标题", "规格书分类键", "规格书分类", "问题类型", "优先级",
  "建议处理", "判断依据", "页面", "页面存在", "下载文件", "下载存在", "匹配产品序号",
  "匹配产品分类", "匹配产品名称"
];
const csvRows = [headers.map(csvCell).join(",")].concat(records.map((record) => [
  record.specIndex, record.model, record.title, record.specKey, record.specCategory,
  record.issueType, record.priority, record.decision, record.reason, record.page,
  record.pageExists, record.download, record.downloadExists, record.matchedProductIndexes,
  record.matchedProductCategories, record.matchedProductNames
].map(csvCell).join(",")));

fs.writeFileSync(
  path.join(outputDir, "glass-separator-taxonomy-audit.json"),
  JSON.stringify(report, null, 2)
);
fs.writeFileSync(
  path.join(outputDir, "glass-separator-taxonomy-audit.csv"),
  `\uFEFF${csvRows.join("\n")}`
);

console.log(JSON.stringify(summary, null, 2));
records.forEach((record) => {
  console.log(`${record.model || "(无型号)"}: ${record.issueType} [${record.priority}] - ${record.title}`);
});

if (!separatorRecords.length) {
  console.error("ERROR: 未找到玻璃分液器分类边界记录，可能与上一轮审计基线不一致");
  process.exitCode = 1;
}
