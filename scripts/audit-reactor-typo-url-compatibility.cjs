#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "test-artifacts");
fs.mkdirSync(outputDir, { recursive: true });

const TYPO = "发应釜";
const CORRECT = "反应釜";
const TEXT_EXTENSIONS = new Set([
  ".html", ".htm", ".js", ".cjs", ".mjs", ".json", ".css", ".md", ".txt",
  ".xml", ".yml", ".yaml", ".csv", ".svg"
]);
const SKIP_DIRS = new Set([".git", "node_modules", "test-artifacts"]);

function clean(value) {
  return String(value == null ? "" : value).trim();
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function csvCell(value) {
  return `"${clean(value).replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

function load(relativePath, sandbox) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), "utf8"), sandbox, {
    filename: relativePath
  });
}

function walkTextFiles(directory, result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walkTextFiles(fullPath, result);
    else if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) result.push(fullPath);
  }
  return result;
}

function countOccurrences(text, needle) {
  if (!needle) return 0;
  let count = 0;
  let offset = 0;
  while ((offset = text.indexOf(needle, offset)) !== -1) {
    count += 1;
    offset += needle.length;
  }
  return count;
}

const sandbox = { window: {} };
vm.createContext(sandbox);
load("assets/specs.js", sandbox);
const specs = Array.isArray(sandbox.window.SPECS) ? sandbox.window.SPECS : [];

const textFiles = walkTextFiles(root).map((absolutePath) => ({
  relativePath: toPosix(path.relative(root, absolutePath)),
  content: fs.readFileSync(absolutePath, "utf8")
}));

const hostingSignals = [
  { type: "github-pages", files: ["CNAME", ".nojekyll"] },
  { type: "netlify", files: ["netlify.toml", "_redirects"] },
  { type: "vercel", files: ["vercel.json"] },
  { type: "cloudflare-pages", files: ["_routes.json"] },
  { type: "apache", files: [".htaccess"] }
].map((signal) => ({
  ...signal,
  detectedFiles: signal.files.filter((file) => fs.existsSync(path.join(root, file)))
}));

const detectedHostingSignals = hostingSignals.filter((signal) => signal.detectedFiles.length);
const hasRedirectConfiguration = hostingSignals.some((signal) =>
  signal.detectedFiles.some((file) => ["_redirects", "netlify.toml", "vercel.json", ".htaccess"].includes(file))
);

const rawRecords = specs.flatMap((spec, index) => {
  const page = clean(spec.page);
  if (!page.includes(TYPO)) return [];

  const proposedPage = page.replaceAll(TYPO, CORRECT);
  const exactReferences = textFiles.flatMap((file) => {
    const occurrences = countOccurrences(file.content, page);
    return occurrences ? [{ file: file.relativePath, occurrences }] : [];
  });

  return [{
    specIndex: index + 1,
    model: clean(spec.model),
    title: clean(spec.title),
    oldPath: page,
    proposedPath: proposedPage,
    oldPathExists: fs.existsSync(path.join(root, page)),
    proposedPathAlreadyExists: fs.existsSync(path.join(root, proposedPage)),
    exactInternalReferenceFiles: exactReferences.length,
    exactInternalReferenceOccurrences: exactReferences.reduce((sum, item) => sum + item.occurrences, 0),
    exactReferences
  }];
});

const byOldPath = new Map();
for (const record of rawRecords) {
  const existing = byOldPath.get(record.oldPath) || {
    oldPath: record.oldPath,
    proposedPath: record.proposedPath,
    models: [],
    specIndexes: [],
    oldPathExists: record.oldPathExists,
    proposedPathAlreadyExists: record.proposedPathAlreadyExists,
    exactInternalReferenceFiles: record.exactInternalReferenceFiles,
    exactInternalReferenceOccurrences: record.exactInternalReferenceOccurrences,
    exactReferences: record.exactReferences
  };
  if (record.model) existing.models.push(record.model);
  existing.specIndexes.push(record.specIndex);
  byOldPath.set(record.oldPath, existing);
}

const proposedOwners = new Map();
for (const route of byOldPath.values()) {
  const owners = proposedOwners.get(route.proposedPath) || [];
  owners.push(route.oldPath);
  proposedOwners.set(route.proposedPath, owners);
}

const routes = Array.from(byOldPath.values()).map((route) => {
  const blockers = [];
  if (!route.oldPathExists) blockers.push("旧页面源文件缺失");
  if (route.proposedPathAlreadyExists) blockers.push("修正后目标路径已存在，需人工判断是否为同一页面");
  if ((proposedOwners.get(route.proposedPath) || []).length > 1) blockers.push("多个旧路径计划指向同一修正路径");

  const compatibilityStrategy = hasRedirectConfiguration
    ? "在现有托管重定向配置中增加旧路径到新路径的永久重定向，并保留自动链接检查"
    : "静态托管能力未确认：优先保留旧HTML路径作为兼容页（canonical 指向新路径），确认托管平台支持后再改为永久重定向";

  return {
    ...route,
    models: Array.from(new Set(route.models)),
    specIndexes: Array.from(new Set(route.specIndexes)),
    blockers,
    readyForCompatibilityPlanning: blockers.length === 0,
    compatibilityStrategy,
    automaticExecution: false
  };
});

const summary = {
  generatedAt: new Date().toISOString(),
  typoSpecPageRecords: rawRecords.length,
  uniqueOldPagePaths: routes.length,
  oldPathsPresent: routes.filter((route) => route.oldPathExists).length,
  proposedTargetsAlreadyPresent: routes.filter((route) => route.proposedPathAlreadyExists).length,
  routesReadyForCompatibilityPlanning: routes.filter((route) => route.readyForCompatibilityPlanning).length,
  blockedRoutes: routes.filter((route) => !route.readyForCompatibilityPlanning).length,
  detectedHostingSignals,
  redirectConfigurationDetected: hasRedirectConfiguration,
  automaticChanges: 0,
  scope: "仅审计错字页面改名后的旧URL兼容风险，不移动文件、不新增跳转、不修改产品参数或联系方式"
};

const report = {
  summary,
  decisionRule: [
    "未确认托管平台重定向能力前，不删除任何旧HTML路径",
    "若采用兼容页，页面不得复制或重新加入电话、手机号、微信号、拨号链接或复制号码按钮",
    "新旧路径必须在同一提交中完成，并运行静态资源、错误跳转、桌面端、手机端和可访问性测试",
    "外部收录和收藏链接无法从仓库完全证明，必须在上线前人工抽查旧URL"
  ],
  routes
};

fs.writeFileSync(
  path.join(outputDir, "reactor-typo-url-compatibility.json"),
  JSON.stringify(report, null, 2)
);

const headers = [
  "旧页面路径", "建议新路径", "型号", "规格书序号", "旧文件存在", "目标已存在",
  "内部引用文件数", "内部引用次数", "可进入兼容规划", "阻断事项", "建议兼容策略"
];
const rows = [headers.map(csvCell).join(",")].concat(routes.map((route) => [
  route.oldPath,
  route.proposedPath,
  route.models.join(" | "),
  route.specIndexes.join(" | "),
  route.oldPathExists ? "是" : "否",
  route.proposedPathAlreadyExists ? "是" : "否",
  route.exactInternalReferenceFiles,
  route.exactInternalReferenceOccurrences,
  route.readyForCompatibilityPlanning ? "是" : "否",
  route.blockers.join(" | "),
  route.compatibilityStrategy
].map(csvCell).join(",")));
fs.writeFileSync(
  path.join(outputDir, "reactor-typo-url-compatibility.csv"),
  `\uFEFF${rows.join("\n")}`
);

console.log(JSON.stringify(summary, null, 2));
routes.filter((route) => route.blockers.length).forEach((route) => {
  console.log(`${route.oldPath}: ${route.blockers.join(" | ")}`);
});

if (!routes.length) {
  console.error("ERROR: 未找到包含‘发应釜’的页面路径，审计基线可能发生变化");
  process.exitCode = 1;
}
