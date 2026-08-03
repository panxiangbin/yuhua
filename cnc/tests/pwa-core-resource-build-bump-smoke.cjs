'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(ROOT, 'cnc', 'test-results', 'pwa-core-resource-build-bump');
const REPORT_PATH = path.join(OUTPUT_DIR, 'report.json');
const ERROR_PATH = path.join(OUTPUT_DIR, 'error.txt');
const LOG_PATH = path.join(OUTPUT_DIR, 'audit.log');
const ZERO_SHA = /^0{40}$/;
const BUILD_PATTERN = /^2026\d{4}-pwa\d+$/;

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trimEnd();
}

function requireCommit(sha, label) {
  if (!sha || ZERO_SHA.test(sha)) throw new Error(`${label}提交SHA无效：${sha || '空'}`);
  try {
    git(['cat-file', '-e', `${sha}^{commit}`]);
  } catch {
    throw new Error(`${label}提交不可读取：${sha}。工作流必须使用fetch-depth: 0。`);
  }
}

function showText(sha, relativePath) {
  try {
    return git(['show', `${sha}:${relativePath}`]);
  } catch (error) {
    throw new Error(`无法读取${sha.slice(0, 12)}中的${relativePath}：${error.stderr || error.message}`);
  }
}

function readText(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) throw new Error(`当前提交缺少文件：${relativePath}`);
  return fs.readFileSync(absolutePath, 'utf8');
}

