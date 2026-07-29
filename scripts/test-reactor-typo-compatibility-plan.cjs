#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const artifacts = path.join(root, "test-artifacts");

function readJson(name) {
  const file = path.join(artifacts, name);
  if (!fs.existsSync(file)) throw new Error(`缺少测试输入：${name}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

const plan = readJson("reactor-typo-compatibility-plan.json");
const urlAudit = readJson("reactor-typo-url-compatibility.json");
const hostingAudit = readJson("hosting-redirect-capability-audit.json");
const routes = Array.isArray(plan.routePlans) ? plan.routePlans : [];
const redirectConfirmed = hostingAudit.repositoryRedirectCapabilityConfirmed === true;
const forbidden = /(手机号|微信号|tel:|拨号|复制号码|phone|wechat)/i;

if (!routes.length) fail("兼容计划没有路由记录");
if (plan.summary?.totalRoutes !== routes.length) fail("summary.totalRoutes 与实际路由数不一致");
if (Number(urlAudit.summary?.uniqueOldPagePaths) !== routes.length) fail("兼容计划与前置 URL 审计路由数不一致");
if (plan.summary?.automaticChanges !== 0) fail("兼容计划不得包含自动修改");

const seenOld = new Set();
const seenNew = new Set();
let readyCount = 0;
let blockedCount = 0;

for (const route of routes) {
  const oldPath = String(route.oldPath || "").trim();
  const proposedPath = String(route.proposedPath || "").trim();
  const blockers = Array.isArray(route.blockers) ? route.blockers : [];
  const ready = route.readyForImplementationReview === true;

  if (!oldPath || !proposedPath) fail("存在空的旧路径或建议新路径");
  if (oldPath === proposedPath) fail(`旧路径与新路径相同：${oldPath}`);
  if (seenOld.has(oldPath)) fail(`旧路径重复：${oldPath}`);
  if (seenNew.has(proposedPath)) fail(`建议新路径冲突：${proposedPath}`);
  seenOld.add(oldPath);
  seenNew.add(proposedPath);

  if (route.automaticExecution !== false) fail(`路由不得自动执行：${oldPath}`);
  if (ready !== (blockers.length === 0)) fail(`审核状态与阻断项不一致：${oldPath}`);
  if (route.staticCompatibilityPage?.allowedNow !== ready) fail(`静态兼容页放行状态错误：${oldPath}`);
  if (route.permanentRedirect?.allowedNow !== (ready && redirectConfirmed)) fail(`永久重定向放行状态错误：${oldPath}`);
  if (!redirectConfirmed && route.recommendedTrack !== "static-compatibility-page") fail(`未确认托管能力时必须采用静态兼容页：${oldPath}`);

  const routeText = JSON.stringify(route);
  const prohibitedOnly = JSON.stringify({
    actions: route.staticCompatibilityPage?.actions || [],
    verification: route.staticCompatibilityPage?.verification || [],
    redirectVerification: route.permanentRedirect?.verification || []
  });
  if (forbidden.test(routeText.replace(prohibitedOnly, ""))) fail(`路由数据中疑似保存了直接联系方式字段：${oldPath}`);

  if (ready) readyCount += 1;
  else blockedCount += 1;
}

if (plan.summary?.readyRoutes !== readyCount) fail("summary.readyRoutes 与实际数量不一致");
if (plan.summary?.blockedRoutes !== blockedCount) fail("summary.blockedRoutes 与实际数量不一致");

if (!process.exitCode) {
  console.log(JSON.stringify({
    totalRoutes: routes.length,
    readyRoutes: readyCount,
    blockedRoutes: blockedCount,
    redirectCapabilityConfirmed: redirectConfirmed,
    duplicateOldPaths: 0,
    proposedPathConflicts: 0,
    automaticChanges: 0
  }, null, 2));
}
