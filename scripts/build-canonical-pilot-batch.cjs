#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const artifactsDir = path.join(root, "test-artifacts");
const planPath = path.join(artifactsDir, "self-canonical-implementation-plan.json");
const integrityPath = path.join(artifactsDir, "self-canonical-plan-integrity-audit.json");
const MAX_BATCH_SIZE = 10;
const SAFE_PAGE_TYPES = new Set(["tool-page", "course-or-tutorial"]);

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

function readJson(file, label) {
  if (!fs.existsSync(file)) throw new Error(`缺少${label}：${path.relative(root, file)}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function normalizedPath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

const plan = readJson(planPath, "自指 canonical 实施计划");
const integrity = readJson(integrityPath, "自指 canonical 完整性审计");
const integrityItems = Array.isArray(integrity.items) ? integrity.items : [];
const integrityByFile = new Map(integrityItems.map((item) => [normalizedPath(item.file), item]));
const candidates = [];
const excluded = [];
let blockingIssues = 0;

for (const item of Array.isArray(plan.items) ? plan.items : []) {
  const file = normalizedPath(item.file);
  const pageType = String(item.pageType || "");
  const integrityItem = integrityByFile.get(file);
  const reasons = [];

  if (item.action !== "可进入原子实施候选") reasons.push(item.reasons || "未通过实施计划筛选");
  if (!SAFE_PAGE_TYPES.has(pageType)) reasons.push("试点仅允许工具页或课程教程页");
  if (file.includes("发应釜")) reasons.push("旧错字路径禁止进入试点");
  if (/(?:^|\/)404\.html$/i.test(file)) reasons.push("错误页禁止进入试点");
  if (!integrityItem) reasons.push("缺少完整性审计记录");
  else {
    const status = String(integrityItem.status || integrityItem.result || integrityItem.action || "").toLowerCase();
    const issueText = String(integrityItem.issues || integrityItem.reasons || integrityItem.reason || "").trim();
    if (issueText) reasons.push(`完整性审计未清零：${issueText}`);
    if (status && !/(pass|passed|通过|ready|ok|valid)/i.test(status)) reasons.push(`完整性状态不是通过：${status}`);
  }
  if (!file || !fs.existsSync(path.join(root, file))) reasons.push("源 HTML 文件不存在");

  const record = {
    file,
    pageType,
    targetCanonical: String(item.targetCanonical || ""),
    decision: reasons.length ? "排除并人工审核" : "进入低风险试点候选",
    reasons: reasons.join("；"),
    automaticChanges: 0
  };

  if (reasons.length) excluded.push(record);
  else candidates.push(record);
}

candidates.sort((a, b) => a.file.localeCompare(b.file, "zh-CN"));
const pilotBatch = candidates.slice(0, MAX_BATCH_SIZE);
const deferred = candidates.slice(MAX_BATCH_SIZE).map((item) => ({
  ...item,
  decision: "通过但延后",
  reasons: `超过单批${MAX_BATCH_SIZE}页限制，留待后续原子批次`
}));

const duplicateTargets = new Map();
for (const item of pilotBatch) {
  const owners = duplicateTargets.get(item.targetCanonical) || [];
  owners.push(item.file);
  duplicateTargets.set(item.targetCanonical, owners);
}
for (const [target, owners] of duplicateTargets) {
  if (!target || owners.length > 1) blockingIssues += 1;
}

const report = {
  generatedAt: new Date().toISOString(),
  scope: "从已通过完整性审计的工具页和课程教程页中选择最多10页低风险 canonical 试点；只生成审核清单，不写入 HTML",
  summary: {
    eligibleLowRiskPages: candidates.length,
    pilotBatchSize: pilotBatch.length,
    deferredPages: deferred.length,
    excludedPages: excluded.length,
    blockingIssues,
    automaticChanges: 0
  },
  implementationGate: [
    "实施时每页仅新增一个 canonical，且不得改动正文、产品参数或业务数据",
    "同一提交必须运行 canonical、静态资源、联系方式泄漏、桌面端和手机端浏览器回归测试",
    "任一页面出现错误目标、重复 canonical、404、越域或编码异常时整批回退",
    "不得保存、展示或重新加入电话、手机号、微信号、tel:、拨号链接或复制号码按钮"
  ],
  pilotBatch,
  deferred,
  excluded
};

fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(path.join(artifactsDir, "canonical-pilot-batch.json"), JSON.stringify(report, null, 2));
const headers = ["文件", "页面类型", "目标canonical", "决定", "原因", "自动修改"];
const allRows = pilotBatch.concat(deferred, excluded);
const rows = [headers.map(csvCell).join(",")].concat(allRows.map((item) => [
  item.file,
  item.pageType,
  item.targetCanonical,
  item.decision,
  item.reasons,
  "否"
].map(csvCell).join(",")));
fs.writeFileSync(path.join(artifactsDir, "canonical-pilot-batch.csv"), `\uFEFF${rows.join("\n")}`);

console.log(JSON.stringify(report.summary, null, 2));
if (blockingIssues > 0) process.exitCode = 1;
