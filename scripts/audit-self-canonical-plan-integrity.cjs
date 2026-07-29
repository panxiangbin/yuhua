#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const artifactsDir = path.join(root, "test-artifacts");
const planPath = path.join(artifactsDir, "self-canonical-implementation-plan.json");
const siteConfigPath = path.join(root, "assets", "site-config.js");

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

function readOfficialOrigin() {
  const source = fs.readFileSync(siteConfigPath, "utf8");
  const match = source.match(/\bofficialSite\s*:\s*(["'])(https:\/\/[^"']+)\1/);
  if (!match) throw new Error("无法从 assets/site-config.js 读取 HTTPS officialSite");
  return new URL(match[2]).origin;
}

function expectedPathForFile(file) {
  const normalized = String(file || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized === "index.html") return "/";
  if (normalized.endsWith("/index.html")) return `/${normalized.slice(0, -"index.html".length)}`;
  return `/${normalized}`;
}

if (!fs.existsSync(planPath)) {
  throw new Error("缺少 self-canonical-implementation-plan.json，请先运行 build-self-canonical-plan.cjs");
}

const officialOrigin = readOfficialOrigin();
const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
const items = [];
const targetOwners = new Map();
let blockingIssues = 0;
let readyItems = 0;

for (const item of plan.items || []) {
  if (item.action !== "可进入原子实施候选") continue;
  readyItems += 1;

  const reasons = [];
  let url;
  try {
    url = new URL(item.targetCanonical);
  } catch {
    reasons.push("目标 canonical 不是合法绝对 URL");
  }

  if (url) {
    if (url.protocol !== "https:") reasons.push("目标 canonical 不是 HTTPS");
    if (url.origin !== officialOrigin) reasons.push("目标 canonical 越出官方站点域名");
    if (url.search) reasons.push("目标 canonical 不应包含查询参数");
    if (url.hash) reasons.push("目标 canonical 不应包含片段标识");

    let decodedPath = "";
    try {
      decodedPath = decodeURIComponent(url.pathname);
    } catch {
      reasons.push("目标 canonical 路径包含非法百分号编码");
    }
    const expectedPath = expectedPathForFile(item.file);
    if (decodedPath && decodedPath !== expectedPath) {
      reasons.push(`URL 解码路径与源文件不一致：${decodedPath} != ${expectedPath}`);
    }

    const owners = targetOwners.get(url.href) || [];
    owners.push(item.file);
    targetOwners.set(url.href, owners);
  }

  items.push({
    file: item.file,
    targetCanonical: item.targetCanonical,
    status: reasons.length ? "阻断" : "通过",
    reasons: reasons.join("；")
  });
}

for (const record of items) {
  const owners = targetOwners.get(record.targetCanonical) || [];
  if (owners.length > 1) {
    record.status = "阻断";
    record.reasons = [record.reasons, `多个源文件共享同一 canonical：${owners.join(" | ")}`].filter(Boolean).join("；");
  }
  if (record.status === "阻断") blockingIssues += 1;
}

const report = {
  generatedAt: new Date().toISOString(),
  scope: "验证自指 canonical 实施计划的域名、HTTPS、唯一性、URL 编码和源文件路径往返一致性；不修改 HTML 或产品数据",
  officialOrigin,
  summary: {
    readyPlanItems: readyItems,
    passedItems: items.filter((item) => item.status === "通过").length,
    blockedItems: blockingIssues,
    automaticChanges: 0
  },
  safetyRules: [
    "canonical 必须留在已确认的官方 HTTPS 域名内",
    "canonical 不得带查询参数或片段标识",
    "URL 解码后的路径必须与源 HTML 文件公开路径完全一致",
    "多个页面不得共享同一自指 canonical",
    "不得修改型号、压力、温度、材质、分类或其他产品关键数据",
    "不得保存、展示或重新加入电话、手机号、微信号、tel:、拨号或复制号码入口"
  ],
  items
};

fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(path.join(artifactsDir, "self-canonical-plan-integrity-audit.json"), JSON.stringify(report, null, 2));
const headers = ["文件", "目标canonical", "状态", "原因"];
const rows = [headers.map(csvCell).join(",")].concat(items.map((item) => [
  item.file,
  item.targetCanonical,
  item.status,
  item.reasons
].map(csvCell).join(",")));
fs.writeFileSync(path.join(artifactsDir, "self-canonical-plan-integrity-audit.csv"), `\uFEFF${rows.join("\n")}`);

console.log(JSON.stringify(report.summary, null, 2));
if (blockingIssues > 0) process.exitCode = 1;
