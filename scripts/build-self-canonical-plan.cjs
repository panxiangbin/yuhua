#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const artifactsDir = path.join(root, "test-artifacts");
const classificationPath = path.join(artifactsDir, "canonical-page-type-classification.json");
const siteConfigPath = path.join(root, "assets", "site-config.js");

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

function readOfficialSite() {
  const source = fs.readFileSync(siteConfigPath, "utf8");
  const match = source.match(/\bofficialSite\s*:\s*(["'])(https:\/\/[^"']+)\1/);
  if (!match) throw new Error("无法从 assets/site-config.js 读取 HTTPS officialSite");
  const url = new URL(match[2]);
  url.hash = "";
  url.search = "";
  if (url.protocol !== "https:") throw new Error("officialSite 必须使用 HTTPS");
  return url;
}

function canonicalForFile(baseUrl, file) {
  const normalized = String(file || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) throw new Error(`非法页面路径: ${file}`);
  if (normalized === "index.html") return new URL("/", baseUrl).href;
  const publicPath = normalized.endsWith("/index.html")
    ? normalized.slice(0, -"index.html".length)
    : normalized;
  return new URL(`/${publicPath.split("/").map(encodeURIComponent).join("/")}`, baseUrl).href;
}

if (!fs.existsSync(classificationPath)) {
  throw new Error("缺少 canonical-page-type-classification.json，请先运行 classify-canonical-page-types.cjs");
}

const classification = JSON.parse(fs.readFileSync(classificationPath, "utf8"));
const baseUrl = readOfficialSite();
const candidates = [];
const blocked = [];
const targetOwners = new Map();
let blockingIssues = 0;

for (const item of classification.items || []) {
  if (item.recommendedPolicy !== "self-canonical-candidate" || item.canonicalStatus !== "missing") continue;

  const file = String(item.file || "");
  const lower = file.toLowerCase();
  const reasons = [];

  if (file.includes("发应釜")) reasons.push("旧错字路径必须走兼容方案，禁止自指 canonical");
  if (lower === "404.html" || /(?:^|\/)404\.html$/.test(lower)) reasons.push("错误页禁止进入自指 canonical 计划");
  if (item.pageType === "noindex-page" || item.pageType === "error-page") reasons.push("noindex 或错误页需人工审核");

  let targetCanonical = "";
  try {
    targetCanonical = canonicalForFile(baseUrl, file);
    const targetUrl = new URL(targetCanonical);
    if (targetUrl.origin !== baseUrl.origin) reasons.push("canonical 目标越出官方站点域名");
  } catch (error) {
    reasons.push(error.message);
  }

  const record = {
    file,
    pageType: item.pageType,
    targetCanonical,
    action: reasons.length ? "人工审核" : "可进入原子实施候选",
    reasons: reasons.join("；"),
    automaticChanges: 0
  };

  if (reasons.length) {
    blocked.push(record);
    continue;
  }

  const owners = targetOwners.get(targetCanonical) || [];
  owners.push(file);
  targetOwners.set(targetCanonical, owners);
  candidates.push(record);
}

for (const record of candidates) {
  const owners = targetOwners.get(record.targetCanonical) || [];
  if (owners.length > 1) {
    record.action = "人工审核";
    record.reasons = `多个页面会生成同一 canonical：${owners.join(" | ")}`;
    blockingIssues += 1;
  }
}

const ready = candidates.filter((item) => item.action === "可进入原子实施候选");
const collisionReview = candidates.filter((item) => item.action === "人工审核");
const allItems = ready.concat(collisionReview, blocked).sort((a, b) => a.file.localeCompare(b.file, "zh-CN"));

const report = {
  generatedAt: new Date().toISOString(),
  scope: "仅为缺少 canonical 且已被分类为安全候选的页面生成精确目标网址；不写入 HTML，不修改产品数据",
  officialSite: baseUrl.href,
  summary: {
    classificationItems: Array.isArray(classification.items) ? classification.items.length : 0,
    missingSelfCanonicalCandidates: candidates.length + blocked.length,
    readyForAtomicImplementationReview: ready.length,
    collisionReviewFiles: collisionReview.length,
    policyBlockedFiles: blocked.length,
    blockingIssues,
    automaticChanges: 0
  },
  implementationRules: [
    "实施时每页只能存在一个 canonical，并放在 head 内",
    "canonical 必须使用 assets/site-config.js 中已确认的 HTTPS 官方域名",
    "中文路径必须按 URL 标准编码，不能手工猜测域名或路径",
    "旧错字路径、404、noindex 页面不得进入自指 canonical 批量写入",
    "HTML 写入、链接审计、桌面与手机浏览器测试必须在同一原子提交完成",
    "不得修改型号、压力、温度、材质、分类或其他产品关键参数",
    "不得保存、展示或重新加入电话、手机号、微信号、tel:、拨号或复制号码入口"
  ],
  items: allItems
};

fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(path.join(artifactsDir, "self-canonical-implementation-plan.json"), JSON.stringify(report, null, 2));
const headers = ["文件", "页面类型", "目标canonical", "处理建议", "原因", "自动修改"];
const rows = [headers.map(csvCell).join(",")].concat(allItems.map((item) => [
  item.file,
  item.pageType,
  item.targetCanonical,
  item.action,
  item.reasons,
  "否"
].map(csvCell).join(",")));
fs.writeFileSync(path.join(artifactsDir, "self-canonical-implementation-plan.csv"), `\uFEFF${rows.join("\n")}`);

console.log(JSON.stringify(report.summary, null, 2));
if (blockingIssues > 0) process.exitCode = 1;
