#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "test-artifacts");
const ignoredDirs = new Set([".git", "node_modules", "test-artifacts"]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) files.push(full);
  }
  return files;
}

function canonicalHrefs(html) {
  const links = html.match(/<link\b[^>]*>/gi) || [];
  return links
    .filter((tag) => /\brel\s*=\s*(["'])canonical\1/i.test(tag))
    .map((tag) => (tag.match(/\bhref\s*=\s*(["'])(.*?)\1/i) || [])[2] || "")
    .map((value) => value.trim());
}

function metaRobots(html) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const tag = tags.find((item) => /\bname\s*=\s*(["'])robots\1/i.test(item));
  return tag ? ((tag.match(/\bcontent\s*=\s*(["'])(.*?)\1/i) || [])[2] || "").toLowerCase() : "";
}

function classify(relativePath, html) {
  const normalized = relativePath.replace(/\\/g, "/");
  const lower = normalized.toLowerCase();
  const title = ((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").replace(/<[^>]+>/g, " ").trim();
  const robots = metaRobots(html);
  const isNoindex = /(?:^|\s|,)noindex(?:\s|,|$)/i.test(robots);
  const isReactorTypoPage = normalized.includes("发应釜");

  if (lower === "404.html" || /(?:^|\/)404\.html$/.test(lower)) {
    return { pageType: "error-page", indexPolicy: "noindex-review", reason: "404错误页不应设置自指 canonical，应确认 noindex" };
  }
  if (isReactorTypoPage) {
    return { pageType: "legacy-compatibility-candidate", indexPolicy: "canonical-to-corrected-url-after-review", reason: "旧错字路径需结合兼容方案指向修正后页面" };
  }
  if (lower.startsWith("specs/") || lower.includes("/specs/")) {
    return { pageType: "product-specification", indexPolicy: "self-canonical-candidate", reason: "正式产品规格书页，文件路径通常可唯一确定规范网址" };
  }
  if (lower.startsWith("tools/") || lower.includes("/tools/") || /工具|计算器|选型/.test(title)) {
    return { pageType: "tool-page", indexPolicy: "self-canonical-candidate", reason: "工具页通常应使用唯一自指 canonical" };
  }
  if (lower.startsWith("courses/") || lower.includes("/courses/") || /课程|教程|教学/.test(title)) {
    return { pageType: "course-or-tutorial", indexPolicy: "self-canonical-candidate", reason: "课程或教程页通常可使用自指 canonical" };
  }
  if (isNoindex) {
    return { pageType: "noindex-page", indexPolicy: "manual-review", reason: "页面已声明 noindex，canonical 策略需结合页面用途人工确认" };
  }
  if (lower === "index.html") {
    return { pageType: "site-home", indexPolicy: "self-canonical-candidate", reason: "站点首页应保留唯一规范地址" };
  }
  return { pageType: "other-public-html", indexPolicy: "manual-review", reason: "无法仅凭路径和标题安全判断页面用途" };
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

fs.mkdirSync(outputDir, { recursive: true });
const files = walk(root);
const items = [];
const groups = {};
let missingCanonical = 0;
let existingCanonical = 0;
let selfCanonicalCandidates = 0;
let manualReview = 0;
let legacyCompatibilityCandidates = 0;
let blockingIssues = 0;

for (const file of files) {
  const relativePath = path.relative(root, file).replace(/\\/g, "/");
  const html = fs.readFileSync(file, "utf8");
  const hrefs = canonicalHrefs(html);
  const classification = classify(relativePath, html);

  if (hrefs.length === 0) missingCanonical += 1;
  else existingCanonical += 1;
  if (hrefs.length > 1) blockingIssues += 1;
  if (classification.indexPolicy === "self-canonical-candidate") selfCanonicalCandidates += 1;
  if (classification.indexPolicy === "manual-review" || classification.indexPolicy === "noindex-review") manualReview += 1;
  if (classification.pageType === "legacy-compatibility-candidate") legacyCompatibilityCandidates += 1;

  groups[classification.pageType] = groups[classification.pageType] || {
    pageType: classification.pageType,
    total: 0,
    missingCanonical: 0,
    existingCanonical: 0,
    recommendedPolicy: classification.indexPolicy
  };
  groups[classification.pageType].total += 1;
  groups[classification.pageType][hrefs.length === 0 ? "missingCanonical" : "existingCanonical"] += 1;

  items.push({
    file: relativePath,
    pageType: classification.pageType,
    canonicalStatus: hrefs.length === 0 ? "missing" : hrefs.length === 1 ? "present" : "multiple",
    currentCanonical: hrefs.join(" | "),
    recommendedPolicy: classification.indexPolicy,
    reason: classification.reason,
    automaticChanges: 0
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  scope: "按页面类型分组 canonical 缺口，识别可安全生成计划的页面与必须人工审核的页面；不修改任何HTML、产品参数或联系方式",
  summary: {
    totalHtmlFiles: files.length,
    missingCanonicalFiles: missingCanonical,
    existingCanonicalFiles: existingCanonical,
    selfCanonicalCandidates,
    legacyCompatibilityCandidates,
    manualReviewFiles: manualReview,
    blockingIssues,
    automaticChanges: 0
  },
  safetyRules: [
    "本报告只分类和生成审核证据，不自动写入 canonical",
    "旧错字路径不得简单设置自指 canonical，必须结合兼容或重定向方案",
    "404及其他错误页需优先确认 noindex，不能当作普通内容页处理",
    "不得修改型号、压力、温度、材质、分类或其他产品关键数据",
    "不得保存、展示或重新加入电话、手机号、微信号、tel:、拨号或复制号码入口"
  ],
  groups: Object.values(groups).sort((a, b) => b.total - a.total),
  items
};

fs.writeFileSync(path.join(outputDir, "canonical-page-type-classification.json"), JSON.stringify(report, null, 2));
const headers = ["文件", "页面类型", "canonical状态", "当前canonical", "建议策略", "原因", "自动修改"];
const rows = [headers.map(csvCell).join(",")].concat(items.map((item) => [
  item.file,
  item.pageType,
  item.canonicalStatus,
  item.currentCanonical,
  item.recommendedPolicy,
  item.reason,
  "否"
].map(csvCell).join(",")));
fs.writeFileSync(path.join(outputDir, "canonical-page-type-classification.csv"), `\uFEFF${rows.join("\n")}`);

console.log(JSON.stringify(report.summary, null, 2));
if (blockingIssues > 0) process.exitCode = 1;