function parseServiceWorker(source, label) {
  const build = source.match(/\bconst\s+BUILD\s*=\s*['"](2026\d{4}-pwa\d+)['"]/)?.[1] || '';
  if (!BUILD_PATTERN.test(build)) throw new Error(`${label}缺少合法PWA构建号：${build || '未找到'}`);
  const block = source.match(/\bconst\s+REQUIRED_CORE_PATHS\s*=\s*\[([\s\S]*?)\];/)?.[1] || '';
  const corePaths = [...block.matchAll(/['"](\.\/[^'"]+)['"]/g)].map(match => match[1]);
  if (!corePaths.length) throw new Error(`${label}未读取到REQUIRED_CORE_PATHS`);
  if (new Set(corePaths).size !== corePaths.length) throw new Error(`${label}核心预缓存清单存在重复项`);
  return { build, corePaths };
}

function parseBuildInfo(source, label) {
  let data;
  try {
    data = JSON.parse(source.replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new Error(`${label}不是合法JSON：${error.message}`);
  }
  if (data.app !== 'cnc-training-platform') throw new Error(`${label}应用标识错误：${data.app}`);
  if (!BUILD_PATTERN.test(String(data.pwaBuild || ''))) throw new Error(`${label}PWA构建号无效：${data.pwaBuild}`);
  return data;
}

function normalizeCorePath(item) {
  const normalized = path.posix.normalize(item.replace(/^\.\//, ''));
  if (!normalized || normalized.startsWith('../') || path.posix.isAbsolute(normalized)) {
    throw new Error(`核心预缓存路径越界：${item}`);
  }
  return `cnc/${normalized}`;
}

function parseBuildOrder(build) {
  const match = build.match(/^(\d{8})-pwa(\d+)$/);
  if (!match) throw new Error(`PWA构建号无法排序：${build}`);
  return { date: Number(match[1]), sequence: Number(match[2]) };
}

function isStrictlyNewer(previous, current) {
  const left = parseBuildOrder(previous);
  const right = parseBuildOrder(current);
  return right.date > left.date || (right.date === left.date && right.sequence > left.sequence);
}

function sha256(source) {
  return crypto.createHash('sha256').update(source).digest('hex');
}

function main() {
  const baseSha = String(process.env.CNC_BASE_SHA || '').trim();
  const headSha = String(process.env.CNC_HEAD_SHA || process.env.GITHUB_SHA || '').trim();
  requireCommit(baseSha, '基线');
  requireCommit(headSha, '当前');

  const baseSwSource = showText(baseSha, 'cnc/sw.js');
  const currentSwSource = readText('cnc/sw.js');
  const baseBuildInfoSource = showText(baseSha, 'cnc/build-info.json');
  const currentBuildInfoSource = readText('cnc/build-info.json');
  const baseSw = parseServiceWorker(baseSwSource, '基线Service Worker');
  const currentSw = parseServiceWorker(currentSwSource, '当前Service Worker');
  const baseBuildInfo = parseBuildInfo(baseBuildInfoSource, '基线build-info.json');
  const currentBuildInfo = parseBuildInfo(currentBuildInfoSource, '当前build-info.json');

  if (baseBuildInfo.pwaBuild !== baseSw.build) {
    throw new Error(`基线构建针已漂移：sw=${baseSw.build}，build-info=${baseBuildInfo.pwaBuild}`);
  }
  if (currentBuildInfo.pwaBuild !== currentSw.build) {
    throw new Error(`当前构建针已漂移：sw=${currentSw.build}，build-info=${currentBuildInfo.pwaBuild}`);
  }

  const changedFiles = git(['diff', '--name-only', '--diff-filter=ACDMRTUXB', baseSha, headSha])
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);
  const changedSet = new Set(changedFiles);
  const baseCoreFiles = baseSw.corePaths.map(normalizeCorePath);
  const currentCoreFiles = currentSw.corePaths.map(normalizeCorePath);
  const protectedFiles = [...new Set(['cnc/sw.js', ...baseCoreFiles, ...currentCoreFiles])].sort();
  const changedProtectedFiles = protectedFiles.filter(file => changedSet.has(file));
  const coreListChanged = JSON.stringify(baseSw.corePaths) !== JSON.stringify(currentSw.corePaths);
  const buildChanged = baseSw.build !== currentSw.build;
  const bumpRequired = changedProtectedFiles.length > 0 || coreListChanged;

  const errors = [];
  if (bumpRequired && !buildChanged) {
    errors.push(`核心离线资源或预缓存清单发生变化，但PWA构建号仍为${currentSw.build}`);
  }
  if (buildChanged && !isStrictlyNewer(baseSw.build, currentSw.build)) {
    errors.push(`PWA构建号必须严格递增：${baseSw.build} -> ${currentSw.build}`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseSha,
    headSha,
    basePwaBuild: baseSw.build,
    currentPwaBuild: currentSw.build,
    buildChanged,
    bumpRequired,
    coreListChanged,
    baseCorePaths: baseSw.corePaths,
    currentCorePaths: currentSw.corePaths,
    protectedFiles,
    changedFiles,
    changedProtectedFiles,
    sourceDigests: {
      baseServiceWorker: sha256(baseSwSource),
      currentServiceWorker: sha256(currentSwSource),
      baseBuildInfo: sha256(baseBuildInfoSource),
      currentBuildInfo: sha256(currentBuildInfoSource)
    },
    errors,
    passed: errors.length === 0
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  const logLines = [
    `基线：${baseSha}`,
    `当前：${headSha}`,
    `PWA构建：${baseSw.build} -> ${currentSw.build}`,
    `核心清单变化：${coreListChanged ? '是' : '否'}`,
    `变更核心文件：${changedProtectedFiles.length ? changedProtectedFiles.join('、') : '无'}`,
    `是否必须提升构建：${bumpRequired ? '是' : '否'}`,
    `结果：${report.passed ? '通过' : '失败'}`
  ];
  fs.writeFileSync(LOG_PATH, `${logLines.join('\n')}\n`);

  if (errors.length) throw new Error(errors.join('；'));
  console.log(`CNC PWA核心资源构建提升审计通过：${baseSw.build} -> ${currentSw.build}，核心变更${changedProtectedFiles.length}项。`);
}

try {
  main();
} catch (error) {
  const message = String(error && error.stack ? error.stack : error);
  fs.writeFileSync(ERROR_PATH, message);
  console.error(error);
  process.exitCode = 1;
}
