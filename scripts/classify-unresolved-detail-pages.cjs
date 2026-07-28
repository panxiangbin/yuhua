#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "test-artifacts");
fs.mkdirSync(outputDir, { recursive: true });

function load(relativePath, sandbox) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), "utf8"), sandbox, { filename: relativePath });
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

function normalizeText(value) {
  let text = clean(value);
  if (text.normalize) text = text.normalize("NFKC");
  return text.toUpperCase().replace(/[\s＿_—–−-]+/g, "").replace(/[（）()【】\[\]]/g, "");
}

function csvCell(value) {
  return `"${clean(value).replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

function isIncompleteModel(model) {
  const value = clean(model);
  if (!value) return false;
  return /^(?:[A-Z]?型|标准型|普通型|基础型|数显型|液晶型)$/i.test(value) ||
    /^[A-Z]$/i.test(value) ||
    /^(?:\d+(?:\.\d+)?\s*(?:ML|L)|[A-Z]{1,3})$/i.test(value);
}

const sandbox = { window: {} };
vm.createContext(sandbox);
load("assets/data.js", sandbox);
load("assets/pages.js", sandbox);
load("assets/specs.js", sandbox);

const products = Array.isArray(sandbox.window.PRODUCTS) ? sandbox.window.PRODUCTS : [];
const pages = Array.isArray(sandbox.window.PAGES) ? sandbox.window.PAGES : [];
const specs = Array.isArray(sandbox.window.SPECS) ? sandbox.window.SPECS : [];

const prefixEntries = [];
pages.forEach((page) => {
  (page.prefixes || []).forEach((prefix) => prefixEntries.push({
    prefix: clean(prefix).toUpperCase(),
    key: clean(page.key),
    page: clean(page.page)
  }));
});
prefixEntries.sort((a, b) => b.prefix.length - a.prefix.length);

function existingDetail(product) {
  if (clean(product.detail)) return clean(product.detail);
  const model = clean(product["型号"]).toUpperCase();
  if (!model) return "";
  const match = prefixEntries.find((entry) => model.startsWith(entry.prefix));
  return match ? match.page : "";
}

const specByModel = new Map();
const specByKeyModel = new Map();
const specByTitle = new Map();

specs.forEach((spec, index) => {
  const entry = {
    index: index + 1,
    model: clean(spec.model),
    normalizedModel: normalizeModel(spec.model),
    title: clean(spec.title),
    normalizedTitle: normalizeText(spec.title),
    key: clean(spec.key),
    page: clean(spec.page),
    dl: clean(spec.dl)
  };
  if (entry.normalizedModel) {
    if (!specByModel.has(entry.normalizedModel)) specByModel.set(entry.normalizedModel, []);
    specByModel.get(entry.normalizedModel).push(entry);
    const groupKey = `${entry.key}::${entry.normalizedModel}`;
    if (!specByKeyModel.has(groupKey)) specByKeyModel.set(groupKey, []);
    specByKeyModel.get(groupKey).push(entry);
  }
  if (entry.normalizedTitle) {
    if (!specByTitle.has(entry.normalizedTitle)) specByTitle.set(entry.normalizedTitle, []);
    specByTitle.get(entry.normalizedTitle).push(entry);
  }
});

// 使用与前台相同的安全解析器，确保本报告只分析真正仍未绑定的记录。
load("assets/detail-resolver.js", sandbox);

const unresolved = products.map((product, index) => ({ product, index: index + 1 }))
  .filter(({ product }) => !existingDetail(product) && !clean(product.detail) && (clean(product["型号"]) || clean(product["产品名称"])));

function uniquePages(entries) {
  return Array.from(new Set((entries || []).map((entry) => entry.page).filter(Boolean)));
}

function classify(item) {
  const product = item.product;
  const model = clean(product["型号"]);
  const normalizedModel = normalizeModel(model);
  const name = clean(product["产品名称"]);
  const normalizedName = normalizeText(name);
  const key = clean(product.key);
  const sameKeyModel = normalizedModel ? (specByKeyModel.get(`${key}::${normalizedModel}`) || []) : [];
  const anyKeyModel = normalizedModel ? (specByModel.get(normalizedModel) || []) : [];
  const sameTitle = normalizedName ? (specByTitle.get(normalizedName) || []) : [];
  const sameKeyPages = uniquePages(sameKeyModel);
  const anyKeyPages = uniquePages(anyKeyModel);
  const titlePages = uniquePages(sameTitle);

  let reasonCode = "NO_INDEPENDENT_EVIDENCE";
  let priority = "人工补资料";
  let reason = "未找到可用于安全绑定的精确型号或独立页面证据";
  let evidence = "";
  let candidatePages = [];

  if (!model) {
    reasonCode = "MISSING_MODEL";
    reason = "缺少型号，不能使用产品名称猜测详情页";
    evidence = name ? `仅有产品名称：${name}` : "型号和名称均为空";
  } else if (isIncompleteModel(model)) {
    reasonCode = "INCOMPLETE_MODEL";
    reason = "型号疑似不完整或仅为规格/类型描述";
    evidence = `当前型号：${model}`;
  } else if (sameKeyModel.length && !sameKeyPages.length) {
    reasonCode = "EXACT_SPEC_WITHOUT_PAGE";
    priority = "可补页面后复核";
    reason = "同分类存在精确型号规格书记录，但规格书未提供在线页面";
    evidence = sameKeyModel.map((entry) => `规格书#${entry.index}:${entry.title || entry.model}${entry.dl ? `（有下载文件）` : ""}`).join(" | ");
  } else if (sameKeyPages.length > 1) {
    reasonCode = "AMBIGUOUS_EXACT_PAGES";
    priority = "人工选择页面";
    reason = "同分类精确型号对应多个不同页面，不能自动选择";
    candidatePages = sameKeyPages;
    evidence = sameKeyModel.map((entry) => `规格书#${entry.index}:${entry.page}`).join(" | ");
  } else if (anyKeyModel.length && !sameKeyModel.length) {
    reasonCode = "MODEL_EXISTS_OTHER_CATEGORY";
    priority = "核对分类";
    reason = "精确型号仅出现在其他产品分类，不能跨分类自动绑定";
    candidatePages = anyKeyPages;
    evidence = anyKeyModel.map((entry) => `${entry.key}:${entry.page || entry.dl || entry.title}`).join(" | ");
  } else if (sameTitle.length) {
    reasonCode = "TITLE_ONLY_WEAK_EVIDENCE";
    priority = "人工核对名称";
    reason = "仅产品名称与规格书标题一致，缺少精确型号证据";
    candidatePages = titlePages;
    evidence = sameTitle.map((entry) => `${entry.key}:${entry.model || "无型号"}:${entry.page || entry.dl || "无文件"}`).join(" | ");
  }

  return {
    index: item.index,
    model,
    name,
    key,
    reasonCode,
    priority,
    reason,
    evidence,
    candidatePages
  };
}

