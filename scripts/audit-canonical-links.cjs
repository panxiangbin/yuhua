#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "test-artifacts");
const siteOrigin = "https://panxiangbin.github.io";
const siteBasePath = "/yuhua/";
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

function expectedCanonical(relativePath) {
  const normalized = relativePath.split(path.sep).join("/");
  if (normalized === "index.html") return `${siteOrigin}${siteBasePath}`;
  return `${siteOrigin}${siteBasePath}${encodeURI(normalized)}`;
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

fs.mkdirSync(outputDir, { recursive: true });
const items = [];
let blockingIssues = 0;
let missing = 0;
let valid = 0;
let mismatched = 0;
let typoPages = 0;

for (const file of walk(root)) {
  const relativePath = path.relative(root, file).split(path.sep).join("/");
  const html = fs.readFileSync(file, "utf8");
  const hrefs = canonicalHrefs(html);
  const expected = expectedCanonical(relativePath);
  const isReactorTypoPage = relativePath.includes("发应釜");
  if (isReactorTypoPage) typoPages += 1;

  let severity = "ok";
  let issue = "";
  let actual = hrefs.join(" | ");

  if (hrefs.length === 0) {
    severity = "review";
    issue = "missing-canonical";
    missing += 1;
  } else if (hrefs.length > 1) {
    severity = "error";
    issue = "multiple-canonicals";
    blockingIssues += 1;
  } else {
    try {
      const url = new URL(hrefs[0]);
      if (url.origin !== siteOrigin || !url.pathname.startsWith(siteBasePath)) {
        severity = "error";
        issue = "canonical-outside-approved-site";
        blockingIssues += 1;
      } else if (hrefs[0] !== expected) {
        severity = "review";
        issue = "canonical-does-not-match-file-path";
        mismatched += 1;
      } else {
        valid += 1;
      }
    } catch {
      severity = "error";
      issue = "invalid-canonical-url";
      blockingIssues += 1;
    }
  }

  if (severity !== "ok" || isReactorTypoPage) {
    items.push({
      file: relativePath,
      severity,
      issue: issue || "reactor-typo-page-canonical-baseline",
      canonical: actual,
      expectedCanonical: expected,
      reactorTypoPage: isReactorTypoPage,
      automaticChanges: 0
    });
  }
}

const totalHtmlFiles = walk(root).length;
const report = {
  generatedAt: new Date().toISOString(),
  scope: "审计公开HTML页面 canonical 覆盖、唯一性、合法性和路径一致性；不修改页面、产品参数或联系方式",
  approvedSiteOrigin: siteOrigin,
  approvedBasePath: siteBasePath,
  summary: {
    totalHtmlFiles,
    validCanonicalFiles: valid,
    missingCanonicalFiles: missing,
    mismatchedCanonicalFiles: mismatched,
    reactorTypoPages: typoPages,
    blockingIssues,
    automaticChanges: 0
  },
  rules: [
    "每个公开HTML页面最多只能有一个 canonical",
    "canonical 必须是合法 HTTPS URL，并位于批准站点路径下",
    "缺少或路径不一致只进入人工审核清单，不自动批量写入",
    "不得借 canonical 审计修改型号、压力、温度、材质或产品分类",
    "不得保存或重新加入电话、手机号、微信号、tel:、拨号或复制号码入口"
  ],
  items
};

fs.writeFileSync(path.join(outputDir, "canonical-link-audit.json"), JSON.stringify(report, null, 2));
const headers = ["文件", "级别", "问题", "当前canonical", "建议canonical", "发应釜旧页", "自动修改"];
const rows = [headers.map(csvCell).join(",")].concat(items.map((item) => [
  item.file,
  item.severity,
  item.issue,
  item.canonical,
  item.expectedCanonical,
  item.reactorTypoPage ? "是" : "否",
  "否"
].map(csvCell).join(",")));
fs.writeFileSync(path.join(outputDir, "canonical-link-audit.csv"), `\uFEFF${rows.join("\n")}`);

console.log(JSON.stringify(report.summary, null, 2));
if (blockingIssues > 0) process.exitCode = 1;
