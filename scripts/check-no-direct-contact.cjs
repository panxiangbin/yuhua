#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const publicFiles = [
  "index.html",
  "404.html",
  "app.js",
  "assets/site-config.js"
];

const failures = [];
function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    fail(`${relativePath} 不存在`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

const contents = Object.fromEntries(publicFiles.map((file) => [file, read(file)]));

// 公开运行文件中不得保存中国大陆手机号字面值。
const mobilePattern = /(^|\D)1[3-9]\d{9}(?!\d)/g;
for (const [file, content] of Object.entries(contents)) {
  const matches = [...content.matchAll(mobilePattern)].map((match) => match[0].replace(/\D/g, ""));
  if (matches.length) {
    fail(`${file} 含手机号字面值：${[...new Set(matches)].join(", ")}`);
  }
}

const index = contents["index.html"];
const forbiddenIndexPatterns = [
  [/href\s*=\s*["']tel:/i, "index.html 含 tel: 拨号链接"],
  [/id\s*=\s*["'](?:contactPhoneLink|callNow|copyPhone|mobileCall)["']/i, "index.html 含直接联系方式控件 ID"],
  [/>\s*(?:电话咨询|复制号码|电话\s*\/\s*微信|微信同号)\s*</i, "index.html 含直接联系方式可见文案"]
];
for (const [pattern, message] of forbiddenIndexPatterns) {
  if (pattern.test(index)) fail(message);
}

// 配置对象必须明确关闭公开直接联系方式，且不得保存 phone / wechat 值。
const configCode = contents["assets/site-config.js"];
const sandbox = {
  window: {},
  document: {
    readyState: "loading",
    addEventListener() {},
    querySelectorAll() { return []; },
    querySelector() { return null; },
    getElementById() { return null; },
    documentElement: null,
    head: null
  },
  MutationObserver: undefined,
  setTimeout() {},
  clearTimeout() {},
  console
};
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
try {
  vm.runInContext(configCode, sandbox, { filename: "assets/site-config.js" });
} catch (error) {
  fail(`assets/site-config.js 无法执行：${error.message}`);
}

const config = sandbox.window.YUHUA_SITE || {};
if (config.publicDirectContact !== false) {
  fail("YUHUA_SITE.publicDirectContact 必须为 false");
}
for (const key of ["phone", "mobile", "wechat", "tel"]) {
  if (String(config[key] || "").trim()) {
    fail(`YUHUA_SITE.${key} 不得保存直接联系方式`);
  }
}

if (failures.length) {
  console.error("无直接联系方式策略检查失败：");
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log("无直接联系方式策略检查通过：公开文件未保存手机号，首页无拨号或复制号码入口，配置明确关闭直接联系方式。");
