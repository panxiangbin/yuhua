#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const files = {
  serviceWorker: path.join(root, 'cnc', 'sw.js'),
  buildInfo: path.join(root, 'cnc', 'build-info.json'),
  statusPage: path.join(root, 'cnc', 'pwa-status.html'),
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
    throw new Error(`无法读取 ${label} 的 PWA 版本`);
  }
  return match[1];
}

const swText = read(files.serviceWorker);
const buildInfoText = read(files.buildInfo);
const statusText = read(files.statusPage);

let buildInfo;
try {
  buildInfo = JSON.parse(buildInfoText);
} catch (error) {
  throw new Error(`cnc/build-info.json 不是有效 JSON: ${error.message}`);
}

const versions = {
  serviceWorker: matchVersion(
    swText,
    /(?:const|let|var)\s+(?:BUILD|CACHE_VERSION|PWA_BUILD)\s*=\s*['"]([^'"]+)['"]/,
    'cnc/sw.js'
  ),
  buildInfo: String(buildInfo.pwaBuild || '').trim(),
  statusPage: matchVersion(
    statusText,
    /(?:const|let|var)\s+EXPECTED\s*=\s*['"]([^'"]+)['"]/,
    'cnc/pwa-status.html'
  ),
};

if (!versions.buildInfo) {
  throw new Error('cnc/build-info.json 缺少 pwaBuild');
}

const uniqueVersions = new Set(Object.values(versions));
if (uniqueVersions.size !== 1) {
  console.error('PWA 版本不一致:');
  for (const [source, version] of Object.entries(versions)) {
    console.error(`- ${source}: ${version}`);
  }
  process.exit(1);
}

const directContactPatterns = [
  { name: 'tel 链接', regex: /href\s*=\s*["']\s*tel:/i },
  { name: '微信号字段', regex: /(?:微信号|微信客服|加微信)/i },
  { name: '复制号码按钮', regex: /(?:复制(?:电话|手机号|号码)|copy(?:Phone|Mobile|Number))/i },
  { name: '中国大陆手机号', regex: /(?:^|\D)1[3-9]\d{9}(?:\D|$)/ },
];

for (const [source, text] of Object.entries({ serviceWorker: swText, buildInfo: buildInfoText, statusPage: statusText })) {
  for (const pattern of directContactPatterns) {
    if (pattern.regex.test(text)) {
      throw new Error(`${source} 检出禁止的直接联系方式模式: ${pattern.name}`);
    }
  }
}

console.log(`PWA 版本一致: ${versions.serviceWorker}`);
console.log('直接联系方式检查通过');