const classified = unresolved.map(classify);
const counts = classified.reduce((result, row) => {
  result[row.reasonCode] = (result[row.reasonCode] || 0) + 1;
  return result;
}, {});

const summary = {
  generatedAt: new Date().toISOString(),
  unresolvedRecords: unresolved.length,
  classifiedRecords: classified.length,
  reasonCounts: counts,
  safetyRule: "只分类证据缺口，不根据相似名称、近似型号或跨分类记录自动绑定"
};

const report = { summary, records: classified };
const headers = ["记录序号", "型号", "产品名称", "分类", "原因代码", "处理优先级", "未绑定原因", "证据", "候选页面"];
const csvRows = [headers.map(csvCell).join(",")].concat(classified.map((row) => [
  row.index, row.model, row.name, row.key, row.reasonCode, row.priority, row.reason,
  row.evidence, row.candidatePages.join(" | ")
].map(csvCell).join(",")));

fs.writeFileSync(path.join(outputDir, "unresolved-detail-classification.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(outputDir, "unresolved-detail-classification.csv"), `\uFEFF${csvRows.join("\n")}`);

console.log(JSON.stringify(summary, null, 2));

if (classified.length !== unresolved.length) {
  console.error("ERROR: 未绑定详情页记录未被完整分类");
  process.exitCode = 1;
}
