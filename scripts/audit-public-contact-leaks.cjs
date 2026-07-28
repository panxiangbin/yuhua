#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "test-artifacts");
fs.mkdirSync(outputDir, { recursive: true });

const allowedExtensions = new Set([".html", ".htm", ".js", ".json", ".xml", ".css", ".txt", ".md"]);
const excludedDirectories = new Set([".git", ".github", "node_modules", "scripts", "test-artifacts"]);
const excludedFiles = new Set(["OPTIMIZATION_LOG.md"]);

function walk(directory, results = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath, results);
    else if (entry.isFile()) {
      const relative = path.relative(root, fullPath).replace(/\\/g, "/");
      if (excludedFiles.has(relative)) continue;
      if (allowedExtensions.has(path.extname(entry.name).toLowerCase())) results.push(relative);
    }
  }
  return results;
}

function maskMobile(number) {
  return `${number.slice(0, 3)}****${number.slice(-4)}`;
}

function csvCell(value) {
  return `"${String(value == null ? "" : value).replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

const findings = [];
const files = walk(root);
const mobilePattern = /(^|\D)(1[3-9]\d{9})(?!\d)/g;
const telLinkPattern = /(?:href\s*=\s*["']tel:|\btel:\s*)/ig;
const visibleContactPattern = />\s*(?:电话咨询|联系电话|手机号|手机号码|微信同号|添加微信|复制号码)\s*</ig;

for (const relativePath of files) {
  let content;
  try {
    content = fs.readFileSync(path.join(root, relativePath), "utf8");
  } catch {
    continue;
  }
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    const mobiles = [...line.matchAll(mobilePattern)].map((match) => match[2]);
    for (const mobile of new Set(mobiles)) {
      findings.push({
        file: relativePath,
        line: index + 1,
        type: "大陆手机号字面值",
        evidence: maskMobile(mobile),
        action: "待移除或改为不公开的内部资料"
      });
    }
    if (telLinkPattern.test(line)) {
      findings.push({
        file: relativePath,
        line: index + 1,
        type: "拨号链接",
        evidence: "tel: 链接",
        action: "移除拨号入口"
      });
    }
    telLinkPattern.lastIndex = 0;
    if (visibleContactPattern.test(line)) {
      findings.push({
        file: relativePath,
        line: index + 1,
        type: "直接联系方式文案",
        evidence: "电话/微信/号码相关可见文案",
        action: "改为产品查询或选型服务入口"
      });
    }
    visibleContactPattern.lastIndex = 0;
  });
}

const summary = {
  generatedAt: new Date().toISOString(),
  scannedFiles: files.length,
  findingCount: findings.length,
  affectedFiles: new Set(findings.map((item) => item.file)).size,
  countsByType: findings.reduce((counts, item) => {
    counts[item.type] = (counts[item.type] || 0) + 1;
    return counts;
  }, {})
};

const csv = [
  ["文件", "行号", "问题类型", "脱敏依据", "建议处理"].map(csvCell).join(","),
  ...findings.map((item) => [item.file, item.line, item.type, item.evidence, item.action].map(csvCell).join(","))
].join("\n");

fs.writeFileSync(path.join(outputDir, "public-contact-audit-summary.json"), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(outputDir, "public-contact-audit-items.csv"), `\uFEFF${csv}`);

console.log(JSON.stringify(summary, null, 2));
if (findings.length) {
  console.log("发现历史公开文件可能仍含直接联系方式，已生成脱敏审计清单；本步骤只审计，不自动改写产品资料。");
} else {
  console.log("公开文本文件未发现手机号、拨号链接或直接联系方式文案。");
}
