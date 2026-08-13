#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "test-artifacts");
fs.mkdirSync(outDir, { recursive: true });

const ignoredDirs = new Set([".git", "node_modules", "test-artifacts"]);

function walk(dir, predicate, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute, predicate, result);
    else if (predicate(absolute)) result.push(absolute);
  }
  return result;
}

function loadWindowFile(relativePath) {
  const filePath = path.join(root, relativePath);
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(filePath, "utf8"), sandbox, { filename: relativePath });
  return sandbox.window;
}

function loadRuntimeVideos() {
  const sandbox = {
    window: {},
    document: {
      readyState: "loading",
      addEventListener() {},
      querySelectorAll: null,
      documentElement: null
    },
    MutationObserver: undefined,
    setTimeout() {},
    clearTimeout() {}
  };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, "assets/site-config.js"), "utf8"), sandbox, { filename: "assets/site-config.js" });
  vm.runInContext(fs.readFileSync(path.join(root, "assets/videos.js"), "utf8"), sandbox, { filename: "assets/videos.js" });
  return sandbox.window.VIDEOS || [];
}

function cleanRef(value) {
  return String(value == null ? "" : value).trim().replace(/[?#].*$/, "");
}

function isLocalFile(value) {
  const ref = String(value || "").trim();
  return Boolean(ref) &&
    !ref.startsWith("#") &&
    !ref.startsWith("data:") &&
    !ref.startsWith("javascript:") &&
    !ref.startsWith("mailto:") &&
    !ref.startsWith("tel:") &&
    !/^[a-z][a-z0-9+.-]*:/i.test(ref) &&
    !ref.startsWith("//") &&
    !/[{}<>]/.test(ref);
}

function resolveLocal(source, value) {
  const cleaned = cleanRef(value);
  if (!cleaned) return null;
  const withoutSitePrefix = cleaned.replace(/^\/yuhua\//, "/");
  if (withoutSitePrefix.startsWith("/")) return path.join(root, withoutSitePrefix.replace(/^\/+/, ""));
  if (source.endsWith(".js")) return path.resolve(root, withoutSitePrefix);
  return path.resolve(path.dirname(path.join(root, source)), withoutSitePrefix);
}

function exists(source, value) {
  const absolute = resolveLocal(source, value);
  if (!absolute) return true;
  const relative = path.relative(root, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return false;
  return fs.existsSync(absolute);
}

const references = [];
function add(source, field, value, critical = false) {
  if (!isLocalFile(value)) return;
  references.push({ source, field, value: String(value).trim(), critical });
}

const htmlFiles = walk(root, (file) => file.toLowerCase().endsWith(".html"))
  .map((file) => path.relative(root, file).split(path.sep).join("/"))
  .sort();
const attrPattern = /\b(src|href|poster)\s*=\s*["']([^"']+)["']/gi;
htmlFiles.forEach((file) => {
  const content = fs.readFileSync(path.join(root, file), "utf8");
  let match;
  while ((match = attrPattern.exec(content))) {
    const field = match[1].toLowerCase();
    const value = match[2];
    const cleaned = cleanRef(value).replace(/^\.\//, "");
    const critical = file === "index.html" && /^(?:styles\.css|app\.js|assets\/site-config\.js|assets\/data\.js|assets\/videos\.js|assets\/pages\.js|assets\/specs\.js)/.test(cleaned);
    add(file, `html-${field}`, value, critical);
  }
});

const data = loadWindowFile("assets/data.js");
(data.CATEGORIES || []).forEach((item, index) => add("assets/data.js", `category-${index + 1}-img`, item.img));

const videos = loadRuntimeVideos();
videos.forEach((item, index) => {
  add("assets/videos.js", `video-${index + 1}-file`, item.file);
  add("assets/videos.js", `video-${index + 1}-poster`, item.poster);
});

const pages = loadWindowFile("assets/pages.js");
(pages.PAGES || []).forEach((item, index) => add("assets/pages.js", `page-${index + 1}`, item.page));

const specs = loadWindowFile("assets/specs.js");
(specs.SPECS || []).forEach((item, index) => {
  add("assets/specs.js", `spec-${index + 1}-page`, item.page);
  add("assets/specs.js", `spec-${index + 1}-download`, item.dl);
});

const unique = Array.from(new Map(references.map((item) => [`${item.source}\0${item.field}\0${item.value}`, item])).values());
const missing = unique.filter((item) => !exists(item.source, item.value));
const criticalMissing = missing.filter((item) => item.critical);
const htmlMissing = missing.filter((item) => item.field.startsWith("html-"));
const summary = {
  generatedAt: new Date().toISOString(),
  scannedHtmlFiles: htmlFiles.length,
  checkedReferences: unique.length,
  missingReferences: missing.length,
  missingHtmlReferences: htmlMissing.length,
  criticalMissingReferences: criticalMissing.length,
  runtimeVideoPosterFallbacksApplied: true,
  enforcement: {
    criticalMissingFailsCi: true,
    nonCriticalMissingRequiresReview: true
  },
  bySource: missing.reduce((result, item) => {
    result[item.source] = (result[item.source] || 0) + 1;
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
console.log(`已扫描 ${htmlFiles.length} 个 HTML 页面；关键资源完整，其他缺失引用已进入人工审核报告。`);
