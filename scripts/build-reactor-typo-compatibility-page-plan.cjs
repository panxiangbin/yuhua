#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "test-artifacts");
fs.mkdirSync(outputDir, { recursive: true });

const urlAuditPath = path.join(outputDir, "reactor-typo-url-compatibility.json");
const hostingAuditPath = path.join(outputDir, "hosting-redirect-capability-audit.json");

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label}不存在：${path.relative(root, filePath)}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function csvCell(value) {
  return `"${String(value == null ? "" : value).replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

function toUrlPath(relativePath) {
  return `/${String(relativePath || "").replace(/^\/+/, "")}`;
}

const urlAudit = readJson(urlAuditPath, "旧URL兼容审计报告");
const hostingAudit = readJson(hostingAuditPath, "托管能力审计报告");
const routes = Array.isArray(urlAudit.routes) ? urlAudit.routes : [];
const redirectConfirmed = hostingAudit.repositoryRedirectCapabilityConfirmed === true;

const plans = routes.map((route) => {
  const blockers = Array.isArray(route.blockers) ? [...route.blockers] : [];
  if (!route.oldPathExists && !blockers.includes("旧页面源文件缺失")) blockers.push("旧页面源文件缺失");
  if (route.proposedPathAlreadyExists && !blockers.some((item) => item.includes("目标路径已存在"))) {
    blockers.push("修正后目标路径已存在，需人工确认页面关系");
  }

  const oldUrl = toUrlPath(route.oldPath);
  const newUrl = toUrlPath(route.proposedPath);
  const strategy = redirectConfirmed ? "permanent-redirect" : "static-compatibility-page";

  return {
    oldPath: route.oldPath,
    proposedPath: route.proposedPath,
    oldUrl,
    newUrl,
    models: Array.isArray(route.models) ? route.models : [],
    strategy,
    readyForImplementationReview: blockers.length === 0,
    blockers,
    requiredAtomicChanges: redirectConfirmed
      ? [
          "创建修正后的新页面路径",
          "同步更新仓库内全部精确引用",
          "在已确认的托管配置中增加旧URL到新URL的301或308规则",
          "验证旧URL状态码、Location目标和新页面200响应"
        ]
      : [
          "创建修正后的新页面路径",
          "同步更新仓库内全部精确引用",
          "保留旧HTML文件作为兼容页，不删除旧路径",
          "旧兼容页设置canonical指向新URL，并提供清晰的继续访问链接",
          "验证旧URL与新URL均返回可用页面且不存在循环跳转"
        ],
    compatibilityPageRequirements: redirectConfirmed ? [] : [
      "使用UTF-8并声明中文语言",
      `canonical必须精确指向${newUrl}`,
      `页面继续访问链接必须精确指向${newUrl}`,
      "不得包含电话、手机号、微信号、tel:链接、复制号码按钮或任何直接联系方式",
      "不得复制或改写产品压力、温度、材质及其他关键参数",
      "页面标题应说明旧地址已更新，避免伪装成完整产品详情页",
      "禁止使用JavaScript自动跳转，避免可访问性、历史记录和循环跳转问题"
    ],
    browserVerification: [
      `桌面端打开${oldUrl}`,
      `手机端打开${oldUrl}`,
      `直接打开${newUrl}`,
      "确认键盘可聚焦继续访问链接",
      "确认无404、错误分类跳转、空白页或资源缺失",
      "再次运行无直接联系方式泄漏检查"
    ],
    automaticExecution: false
  };
});

const summary = {
  generatedAt: new Date().toISOString(),
  routeCount: plans.length,
  readyForImplementationReview: plans.filter((item) => item.readyForImplementationReview).length,
  blockedRoutes: plans.filter((item) => !item.readyForImplementationReview).length,
  redirectCapabilityConfirmed: redirectConfirmed,
  selectedStrategy: redirectConfirmed ? "permanent-redirect" : "static-compatibility-page",
  automaticChanges: 0,
  scope: "仅生成旧错字URL兼容实施计划，不创建页面、不移动文件、不修改产品数据或联系方式"
};

const report = {
  summary,
  safetyGates: [
    "实施必须与新页面创建、引用更新及旧路径兼容处理处于同一次原子提交",
    "任何目标路径冲突、源文件缺失或多对一映射都必须停止自动实施并转人工审核",
    "所有兼容页面和跳转目标必须继续通过无电话、手机号、微信号、拨号链接和复制号码按钮检查",
    "不得根据错字修正推断或修改任何产品参数、压力、温度、材质或分类",
    "上线前必须在真实托管环境验证旧URL，不得只依赖本地文件存在性"
  ],
  plans
};

fs.writeFileSync(
  path.join(outputDir, "reactor-typo-compatibility-page-plan.json"),
  JSON.stringify(report, null, 2)
);

const headers = [
  "旧页面路径", "建议新路径", "型号", "策略", "可进入实施审核", "阻断事项",
  "原子改动要求", "兼容页要求", "浏览器验证"
];
const rows = [headers.map(csvCell).join(",")].concat(plans.map((item) => [
  item.oldPath,
  item.proposedPath,
  item.models.join(" | "),
  item.strategy,
  item.readyForImplementationReview ? "是" : "否",
  item.blockers.join(" | "),
  item.requiredAtomicChanges.join(" | "),
  item.compatibilityPageRequirements.join(" | "),
  item.browserVerification.join(" | ")
].map(csvCell).join(",")));

fs.writeFileSync(
  path.join(outputDir, "reactor-typo-compatibility-page-plan.csv"),
  `\uFEFF${rows.join("\n")}`
);

console.log(JSON.stringify(summary, null, 2));

if (!plans.length) {
  console.error("ERROR: 兼容审计中没有可规划的旧URL记录，审计基线可能发生变化");
  process.exitCode = 1;
}
