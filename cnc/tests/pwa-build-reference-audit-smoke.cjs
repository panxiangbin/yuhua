'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(ROOT, 'cnc', 'test-results', 'pwa-build-reference-audit');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'report.json');
const VERSION_RE = /2026\d{4}-pwa\d+/g;
const ACTIVE_PIN_PATTERNS = [
  /const\s+BUILD\s*=\s*['"]([^'"]+)['"]/,
  /const\s+EXPECTED\s*=\s*['"]([^'"]+)['"]/,
  /const\s+PWA_BUILD\s*=\s*['"]([^'"]+)['"]/,
  /const\s+CURRENT_PWA_BUILD\s*=\s*['"]([^'"]+)['"]/,
  /branchTargetPwaBuild\s*=\s*['"]([^'"]+)['"]/
];

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'test-results', '.git'].includes(entry.name)) continue;
      files.push(...walk(full));
    } else if (/\.(?:cjs|js|html|json|md|ya?ml)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function rel(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, '/');
}

function lineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

function fail(message) {
  throw new Error(message);
}

function main() {
  const infoPath = path.join(ROOT, 'cnc', 'build-info.json');
  const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
  const current = String(info.pwaBuild || '');
  if (!/^2026\d{4}-pwa\d+$/.test(current)) fail(`build-info PWA构建格式无效：${current}`);

  const scanFiles = [
    ...walk(path.join(ROOT, 'cnc')),
    ...walk(path.join(ROOT, '.github', 'workflows')).filter(file => path.basename(file).startsWith('cnc-'))
  ];
  const references = [];
  const activePins = [];

  for (const file of scanFiles) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(VERSION_RE)) {
      references.push({ file: rel(file), line: lineNumber(source, match.index), version: match[0] });
    }
    for (const pattern of ACTIVE_PIN_PATTERNS) {
      const match = source.match(pattern);
      if (match) activePins.push({ file: rel(file), version: match[1], pattern: String(pattern) });
    }
  }

  const previousPins = references.filter(item => {
    const source = fs.readFileSync(path.join(ROOT, item.file), 'utf8');
    const line = source.split(/\r?\n/)[item.line - 1] || '';
    return /PREVIOUS_PWA_BUILD|previousPwaBuild|publicPwaBuild|previousBuild/.test(line);
  });
  const allowedVersions = new Set([current, ...previousPins.map(item => item.version)]);
  const unexpectedReferences = references.filter(item => !allowedVersions.has(item.version));
  const staleActivePins = activePins.filter(item => item.version !== current);

  const requiredActiveFiles = [
    'cnc/sw.js',
    'cnc/pwa-status.html',
    'cnc/pwa-self-test.html',
    'cnc/tests/mobile-pwa-offline-cache-smoke.cjs',
    'cnc/tests/mobile-pwa-profile-bfcache-smoke.cjs',
    'cnc/tests/mobile-pwa-upgrade-data-smoke.cjs'
  ];
  const missingActivePins = requiredActiveFiles.filter(file => !activePins.some(item => item.file === file));

  const report = {
    generatedAt: new Date().toISOString(),
    commitSha: process.env.GITHUB_SHA || null,
    currentPwaBuild: current,
    allowedVersions: [...allowedVersions].sort(),
    scannedFileCount: scanFiles.length,
    referenceCount: references.length,
    activePinCount: activePins.length,
    references: references.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line),
    activePins: activePins.sort((a, b) => a.file.localeCompare(b.file)),
    previousPins,
    staleActivePins,
    unexpectedReferences,
    missingActivePins,
    passed: staleActivePins.length === 0 && unexpectedReferences.length === 0 && missingActivePins.length === 0
  };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));

  if (missingActivePins.length) fail(`缺少PWA主动构建引用：${missingActivePins.join('、')}`);
  if (staleActivePins.length) fail(`发现过期主动构建引用：${staleActivePins.map(item => `${item.file}=${item.version}`).join('、')}`);
  if (unexpectedReferences.length) fail(`发现未声明PWA构建引用：${unexpectedReferences.map(item => `${item.file}:${item.line}=${item.version}`).join('、')}`);

  console.log(`CNC PWA构建引用审计通过：${references.length}处引用、${activePins.length}处主动构建针均与${current}一致。`);
}

try {
  main();
} catch (error) {
  const fallback = path.join(OUTPUT_DIR, 'error.txt');
  fs.writeFileSync(fallback, String(error && error.stack ? error.stack : error));
  console.error(error);
  process.exitCode = 1;
}
