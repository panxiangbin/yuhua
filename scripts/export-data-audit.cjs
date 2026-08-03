#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "test-artifacts");
fs.mkdirSync(outputDir, { recursive: true });

function loadWindowFile(relativePath) {
  const file = path.join(root, relativePath);
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: relativePath });
  return sandbox.window;
}

function value(input) {
  return String(input == null ? "" : input).trim();
}

function csvCell(input) {
  return `"${value(input).replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

const data = loadWindowFile("assets/data.js");
const pageData = loadWindowFile("assets/pages.js");
const products = Array.isArray(data.PRODUCTS) ? data.PRODUCTS : [];
const categories = new Set((data.CATEGORIES || []).map((item) => item.key));
const pages = Array.isArray(pageData.PAGES) ? pageData.PAGES : [];

const prefixPages = [];
pages.forEach((page) => {
  (page.prefixes || []).forEach((prefix) => {
    prefixPages.push({ prefix: value(prefix).toUpperCase(), page: page.page });
  });
});
prefixPages.sort((a, b) => b.prefix.length - a.prefix.length);

function detailFor(product) {
  if (value(product.detail)) return product.detail;
  const model = value(product["型号"]).toUpperCase();
  if (!model) return "";
  const match = prefixPages.find((entry) => model.startsWith(entry.prefix));
  return match ? match.page : "";
}

const issues = [];
function addIssue(type, product, evidence, severity = "review") {
  issues.push({
    severity,
    type,
    model: value(product && product["型号"]),
    name: value(product && product["产品名称"]),
    category: value(product && (product["类别"] || product.key)),
    evidence: value(evidence)
  });
}

const modelGroups = new Map();
products.forEach((product, index) => {
  const model = value(product["型号"]);
  const name = value(product["产品名称"]);
  const key = value(product.key);

  if (!model && !name) addIssue("型号和名称同时为空", product, `原始记录序号 ${index + 1}`, "hide");
  else if (!model) addIssue("缺少型号", product, `原始记录序号 ${index + 1}`);
  else if (!name) addIssue("缺少标准产品名称", product, `型号 ${model}`);

  if (model) {
    const normalized = model.toUpperCase();
    if (!modelGroups.has(normalized)) modelGroups.set(normalized, []);
    modelGroups.get(normalized).push(product);

    if (/^(A|B|C|D|E|F)?型$/i.test(model) || /^(标准|普通|基础|数显|液晶)型$/i.test(model)) {
      addIssue("疑似不完整型号", product, `当前型号仅为“${model}”`);
    }
    if (!detailFor(product)) addIssue("未绑定专属详情页", product, "没有 detail 字段，也未匹配 pages.js 型号前缀");
  }

  if (!key || (!categories.has(key) && key !== "misc")) {
    addIssue("分类键异常", product, `key=${key || "空"}`);
  }

  const specs = product.specs || {};
  const brand = value(specs["品牌"] || product["品牌"]);
  if (brand && !/予华|yuhua/i.test(brand)) {
    addIssue("存在其他品牌字段", product, `品牌=${brand}`);
  }
});

modelGroups.forEach((group, model) => {
  if (group.length <= 1) return;
  group.forEach((product) => addIssue("重复型号", product, `${model} 共 ${group.length} 条`, "merge"));
});

const summary = {
  generatedAt: new Date().toISOString(),
  totalProducts: products.length,
  totalCategories: categories.size,
  totalPages: pages.length,
  issueRecords: issues.length,
  issueCounts: issues.reduce((counts, issue) => {
    counts[issue.type] = (counts[issue.type] || 0) + 1;
    return counts;
  }, {})
};

const headers = ["处理建议", "问题类型", "型号", "产品名称", "类别", "问题依据"];
const csvRows = [headers.map(csvCell).join(",")].concat(issues.map((issue) => [
  issue.severity,
  issue.type,
  issue.model,
  issue.name,
  issue.category,
  issue.evidence
].map(csvCell).join(",")));

fs.writeFileSync(path.join(outputDir, "data-audit-summary.json"), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(outputDir, "data-audit-items.csv"), `\uFEFF${csvRows.join("\n")}`);

console.log(JSON.stringify(summary, null, 2));
console.log(`数据审计文件已写入 ${path.relative(root, outputDir)}`);
