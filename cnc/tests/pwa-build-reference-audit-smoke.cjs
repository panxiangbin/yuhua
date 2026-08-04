'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(ROOT, 'cnc', 'test-results', 'pwa-build-reference-audit');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'report.json');
const PWA_VERSION_RE = /\b2026\d{4}-pwa\d+\b/g;
const PWA_VERSION_FORMAT = /^2026\d{4}-pwa\d+$/;

const CURRENT_PIN_SPECS = [
  { file: 'cnc/sw.js', label: 'Service Worker缓存构建', pattern: /\bconst\s+BUILD\s*=\s*['"](2026\d{4}-pwa\d+)['"]/ },
  { file: 'cnc/pwa-status.html', label: 'PWA状态页期望构建', pattern: /\bconst\s+EXPECTED\s*=\s*['"](2026\d{4}-pwa\d+)['"]/ },
  { file: 'cnc/pwa-self-test.html', label: 'PWA自检页期望构建', pattern: /\bconst\s+EXPECTED\s*=\s*['"](2026\d{4}-pwa\d+)['"]/ },
  { file: 'cnc/tests/mobile-pwa-offline-cache-smoke.cjs', label: '冷离线浏览器门禁', pattern: /\bconst\s+PWA_BUILD\s*=\s*['"](2026\d{4}-pwa\d+)['"]/ },
  { file: 'cnc/tests/mobile-pwa-profile-bfcache-smoke.cjs', label: 'BFCache浏览器门禁', pattern: /\bconst\s+PWA_BUILD\s*=\s*['"](2026\d{4}-pwa\d+)['"]/ },
  { file: 'cnc/tests/mobile-pwa-upgrade-data-smoke.cjs', label: '升级数据保护当前构建', pattern: /\bconst\s+CURRENT_PWA_BUILD\s*=\s*['"](2026\d{4}-pwa\d+)['"]/ },
  { file: 'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs', label: 'AI老师离线核心Pages目标', pattern: /\bconst\s+branchTargetPwaBuild\s*=\s*['"](2026\d{4}-pwa\d+)['"]/ },
  { file: 'cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs', label: '起点测评离线Pages目标', pattern: /\bconst\s+branchTargetPwaBuild\s*=\s*['"](2026\d{4}-pwa\d+)['"]/ },
  { file: 'cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs', label: '训练营路线Pages目标', pattern: /\bconst\s+expectedPwaBuild\s*=\s*['"](2026\d{4}-pwa\d+)['"]/ }
];

const DECLARED_LEGACY_REFERENCES = [
  {
    file: 'cnc/runtime-env-detector.js',
    version: '20260728-pwa3',
    reason: '早期原生注册启动诊断标记，不参与Service Worker缓存命名或构建判定'
  },
  {
    file: 'cnc/import-test.js',
    version: '20260728-pwa3',
    reason: '兼容层备用注册诊断标记，不参与ServiceWorker缓存命名或构建判定'
  }
];

const PREVIOUS_PIN_SPEC = {
  file: 'cnc/tests/mobile-pwa-upgrade-data-smoke.cjs',
  label: '升级数据保护上一构建',
  pattern: /\bconst\s+PREVIOUS_PWA_BUILD\s*=\s*['"](2026\d{4}-pwa\d+)['"]/ 
};

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

function readText(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) fail(`缺少PWA构建审计文件：${relativePath}`);
  return fs.readFileSync(absolutePath, 'utf8');
}

function readPin(spec) {
  const source = readText(spec.file);
  const match = source.match(spec.pattern);
  if (!match) fail(`缺少PWA构建针：${spec.file}（${spec.label}）`);
  return { file: spec.file, label: spec.label, version: match[1] };
}

function referenceScope(file) {
  if (file === 'cnc/tests/pwa-build-reference-audit-smoke.cjs') return 'audit-governance';
  if (file.startsWith('cnc/docs/')) return 'documentation-history';
  if (file.startsWith('.github/workflows/')) return 'workflow';
  if (file.startsWith('cnc/tests/')) return 'test';
  return 'runtime';
}

function main() {
  const info = JSON.parse(readText('cnc/build-info.json'));
  const current = String(info.pwaBuild || '');
  if (!PWA_VERSION_FORMAT.test(current)) fail(`build-info PWA构建格式无效：${current}`);

  const previousPin = readPin(PREVIOUS_PIN_SPEC);
  const previous = previousPin.version;
  if (!PWA_VERSION_FORMAT.test(previous)) fail(`上一PWA构建格式无效：${previous}`);
  if (previous === current) fail(`上一PWA构建不能等于当前构建：${previous}`);

  const currentPins = CURRENT_PIN_SPECS.map(readPin);
  const staleActivePins = currentPins.filter(item => item.version !== current);

  const scanFiles = [
    ...walk(path.join(ROOT, 'cnc')),
    ...walk(path.join(ROOT, '.github', 'workflows')).filter(file => path.basename(file).startsWith('cnc-'))
  ];
  const references = [];

  for (const file of scanFiles) {
    const source = fs.readFileSync(file, 'utf8');
    const relativePath = rel(file);
    for (const match of source.matchAll(PWA_VERSION_RE)) {
      references.push({
        file: relativePath,
        line: lineNumber(source, match.index),
        version: match[0],
        scope: referenceScope(relativePath)
      });
    }
  }

  const allowedVersions = new Set([current, previous]);
  const operationalReferences = references.filter(item => !['documentation-history', 'audit-governance'].includes(item.scope));
  const historicalReferences = references.filter(item => item.scope === 'documentation-history');
  const governanceReferences = references.filter(item => item.scope === 'audit-governance');
  const legacyReferences = operationalReferences.filter(item => DECLARED_LEGACY_REFERENCES.some(legacy => legacy.file === item.file && legacy.version === item.version));
  const unusedLegacyAllowances = DECLARED_LEGACY_REFERENCES.filter(legacy => !legacyReferences.some(item => item.file === legacy.file && item.version === legacy.version));
  const unexpectedReferences = operationalReferences.filter(item => {
    if (allowedVersions.has(item.version)) return false;
    return !DECLARED_LEGACY_REFERENCES.some(legacy => legacy.file === item.file && legacy.version === item.version);
  });
  const currentReferenceCount = operationalReferences.filter(item => item.version === current).length;
  const previousReferenceCount = operationalReferences.filter(item => item.version === previous).length;

  const report = {
    generatedAt: new Date().toISOString(),
    commitSha: process.env.GITHUB_SHA || null,
    currentPwaBuild: current,
    previousPwaBuild: previous,
    allowedVersions: [...allowedVersions],
    scannedFileCount: scanFiles.length,
    referenceCount: references.length,
    operationalReferenceCount: operationalReferences.length,
    historicalReferenceCount: historicalReferences.length,
    governanceReferenceCount: governanceReferences.length,
    legacyReferenceCount: legacyReferences.length,
    currentReferenceCount,
    previousReferenceCount,
    activePinCount: currentPins.length,
    currentPins,
    previousPin,
    references: references.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line),
    historicalReferences,
    governanceReferences,
    legacyReferences: legacyReferences.map(item => Object.assign({}, item, { reason: DECLARED_LEGACY_REFERENCES.find(legacy => legacy.file === item.file && legacy.version === item.version).reason })),
    unusedLegacyAllowances,
    staleActivePins,
    unexpectedReferences,
    passed: staleActivePins.length === 0 && unexpectedReferences.length === 0 && unusedLegacyAllowances.length === 0
  };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));

  if (staleActivePins.length) {
    fail(`发现过期PWA主动构建针：${staleActivePins.map(item => `${item.file}=${item.version}`).join('、')}`);
  }
  if (unusedLegacyAllowances.length) {
    fail(`发现未使用的PWA历史引用豁免：${unusedLegacyAllowances.map(item => `${item.file}=${item.version}`).join('、')}`);
  }
  if (unexpectedReferences.length) {
    fail(`发现未声明的运行中PWA构建引用：${unexpectedReferences.map(item => `${item.file}:${item.line}=${item.version}`).join('、')}`);
  }

  console.log(`CNC PWA构建引用审计通过：${currentPins.length}处当前构建针=${current}，上一版本=${previous}，运行引用${operationalReferences.length}处，受控历史引用${legacyReferences.length}处。`);
}

try {
  main();
} catch (error) {
  const fallback = path.join(OUTPUT_DIR, 'error.txt');
  fs.writeFileSync(fallback, String(error && error.stack ? error.stack : error));
  console.error(error);
  process.exitCode = 1;
}
