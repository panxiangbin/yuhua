#!/usr/bin/env node
"use strict";

const fs = require("fs");
const vm = require("vm");
const path = require("path");

const root = path.resolve(__dirname, "..");

function fail(message) {
  console.error("ERROR:", message);
  process.exitCode = 1;
}

function loadDataFile(relativePath) {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) {
    fail(`${relativePath} 不存在`);
    return {};
  }
  const code = fs.readFileSync(file, "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  try {
    vm.runInContext(code, sandbox, { filename: relativePath });
  } catch (error) {
    fail(`${relativePath} 语法或执行失败：${error.message}`);
  }
  return sandbox.window;
}

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const data = loadDataFile("assets/data.js");
const specsData = loadDataFile("assets/specs.js");

[
  "searchInput", "tableBody", "mobileProductList", "selectorForm",
  "selectorResult", "specBody", "service"
].forEach((id) => {
  if (!html.includes(`id="${id}"`)) fail(`index.html 缺少 #${id}`);
});

if (app.includes("同类任意详情页") || app.includes("_keyMap")) {
  fail("app.js 仍包含按分类跳转到其他型号资料的兜底逻辑");
}

if (!css.includes(".mobile-product-list")) fail("styles.css 缺少手机产品卡片样式");
if (!Array.isArray(data.PRODUCTS) || data.PRODUCTS.length === 0) fail("PRODUCTS 未加载或为空");
if (!Array.isArray(data.CATEGORIES) || data.CATEGORIES.length === 0) fail("CATEGORIES 未加载或为空");
if (!Array.isArray(specsData.SPECS)) fail("SPECS 未正确加载");

const products = Array.isArray(data.PRODUCTS) ? data.PRODUCTS : [];
const blank = products.filter((p) => !String(p["型号"] || "").trim() && !String(p["产品名称"] || "").trim());
const models = new Map();
products.forEach((p) => {
  const model = String(p["型号"] || "").trim().toUpperCase();
  if (!model) return;
  models.set(model, (models.get(model) || 0) + 1);
});
const duplicateModels = [...models.entries()].filter(([, count]) => count > 1);

console.log(`产品总记录：${products.length}`);
console.log(`前台自动隐藏的空型号空名称记录：${blank.length}`);
console.log(`重复型号组：${duplicateModels.length}`);
console.log(`规格书记录：${Array.isArray(specsData.SPECS) ? specsData.SPECS.length : 0}`);
console.log("结构检查完成。数据质量问题作为报告输出，不阻断部署。");
