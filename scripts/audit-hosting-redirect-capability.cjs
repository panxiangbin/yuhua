#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "test-artifacts");
fs.mkdirSync(outputDir, { recursive: true });

const evidenceRules = [
  { platform: "Netlify", files: ["netlify.toml", "_redirects"], redirectFiles: ["netlify.toml", "_redirects"] },
  { platform: "Vercel", files: ["vercel.json"], redirectFiles: ["vercel.json"] },
  { platform: "Apache", files: [".htaccess"], redirectFiles: [".htaccess"] },
  { platform: "Cloudflare Pages", files: ["_routes.json", "wrangler.toml", "wrangler.json", "wrangler.jsonc"], redirectFiles: [] },
  { platform: "GitHub Pages", files: ["CNAME", ".nojekyll"], redirectFiles: [] },
  { platform: "Firebase Hosting", files: ["firebase.json", ".firebaserc"], redirectFiles: ["firebase.json"] }
];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function walk(directory, result = []) {
  if (!fs.existsSync(directory)) return result;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath, result);
    else result.push(fullPath);
  }
  return result;
}

const workflowDir = path.join(root, ".github", "workflows");
const workflowSignals = walk(workflowDir).flatMap((absolutePath) => {
  const content = fs.readFileSync(absolutePath, "utf8");
  const relativePath = path.relative(root, absolutePath).split(path.sep).join("/");
  const signals = [];
  const checks = [
    ["GitHub Pages", /actions\/(configure-pages|upload-pages-artifact|deploy-pages)@/i],
    ["Netlify", /netlify/i],
    ["Vercel", /vercel/i],
    ["Cloudflare Pages", /(cloudflare|wrangler)/i],
    ["Firebase Hosting", /firebase/i]
  ];
  for (const [platform, pattern] of checks) {
    if (pattern.test(content)) signals.push({ platform, file: relativePath, evidence: "workflow-content" });
  }
  return signals;
});

const fileEvidence = evidenceRules.map((rule) => {
  const detectedFiles = rule.files.filter(exists);
  const redirectFiles = rule.redirectFiles.filter(exists);
  return {
    platform: rule.platform,
    detectedFiles,
    redirectFiles,
    platformEvidence: detectedFiles.length > 0,
    repositoryRedirectEvidence: redirectFiles.length > 0
  };
});

const detectedPlatforms = Array.from(new Set([
  ...fileEvidence.filter((item) => item.platformEvidence).map((item) => item.platform),
  ...workflowSignals.map((item) => item.platform)
]));
const redirectEvidence = fileEvidence.flatMap((item) =>
  item.redirectFiles.map((file) => ({ platform: item.platform, file, evidence: "redirect-config-file" }))
);

const recommendation = redirectEvidence.length
  ? "仓库存在明确重定向配置证据；实施前仍需逐条验证语法、状态码和旧URL访问结果。"
  : "仓库未发现可证明永久重定向能力的配置；不得删除旧HTML路径，优先采用保留旧页并设置canonical的兼容方案，待人工确认真实托管平台后再决定是否改为301/308。";

const report = {
  generatedAt: new Date().toISOString(),
  scope: "仅审计仓库内托管与重定向能力证据，不修改页面、路径、产品数据或联系方式",
  detectedPlatforms,
  fileEvidence,
  workflowSignals,
  redirectEvidence,
  repositoryRedirectCapabilityConfirmed: redirectEvidence.length > 0,
  recommendation,
  manualReviewRequired: [
    "确认线上站点实际托管平台和部署入口",
    "确认该平台是否支持仓库级301或308重定向",
    "上线前逐条访问旧URL并确认不返回404或错误页面",
    "兼容页与跳转目标继续执行无电话、手机号、微信号、拨号链接和复制号码按钮规则"
  ],
  automaticChanges: 0
};

fs.writeFileSync(
  path.join(outputDir, "hosting-redirect-capability-audit.json"),
  JSON.stringify(report, null, 2)
);

const csv = [
  ["平台", "检测文件", "重定向配置文件", "工作流证据", "仓库已确认重定向能力"],
  ...fileEvidence.map((item) => [
    item.platform,
    item.detectedFiles.join(" | "),
    item.redirectFiles.join(" | "),
    workflowSignals.filter((signal) => signal.platform === item.platform).map((signal) => signal.file).join(" | "),
    item.repositoryRedirectEvidence ? "是" : "否"
  ])
].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
fs.writeFileSync(path.join(outputDir, "hosting-redirect-capability-audit.csv"), `\uFEFF${csv}`);

console.log(JSON.stringify({
  detectedPlatforms,
  redirectEvidenceCount: redirectEvidence.length,
  repositoryRedirectCapabilityConfirmed: report.repositoryRedirectCapabilityConfirmed,
  recommendation
}, null, 2));
