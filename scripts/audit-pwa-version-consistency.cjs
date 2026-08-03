#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const files = {
  serviceWorker: path.join(root, 'cnc', 'sw.js'),
  buildInfo: path.join(root, 'cnc', 'build-info.json'),
  statusPage: path.join(root, 'cnc', 'pwa-status.html'),
  selfTestPage: path.join(root, 'cnc', 'pwa-self-test.html'),
};

function read(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`缺少文件: ${path.relative(root, file)}`);
  }
  return fs.readFileSync(file, 'utf8');
}

function matchVersion(text, pattern, label) {
  const match = text.match(pattern);
  if (!match || !match[1]) {
    throw new Error(`无法读取 ${label} 的 PWA 版本针`);
  }
  return match[1];
}

const swText = read(files.serviceWorker);
const buildInfoText = read(files.buildInfo);
const statusText = read(files.statusPage);
const selfTestText = read(files.selfTestPage);

let buildInfo;
try {
  buildInfo = JSON.parse(buildInfoText);
} catch (error) {
  throw new Error(`cnc/build-info.json 不是有效 JSON: ${error.message}`);
}

const versions = {
  serviceWorker: matchVersion(
    swText,
    /\bconst\s+BUILD\s*=\s*['"](2026\d{4}-pwa\d+)['"]/,
    'cnc/sw.js'
  ),
  buildInfo: String(buildInfo.pwaBuild || '').trim(),
  statusPage: matchVersion(
    statusText,
    /\bconst\s+EXPECTED\s*=\s*['"](2026\d{4}-pwa\d+)['"]/,
    'cnc/pwa-status.html'
  ),
  selfTestPage: matchVersion(
    selfTestText,
    /\bconst\s+EXPECTED\s*=\s*['"](2026\d{4}-pwa\d+)['"]/,
    'cnc/pwa-self-test.html'
  ),
};

if (!/^2026\d{4}-pwa\d+$/.test(versions.buildInfo)) {
  throw new Error(`cnc/build-info.json 的 pwaBuild 格式无效: ${versions.buildInfo || '缺失'}`);
}

const distinctVersions = new Set(Object.values(versions));
if (distinctVersions.size !== 1) {
  console.error('PWA 版本不一致:');
  for (const [source, version] of Object.entries(versions)) {
    console.error(`- ${source}: ${version}`);
  }
  process.exit(1);
}

const statusRequirements = [
  { name: '显示页面期望构建', regex: /id=["']expected["']/ },
  { name: '读取 Service Worker 运行构建', regex: /type\s*===?\s*['"]CNC_SW_BUILD['"]|type:\s*['"]GET_BUILD['"]/ },
  { name: '核对静态缓存', regex: /cnc-static-|staticName|static-cache/ },
  { name: '核对运行时缓存', regex: /cnc-runtime-|runtimeName|runtime-cache/ },
  { name: '版本不一致提示', regex: /版本尚未完全一致|版本不一致/ },
  { name: '状态读取失败提示', regex: /状态读取失败|构建号读取失败|版本读取失败/ },
];

for (const requirement of statusRequirements) {
  if (!requirement.regex.test(statusText)) {
    throw new Error(`cnc/pwa-status.html 缺少版本一致性要求: ${requirement.name}`);
  }
}

const selfTestRequirements = [
  { name: '运行构建号检查', regex: /运行构建号一致/ },
  { name: '静态缓存版本检查', regex: /静态缓存版本存在/ },
  { name: '运行时缓存版本检查', regex: /运行时缓存版本存在/ },
  { name: '核心离线资源检查', regex: /核心离线资源完整/ },
  { name: '公网构建标记检查', regex: /公网构建标记与PWA一致/ },
];

for (const requirement of selfTestRequirements) {
  if (!requirement.regex.test(selfTestText)) {
    throw new Error(`cnc/pwa-self-test.html 缺少版本一致性要求: ${requirement.name}`);
  }
}

const directContactPatterns = [
  { name: 'tel 链接', regex: /href\s*=\s*["']\s*tel:/i },
  { name: '微信号字段', regex: /(?:微信号|微信客服|加微信)/i },
  { name: '复制号码按钮', regex: /(?:复制(?:电话|手机号|号码)|copy(?:Phone|Mobile|Number))/i },
  { name: '中国大陆手机号', regex: /(?:^|\D)1[3-9]\d{9}(?:\D|$)/ },
];

for (const [source, text] of Object.entries({
  serviceWorker: swText,
  buildInfo: buildInfoText,
  statusPage: statusText,
  selfTestPage: selfTestText,
})) {
  for (const pattern of directContactPatterns) {
    if (pattern.regex.test(text)) {
      throw new Error(`${source} 检出禁止的直接联系方式模式: ${pattern.name}`);
    }
  }
}

console.log(`PWA 显式版本针一致: ${versions.buildInfo}`);
console.log('状态页和自检页版本、缓存与运行构建契约检查通过');
console.log('直接联系方式检查通过');
