#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "test-artifacts");
fs.mkdirSync(outDir, { recursive: true });

function loadWindowFile(relativePath) {
  const filePath = path.join(root, relativePath);
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(filePath, "utf8"), sandbox, { filename: relativePath });
  return sandbox.window;
}

function cleanRef(value) {
  return String(value == null ? "" : value)
    .trim()
    .replace(/[?#].*$/, "")
    .replace(/^\.\//, "");
}

function isLocalFile(value) {
  const ref = String(value || "").trim();
  return Boolean(ref) &&
    !ref.startsWith("#") &&
    !ref.startsWith("data:") &&
    !ref.startsWith("javascript:") &&
    !/^[a-z]+:/i.test(ref) &&
    !ref.startsWith("//");
}

function exists(relativePath) {
  const cleaned = cleanRef(relativePath).replace(/^\/yuhua\//, "").replace(/^\//, "");
  if (!cleaned) return true;
  return fs.existsSync(path.join(root, cleaned));
}

const references = [];
function add(source, field, value, critical = false) {
  if (!isLocalFile(value)) return;
  references.push({ source, field, value: String(value).trim(), critical });
}

const htmlFiles = ["index.html", "404.html"];
const attrPattern = /\b(?:src|href|poster)\s*=\s*["']([^"']+)["']/gi;
htmlFiles.forEach((file) => {
  const content = fs.readFileSync(path.join(root, file), "utf8");
  let match;
  while ((match = attrPattern.exec(content))) {
    const value = match[1];
    const critical = file === "index.html" && /^(?:styles\.css|app\.js|assets\/site-config\.js|assets\/data\.js|assets\/videos\.js|assets\/pages\.js|assets\/specs\.js)/.test(cleanRef(value));
    add(file, "html-asset", value, critical);
  }
});

const data = loadWindowFile("assets/data.js");
(data.CATEGORIES || []).forEach((item, index) => add(`assets/data.js#category-${index + 1}`, "img", item.img));

const videos = loadWindowFile("assets/videos.js");
(videos.VIDEOS || []).forEach((item, index) => {
  add(`assets/videos.js#video-${index + 1}`, "file", item.file);
  add(`assets/videos.js#video-${index + 1}`, "poster", item.poster);
});

const pages = loadWindowFile("assets/pages.js");
(pages.PAGES || []).forEach((item, index) => add(`assets/pages.js#page-${index + 1}`, "page", item.page));

const specs = loadWindowFile("assets/specs.js");
(specs.SPECS || []).forEach((item, index) => {
  add(`assets/specs.js#spec-${index + 1}`, "page", item.page);
  add(`assets/specs.js#spec-${index + 1}`, "download", item.dl);
});

const missing = references.filter((item) => !exists(item.value));
const criticalMissing = missing.filter((item) => item.critical);
const summary = {
  generatedAt: new Date().toISOString(),
  checkedReferences: references.length,
  missingReferences: missing.length,
  criticalMissingReferences: criticalMissing.length,
  bySource: missing.reduce((result, item) => {
    const key = item.source.split("#")[0];
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {})
};

const csv = [
  ["严重级别", "来源", "字段", "引用路径"],
  ...missing.map((item) => [item.critical ? "critical" : "review", item.source, item.field, item.value])
].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

fs.writeFileSync(path.join(outDir, "static-asset-audit-summary.json"), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(outDir, "static-asset-audit-items.csv"), `\uFEFF${csv}`);

console.log(JSON.stringify(summary, null, 2));
if (criticalMissing.length) {
  console.error("关键页面资源缺失：");
  criticalMissing.forEach((item) => console.error(`- ${item.source} -> ${item.value}`));
  process.exit(1);
}
console.log("关键页面资源完整；非关键缺失项已写入人工审核报告。");
