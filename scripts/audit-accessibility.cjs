#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "test-artifacts");
fs.mkdirSync(outDir, { recursive: true });

const pages = ["index.html", "404.html"];
const findings = [];

function add(file, severity, rule, evidence, recommendation) {
  findings.push({ file, severity, rule, evidence, recommendation });
}

function count(text, regex) {
  return (text.match(regex) || []).length;
}

for (const file of pages) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    add(file, "critical", "页面文件存在", "文件缺失", "恢复页面文件");
    continue;
  }

  const html = fs.readFileSync(fullPath, "utf8");
  const lang = (html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i) || [])[1] || "";
  if (!/^zh(?:-CN)?$/i.test(lang)) {
    add(file, "critical", "页面语言", `lang=${lang || "缺失"}`, "设置 html lang=\"zh-CN\"");
  }

  const title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "";
  if (!title.trim()) add(file, "critical", "页面标题", "title 为空或缺失", "为页面提供明确标题");

  const h1Count = count(html, /<h1\b/gi);
  if (file === "index.html" && h1Count !== 1) {
    add(file, "critical", "主标题层级", `h1 数量=${h1Count}`, "首页保留且仅保留一个 h1");
  }

  if (file === "index.html" && !/<main\b[^>]*\bid=["']main["']/i.test(html)) {
    add(file, "critical", "主要内容地标", "缺少 main#main", "增加 main 元素并提供稳定锚点");
  }

  if (file === "index.html" && !/<a\b[^>]*class=["'][^"']*skip-link[^"']*["'][^>]*href=["']#main["']/i.test(html)) {
    add(file, "review", "跳过导航链接", "未找到指向 #main 的 skip-link", "增加键盘用户可用的跳过导航链接");
  }

  const imgTags = html.match(/<img\b[^>]*>/gi) || [];
  imgTags.forEach((tag, index) => {
    if (!/\balt=["'][^"']*["']/i.test(tag)) {
      add(file, "critical", "图片替代文字", `第 ${index + 1} 个 img 缺少 alt`, "为内容图片提供 alt；装饰图片使用 alt=\"\"");
    }
  });

  const buttonTags = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/gi) || [];
  buttonTags.forEach((tag, index) => {
    const attrs = (tag.match(/^<button\b([^>]*)>/i) || [])[1] || "";
    const visible = tag.replace(/<[^>]+>/g, "").replace(/\s+/g, "").trim();
    const hasName = visible || /\baria-label=["'][^"']+["']/i.test(attrs) || /\btitle=["'][^"']+["']/i.test(attrs);
    if (!hasName) {
      add(file, "critical", "按钮可访问名称", `第 ${index + 1} 个 button 无文字或 aria-label`, "为按钮增加可见文字或 aria-label");
    }
  });

  const inputs = html.match(/<(?:input|select|textarea)\b[^>]*>/gi) || [];
  inputs.forEach((tag, index) => {
    const id = (tag.match(/\bid=["']([^"']+)["']/i) || [])[1];
    const hasAria = /\baria-label=["'][^"']+["']/i.test(tag) || /\baria-labelledby=["'][^"']+["']/i.test(tag);
    const wrapped = id && new RegExp(`<label\\b[^>]*for=["']${id}["']`, "i").test(html);
    const containing = id && new RegExp(`<label\\b[^>]*>[\\s\\S]{0,300}<[^>]+\\bid=["']${id}["']`, "i").test(html);
    if (!hasAria && !wrapped && !containing) {
      add(file, "critical", "表单控件标签", `控件 ${id || `#${index + 1}`} 未关联 label`, "使用 label for、包裹式 label 或 aria-label");
    }
  });

  if (file === "index.html") {
    if (!/<nav\b[^>]*\baria-label=["'][^"']+["']/i.test(html)) {
      add(file, "review", "导航地标命名", "nav 缺少 aria-label", "为多个导航区域提供明确 aria-label");
    }
    if (!/role=["']dialog["'][^>]*aria-modal=["']true["']/i.test(html) && !/aria-modal=["']true["'][^>]*role=["']dialog["']/i.test(html)) {
      add(file, "critical", "模态对话框语义", "未检测到 role=dialog 与 aria-modal=true", "为产品弹窗补充对话框语义");
    }
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  scannedPages: pages.length,
  findingCount: findings.length,
  criticalCount: findings.filter((item) => item.severity === "critical").length,
  reviewCount: findings.filter((item) => item.severity === "review").length,
  countsByRule: findings.reduce((acc, item) => {
    acc[item.rule] = (acc[item.rule] || 0) + 1;
    return acc;
  }, {})
};

function csv(value) {
  return `"${String(value == null ? "" : value).replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

const rows = [
  ["文件", "严重级别", "规则", "依据", "建议"].map(csv).join(","),
  ...findings.map((item) => [item.file, item.severity, item.rule, item.evidence, item.recommendation].map(csv).join(","))
];

fs.writeFileSync(path.join(outDir, "accessibility-audit-summary.json"), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(outDir, "accessibility-audit-items.csv"), `\uFEFF${rows.join("\n")}`);

console.log(JSON.stringify(summary, null, 2));
if (summary.criticalCount > 0) {
  console.error("可访问性审计发现关键问题，阻止合并。详情见 test-artifacts/accessibility-audit-items.csv");
  process.exit(1);
}
