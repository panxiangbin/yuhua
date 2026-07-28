#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "test-artifacts");
fs.mkdirSync(outputDir, { recursive: true });

function load(relativePath, sandbox) {
  const file = path.join(root, relativePath);
  vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: relativePath });
}

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

const sandbox = { window: {} };
vm.createContext(sandbox);
load("assets/data.js", sandbox);
load("assets/pages.js", sandbox);
load("assets/specs.js", sandbox);

const products = Array.isArray(sandbox.window.PRODUCTS) ? sandbox.window.PRODUCTS : [];
const pages = Array.isArray(sandbox.window.PAGES) ? sandbox.window.PAGES : [];
const specs = Array.isArray(sandbox.window.SPECS) ? sandbox.window.SPECS : [];

const prefixPages = [];
pages.forEach((page) => {
  (page.prefixes || []).forEach((prefix) => {
    prefixPages.push({
      prefix: clean(prefix).toUpperCase(),
      page: clean(page.page),
      key: clean(page.key)
    });
  });
});
prefixPages.sort((a, b) => b.prefix.length - a.prefix.length);

function prefixDetail(product) {
  const explicit = clean(product.detail);
  if (explicit) return { page: explicit, source: "explicit" };
  const model = clean(product["型号"]).toUpperCase();
  if (!model) return { page: "", source: "none" };
  const match = prefixPages.find((entry) => model.startsWith(entry.prefix));
  return match ? { page: match.page, source: "prefix" } : { page: "", source: "none" };
}

const before = new Map();
products.forEach((product, index) => before.set(index, prefixDetail(product)));

load("assets/detail-resolver.js", sandbox);

const rows = products.map((product, index) => {
  const oldDetail = before.get(index);
  const exactDetail = clean(product.detail);
  const resolvedByExactSpec = product.detailSource === "exact-spec-model";
  const finalPage = exactDetail || oldDetail.page;
  const source = resolvedByExactSpec ? "exact-spec-model" : oldDetail.source;
  return {
    index: index + 1,
    model: clean(product["型号"]),
    normalizedModel: normalizeModel(product["型号"]),
    name: clean(product["产品名称"]),
    key: clean(product.key),
    source,
    page: finalPage,
    newlyResolved: resolvedByExactSpec && !oldDetail.page
  };
});

const newlyResolved = rows.filter((row) => row.newlyResolved);
const unresolved = rows.filter((row) => !row.page && (row.model || row.name));
const missingMappedPages = rows.filter((row) => row.page && !fs.existsSync(path.join(root, row.page)));

const exactSpecModels = new Map();
specs.forEach((spec) => {
  const model = normalizeModel(spec.model);
  const key = clean(spec.key);
  const page = clean(spec.page);
  if (!model || !key || !page) return;
  const groupKey = `${key}::${model}`;
  if (!exactSpecModels.has(groupKey)) exactSpecModels.set(groupKey, new Set());
  exactSpecModels.get(groupKey).add(page);
});

const ambiguousExactMatches = rows.filter((row) => {
  if (row.page || !row.normalizedModel || !row.key) return false;
  const candidates = exactSpecModels.get(`${row.key}::${row.normalizedModel}`);
  return candidates && candidates.size > 1;
}).map((row) => ({
  ...row,
  candidatePages: Array.from(exactSpecModels.get(`${row.key}::${row.normalizedModel}`) || [])
}));

const summary = {
  generatedAt: new Date().toISOString(),
  totalProducts: products.length,
  productsWithExistingDetail: rows.filter((row) => row.page && !row.newlyResolved).length,
  newlyResolvedByExactUniqueSpec: newlyResolved.length,
  unresolvedDisplayableProducts: unresolved.length,
  ambiguousExactModelGroups: ambiguousExactMatches.length,
  missingMappedPages: missingMappedPages.length,
  safetyRule: "仅精确型号、分类一致、唯一规格书页面时建议绑定"
};

const report = {
  summary,
  newlyResolved,
  ambiguousExactMatches,
  unresolved
};

const headers = ["状态", "记录序号", "型号", "产品名称", "分类", "证据来源", "建议页面", "候选页面"];
const csvRows = [headers.map(csvCell).join(",")];
newlyResolved.forEach((row) => csvRows.push([
  "可安全绑定", row.index, row.model, row.name, row.key, row.source, row.page, ""
].map(csvCell).join(",")));
ambiguousExactMatches.forEach((row) => csvRows.push([
  "存在多个同型号规格书，需人工选择", row.index, row.model, row.name, row.key,
  "exact-model-ambiguous", "", row.candidatePages.join(" | ")
].map(csvCell).join(",")));
unresolved.forEach((row) => csvRows.push([
  "未找到安全映射", row.index, row.model, row.name, row.key, "none", "", ""
].map(csvCell).join(",")));

fs.writeFileSync(path.join(outputDir, "detail-page-coverage.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(outputDir, "detail-page-coverage.csv"), `\uFEFF${csvRows.join("\n")}`);

console.log(JSON.stringify(summary, null, 2));

if (missingMappedPages.length) {
  console.error("ERROR: 发现自动或既有映射指向不存在的页面：");
  missingMappedPages.slice(0, 20).forEach((row) => console.error(`- ${row.model || row.name}: ${row.page}`));
  process.exitCode = 1;
}
