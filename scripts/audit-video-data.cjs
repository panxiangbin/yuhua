#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "test-artifacts");
fs.mkdirSync(outputDir, { recursive: true });

function loadWindowFile(relativePath) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), "utf8"), sandbox, {
    filename: relativePath
  });
  return sandbox.window;
}

function text(value) {
  return String(value == null ? "" : value).trim();
}

function csvCell(value) {
  return `"${text(value).replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

function normalizedPath(value) {
  return text(value).replace(/\\/g, "/").replace(/^\.\//, "");
}

function invalidBasename(file) {
  const base = path.posix.basename(normalizedPath(file));
  return !base || /^\.(?:mp4|webm|mov|m4v|jpg|jpeg|png|webp)$/i.test(base);
}

function keepCandidateScore(item) {
  const file = item.file;
  let score = 0;
  if (/^assets\/videos\//i.test(file)) score += 100;
  if (/[\u4e00-\u9fff]/.test(file)) score += 8;
  if (/^[\x00-\x7F]+$/.test(file)) score += 4;
  score -= file.split("/").length;
  score -= file.length / 1000;
  return score;
}

function chooseSuggestedKeep(group) {
  return group.slice().sort((a, b) => {
    const scoreDiff = keepCandidateScore(b) - keepCandidateScore(a);
    if (scoreDiff) return scoreDiff;
    const lengthDiff = a.file.length - b.file.length;
    if (lengthDiff) return lengthDiff;
    return a.file.localeCompare(b.file, "zh-CN");
  })[0];
}

const windowData = loadWindowFile("assets/videos.js");
const videos = Array.isArray(windowData.VIDEOS) ? windowData.VIDEOS : [];
const issues = [];
const filesByPath = new Map();
const hashes = new Map();
const duplicateGroups = [];

function addIssue(type, video, evidence, severity = "review") {
  issues.push({
    severity,
    type,
    title: text(video && video.title),
    category: text(video && (video.sub || video.key)),
    file: normalizedPath(video && video.file),
    evidence: text(evidence)
  });
}

videos.forEach((video, index) => {
  const file = normalizedPath(video.file);
  const title = text(video.title);
  const key = text(video.key);
  const sub = text(video.sub);

  if (!title) addIssue("缺少视频标题", video, `记录序号 ${index + 1}`);
  if (!file || invalidBasename(file)) {
    addIssue("无效视频文件路径", video, file || `记录序号 ${index + 1}`, "hide");
    return;
  }
  if (!/\.(mp4|webm|mov|m4v)$/i.test(file)) {
    addIssue("视频扩展名异常", video, file);
  }
  if (!key) addIssue("缺少分类键", video, `记录序号 ${index + 1}`);
  if (!sub) addIssue("缺少分类名称", video, `记录序号 ${index + 1}`);

  if (!filesByPath.has(file)) filesByPath.set(file, []);
  filesByPath.get(file).push(video);

  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) {
    addIssue("视频文件不存在", video, file, "hide");
    return;
  }

  const stat = fs.statSync(absolute);
  if (!stat.isFile()) {
    addIssue("视频路径不是文件", video, file, "hide");
    return;
  }
  if (stat.size === 0) {
    addIssue("视频文件为空", video, file, "hide");
    return;
  }
  if (stat.size < 64 * 1024) {
    addIssue("视频文件体积异常小", video, `${file} (${stat.size} bytes)`);
  }

  const hash = crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex");
  if (!hashes.has(hash)) hashes.set(hash, []);
  hashes.get(hash).push({ video, file, size: stat.size });

  const titleNorm = title.toLowerCase();
  const categoryHints = {
    rotary: ["旋转蒸发", "旋蒸"],
    glass_reactor: ["玻璃反应釜", "反应器"],
    hp_reactor: ["高压", "水热", "反应器"],
    vacuum: ["真空"],
    hilo_circ: ["高低温"],
    chiller: ["低温", "冷却"],
    hi_circ: ["高温", "水浴", "循环"],
    bath: ["恒温", "水浴", "油浴", "槽"],
    mag_stir: ["磁力", "搅拌"],
    elec_stir: ["电动搅拌", "搅拌器"],
    mol_dist: ["分子蒸馏", "短程蒸馏"]
  };
  if (categoryHints[key] && !categoryHints[key].some((hint) => titleNorm.includes(hint.toLowerCase()))) {
    addIssue("标题与分类可能不一致", video, `key=${key}; title=${title}`);
  }
});

filesByPath.forEach((group, file) => {
  if (group.length <= 1) return;
  group.forEach((video) => addIssue("重复引用同一视频路径", video, `${file} 共 ${group.length} 条`, "merge"));
});

hashes.forEach((group, hash) => {
  const uniquePaths = [...new Set(group.map((item) => item.file))];
  if (uniquePaths.length <= 1) return;

  const suggestedKeep = chooseSuggestedKeep(group);
  const groupId = `DUP-${String(duplicateGroups.length + 1).padStart(3, "0")}`;
  const totalBytes = group.reduce((sum, item) => sum + item.size, 0);
  const reclaimableBytes = totalBytes - suggestedKeep.size;

  duplicateGroups.push({
    groupId,
    sha256: hash,
    copies: uniquePaths.length,
    fileSizeBytes: suggestedKeep.size,
    reclaimableBytes,
    suggestedKeep: suggestedKeep.file,
    reason: "仅按路径稳定性、目录层级和文件名长度生成审核建议；删除前必须人工确认标题、分类和页面用途。",
    items: group.map((item) => ({
      action: item.file === suggestedKeep.file ? "建议保留" : "可考虑移除副本",
      file: item.file,
      title: text(item.video.title),
      category: text(item.video.sub || item.video.key),
      sizeBytes: item.size
    }))
  });

  group.forEach((item) => addIssue(
    "不同路径的视频内容完全重复",
    item.video,
    `${groupId}；建议保留=${suggestedKeep.file}；SHA256=${hash.slice(0, 16)}…`,
    "merge"
  ));
});

const summary = {
  generatedAt: new Date().toISOString(),
  totalRecords: videos.length,
  uniqueReferencedFiles: filesByPath.size,
  readableVideoFiles: [...hashes.values()].reduce((sum, group) => sum + group.length, 0),
  duplicateContentGroups: duplicateGroups.length,
  duplicateCopiesBeyondSuggestedKeep: duplicateGroups.reduce((sum, group) => sum + group.copies - 1, 0),
  potentialReclaimableBytes: duplicateGroups.reduce((sum, group) => sum + group.reclaimableBytes, 0),
  issueRecords: issues.length,
  issueCounts: issues.reduce((counts, issue) => {
    counts[issue.type] = (counts[issue.type] || 0) + 1;
    return counts;
  }, {})
};

const headers = ["处理建议", "问题类型", "视频标题", "分类", "文件路径", "问题依据"];
const csvRows = [headers.map(csvCell).join(",")].concat(issues.map((issue) => [
  issue.severity,
  issue.type,
  issue.title,
  issue.category,
  issue.file,
  issue.evidence
].map(csvCell).join(",")));

const duplicateHeaders = [
  "重复组", "建议动作", "视频标题", "分类", "文件路径", "文件大小Bytes",
  "建议保留路径", "可释放空间Bytes", "SHA256", "说明"
];
const duplicateCsvRows = [duplicateHeaders.map(csvCell).join(",")];
duplicateGroups.forEach((group) => {
  group.items.forEach((item) => {
    duplicateCsvRows.push([
      group.groupId,
      item.action,
      item.title,
      item.category,
      item.file,
      item.sizeBytes,
      group.suggestedKeep,
      group.reclaimableBytes,
      group.sha256,
      group.reason
    ].map(csvCell).join(","));
  });
});

fs.writeFileSync(path.join(outputDir, "video-audit-summary.json"), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(outputDir, "video-audit-items.csv"), `\uFEFF${csvRows.join("\n")}`);
fs.writeFileSync(path.join(outputDir, "video-duplicate-groups.json"), JSON.stringify(duplicateGroups, null, 2));
fs.writeFileSync(path.join(outputDir, "video-duplicate-groups.csv"), `\uFEFF${duplicateCsvRows.join("\n")}`);

console.log(JSON.stringify(summary, null, 2));
console.log("视频审计只输出报告，不修改视频标题、分类、文件路径或媒体文件。");

const blocking = issues.filter((issue) => issue.severity === "hide" && issue.type !== "无效视频文件路径");
if (blocking.length) {
  console.error(`发现 ${blocking.length} 条前台应隐藏的真实视频资源问题。`);
  process.exitCode = 1;
}
