#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "test-artifacts");
fs.mkdirSync(outputDir, { recursive: true });

function readJson(fileName) {
  const absolutePath = path.join(outputDir, fileName);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`缺少前置审计报告：${fileName}`);
  }
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function clean(value) {
  return String(value == null ? "" : value).trim();
}

function csvCell(value) {
  return `"${clean(value).replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

const urlAudit = readJson("reactor-typo-url-compatibility.json");
const hostingAudit = readJson("hosting-redirect-capability-audit.json");
const routes = Array.isArray(urlAudit.routes) ? urlAudit.routes : [];
const redirectConfirmed = hostingAudit.repositoryRedirectCapabilityConfirmed === true;

if (!routes.length) {
  throw new Error("旧URL兼容审计没有可规划路由，无法生成实施方案");
}

const routePlans = routes.map((route) => {
  const blockers = Array.isArray(route.blockers) ? route.blockers : [];
  const ready = route.readyForCompatibilityPlanning === true && blockers.length === 0;
  const staticCompatibilityPage = {
    allowedNow: ready,
    actions: [
      `保留旧路径：${route.oldPath}`,
      `创建或移动正式内容到修正路径：${route.proposedPath}`,
      "旧路径仅作为兼容入口，不复制产品关键参数",
      `旧路径 canonical 指向：${route.proposedPath}`,
      "旧路径提供清晰的‘资料地址已更新’说明和普通链接，不使用脚本强制跳转",
      "兼容页不得包含电话、手机号、微信号、tel:、拨号入口或复制号码按钮"
    ],
    verification: [
      "旧路径返回成功页面而不是404",
      "canonical 目标与建议新路径完全一致",
      "页面内链接目标存在且不形成循环跳转",
      "桌面端和手机端均可通过键盘或触控进入新页面",
      "静态资源、可访问性和无直接联系方式检查全部通过"
    ]
  };

  const permanentRedirect = {
    allowedNow: ready && redirectConfirmed,
    prerequisite: redirectConfirmed
      ? "仓库已有明确重定向配置证据，仍需人工确认线上实际托管平台与规则语法"
      : "仓库尚无明确重定向配置证据；必须先由人工确认线上托管平台及301/308能力",
    rule: `${route.oldPath} -> ${route.proposedPath}`,
    requiredStatus: "301 或 308",
    verification: [
      "旧URL真实请求返回301或308，不能依赖仅在浏览器执行的JavaScript跳转",
      "Location 精确指向建议新路径",
      "最多一次跳转到达200页面，不形成跳转链或循环",
      "查询参数和中文路径编码行为符合托管平台实际规则",
      "新页面及重定向配置继续通过无直接联系方式检查"
    ]
  };

  return {
    oldPath: route.oldPath,
    proposedPath: route.proposedPath,
    models: Array.isArray(route.models) ? route.models : [],
    exactInternalReferenceFiles: route.exactInternalReferenceFiles || 0,
    exactInternalReferenceOccurrences: route.exactInternalReferenceOccurrences || 0,
    blockers,
    readyForImplementationReview: ready,
    recommendedTrack: redirectConfirmed ? "permanent-redirect-after-manual-hosting-confirmation" : "static-compatibility-page",
    staticCompatibilityPage,
    permanentRedirect,
    automaticExecution: false
  };
});

const blockedRoutes = routePlans.filter((item) => !item.readyForImplementationReview);
const readyRoutes = routePlans.filter((item) => item.readyForImplementationReview);

const report = {
  generatedAt: new Date().toISOString(),
  scope: "根据现有审计证据生成旧路径兼容实施方案；不创建页面、不移动文件、不写入重定向、不修改产品参数或联系方式",
  repositoryRedirectCapabilityConfirmed: redirectConfirmed,
  selectedDefaultTrack: redirectConfirmed ? "确认托管平台后使用301/308永久重定向" : "保留旧HTML兼容页并设置canonical",
  summary: {
    totalRoutes: routePlans.length,
    readyRoutes: readyRoutes.length,
    blockedRoutes: blockedRoutes.length,
    automaticChanges: 0
  },
  globalAtomicExecutionOrder: [
    "人工批准具体路由和托管方案",
    "在同一工作分支提交中创建修正后的新页面路径",
    "同步更新 assets/specs.js 及全部精确内部引用",
    redirectConfirmed
      ? "加入经人工确认语法的301/308规则，同时暂不删除旧页，直至真实环境验证完成"
      : "保留旧HTML路径，改造成不含关键参数副本的轻量兼容页并设置canonical",
    "运行全部现有自动测试、静态资源检查、联系方式泄漏检查、桌面端和手机端浏览器测试",
    "上线前在真实域名逐条验证旧URL、新URL、状态码、Location、canonical和无错误跳转",
    "任一验证失败则整体回退该批次，不允许只完成部分改名"
  ],
  prohibitedActions: [
    "不得猜测或改写产品型号、压力、温度、材质和其他关键参数",
    "不得在兼容页复制未经确认的产品数据",
    "不得删除旧路径后再等待补重定向",
    "不得使用电话、手机号、微信号、tel:、拨号链接或复制号码按钮",
    "不得合并PR或修改main，除非用户明确授权上线"
  ],
  routePlans
};

fs.writeFileSync(
  path.join(outputDir, "reactor-typo-compatibility-plan.json"),
  JSON.stringify(report, null, 2)
);

const headers = [
  "旧路径", "建议新路径", "型号", "可进入实施审核", "阻断事项", "默认方案",
  "静态兼容页当前允许", "永久重定向当前允许", "内部引用文件数", "内部引用次数"
];
const rows = [headers.map(csvCell).join(",")].concat(routePlans.map((item) => [
  item.oldPath,
  item.proposedPath,
  item.models.join(" | "),
  item.readyForImplementationReview ? "是" : "否",
  item.blockers.join(" | "),
  item.recommendedTrack,
  item.staticCompatibilityPage.allowedNow ? "是" : "否",
  item.permanentRedirect.allowedNow ? "是" : "否",
  item.exactInternalReferenceFiles,
  item.exactInternalReferenceOccurrences
].map(csvCell).join(",")));
fs.writeFileSync(
  path.join(outputDir, "reactor-typo-compatibility-plan.csv"),
  `\uFEFF${rows.join("\n")}`
);

console.log(JSON.stringify({
  repositoryRedirectCapabilityConfirmed: redirectConfirmed,
  selectedDefaultTrack: report.selectedDefaultTrack,
  totalRoutes: routePlans.length,
  readyRoutes: readyRoutes.length,
  blockedRoutes: blockedRoutes.length,
  automaticChanges: 0
}, null, 2));

if (urlAudit.summary && Number(urlAudit.summary.uniqueOldPagePaths) !== routePlans.length) {
  console.error("ERROR: 兼容计划路由数与前置URL审计摘要不一致");
  process.exitCode = 1;
}
