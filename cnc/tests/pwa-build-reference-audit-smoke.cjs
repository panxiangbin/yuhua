'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(ROOT, 'cnc', 'test-results', 'pwa-build-reference-audit');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'report.json');
const PWA_VERSION_RE = /\b2026\d{4}-pwa\d+\b/g;
const PWA_VERSION_FORMAT = /^2026\d{4}-pwa\d+$/;
const CACHE_REVISION_FORMAT = /^2026\d{4}-learning\d+$/;

const CURRENT_PIN_SPECS = [
  { file: 'cnc/sw.js', label: 'Service Worker缓存构建', pattern: /\bconst\s+BUILD\s*=\s*['"](2026\d{4}-pwa\d+)['"]/ },
  { file: 'cnc/pwa-status.html', label: 'PWA状态页期望构建', pattern: /\bconst\s+EXPECTED\s*=\s*['"](2026\d{4}-pwa\d+)['"]/ },
  { file: 'cnc/pwa-self-test.html', label: 'PWA自检页期望构建', pattern: /\bconst\s+EXPECTED\s*=\s*['"](2026\d{4}-pwa\d+)['"]/ },
  { file: 'cnc/MOBILE_LEARNING_MEDIA_PROGRESS.md', label: '学习媒体进度受控目标', pattern: /当前受控目标版本\s+`(2026\d{4}-pwa\d+)\s*\/\s*2026\d{4}-learning\d+`/ },
  { file: 'cnc/tests/mobile-pwa-offline-cache-smoke.cjs', label: '冷离线浏览器门禁', pattern: /\bconst\s+PWA_BUILD\s*=\s*['"](2026\d{4}-pwa\d+)['"]/ },
  { file: 'cnc/tests/mobile-pwa-profile-bfcache-smoke.cjs', label: 'BFCache浏览器门禁', pattern: /\bconst\s+PWA_BUILD\s*=\s*['"](2026\d{4}-pwa\d+)['"]/ },
  { file: 'cnc/tests/mobile-pwa-upgrade-data-smoke.cjs', label: '升级数据保护当前构建', pattern: /\bconst\s+CURRENT_PWA_BUILD\s*=\s*['"](2026\d{4}-pwa\d+)['"]/ },
  { file: 'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs', label: 'AI老师离线核心Pages目标', pattern: /\bconst\s+branchTargetPwaBuild\s*=\s*['"](2026\d{4}-pwa\d+)['"]/ },
  { file: 'cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs', label: '起点测评离线Pages目标', pattern: /\bconst\s+branchTargetPwaBuild\s*=\s*['"](2026\d{4}-pwa\d+)['"]/ },
  { file: 'cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs', label: '训练营路线Pages目标', pattern: /\bconst\s+expectedPwaBuild\s*=\s*['"](2026\d{4}-pwa\d+)['"]/ }
];

const CONTROLLED_PUBLIC_PIN_SPECS = [
  { file: 'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs', label: 'AI老师离线核心Pages受控公网基线', pattern: /\bconst\s+controlledPublicPwaBuild\s*=\s*['"](2026\d{4}-pwa\d+)['"]/ },
  { file: 'cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs', label: '起点测评离线Pages受控公网基线', pattern: /\bconst\s+controlledPublicPwaBuild\s*=\s*['"](2026\d{4}-pwa\d+)['"]/ },
  { file: 'cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs', label: '训练营路线Pages受控公网基线', pattern: /\bconst\s+controlledPublicPwaBuild\s*=\s*['"](2026\d{4}-pwa\d+)['"]/ }
];

const MEDIA_PROGRESS_SPEC = {
  file: 'cnc/MOBILE_LEARNING_MEDIA_PROGRESS.md',
  pattern: /当前受控目标版本\s+`(2026\d{4}-pwa\d+)\s*\/\s*(2026\d{4}-learning\d+)`/
};

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

function pwaOrder(version) {
  const match = String(version).match(/^(2026\d{4})-pwa(\d+)$/);
  if (!match) fail(`PWA构建无法排序：${version}`);
  return Number(match[1]) * 100000 + Number(match[2]);
}

function referenceScope(file) {
  if (file === 'cnc/tests/pwa-build-reference-audit-smoke.cjs') return 'audit-governance';
  if (file === 'cnc/MOBILE_HOME_REFACTOR_PROGRESS.md') return 'documentation-history';
  if (file.startsWith('cnc/docs/')) return 'documentation-history';
  if (file.startsWith('.github/workflows/')) return 'workflow';
  if (file.startsWith('cnc/tests/')) return 'test';
  return 'runtime';
}

function main() {
  const info = JSON.parse(readText('cnc/build-info.json'));
  const current = String(info.pwaBuild || '');
  const currentCacheRevision = String(info.cacheRevision || '');
  if (!PWA_VERSION_FORMAT.test(current)) fail(`build-info PWA构建格式无效：${current}`);
  if (!CACHE_REVISION_FORMAT.test(currentCacheRevision)) fail(`build-info缓存修订格式无效：${currentCacheRevision}`);

  const mediaProgressSource = readText(MEDIA_PROGRESS_SPEC.file);
  const mediaTargetMatch = mediaProgressSource.match(MEDIA_PROGRESS_SPEC.pattern);
  if (!mediaTargetMatch) fail('学习媒体进度文档缺少“当前受控目标版本 PWA / learning”声明');
  const mediaTarget = { file: MEDIA_PROGRESS_SPEC.file, pwaBuild: mediaTargetMatch[1], cacheRevision: mediaTargetMatch[2] };
  if (mediaTarget.pwaBuild !== current || mediaTarget.cacheRevision !== currentCacheRevision) {
    fail(`学习媒体进度目标漂移：${mediaTarget.pwaBuild}/${mediaTarget.cacheRevision}，期望${current}/${currentCacheRevision}`);
  }

  const previousPin = readPin(PREVIOUS_PIN_SPEC);
  const previous = previousPin.version;
  if (!PWA_VERSION_FORMAT.test(previous)) fail(`上一PWA构建格式无效：${previous}`);
  if (previous === current) fail(`上一PWA构建不能等于当前构建：${previous}`);

  const controlledPublicPins = CONTROLLED_PUBLIC_PIN_SPECS.map(readPin);
  const controlledPublicVersions = [...new Set(controlledPublicPins.map(item => item.version))];
  if (controlledPublicVersions.length !== 1) fail(`受控公网PWA基线不一致：${controlledPublicPins.map(item => `${item.file}=${item.version}`).join('、')}`);
  const controlledPublic = controlledPublicVersions[0];
  if (!PWA_VERSION_FORMAT.test(controlledPublic)) fail(`受控公网PWA构建格式无效：${controlledPublic}`);
  if (controlledPublic === current || controlledPublic === previous) fail(`受控公网PWA基线必须独立于当前和历史升级构建：${controlledPublic}`);
  if (!(pwaOrder(current) > pwaOrder(controlledPublic) && pwaOrder(controlledPublic) > pwaOrder(previous))) {
    fail(`PWA三代构建顺序异常：当前${current}、受控公网${controlledPublic}、历史升级${previous}`);
  }

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

  const allowedVersions = new Set([current, controlledPublic, previous]);
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
  const controlledPublicReferenceCount = operationalReferences.filter(item => item.version === controlledPublic).length;
  const previousReferenceCount = operationalReferences.filter(item => item.version === previous).length;

  const report = {
    generatedAt: new Date().toISOString(),
    commitSha: process.env.GITHUB_SHA || null,
    currentPwaBuild: current,
    currentCacheRevision,
    controlledPublicPwaBuild: controlledPublic,
    previousPwaBuild: previous,
    mediaTarget,
    allowedVersions: [...allowedVersions],
    scannedFileCount: scanFiles.length,
    referenceCount: references.length,
    operationalReferenceCount: operationalReferences.length,
    historicalReferenceCount: historicalReferences.length,
    governanceReferenceCount: governanceReferences.length,
    legacyReferenceCount: legacyReferences.length,
    currentReferenceCount,
    controlledPublicReferenceCount,
    previousReferenceCount,
    controlledPublicPinCount: controlledPublicPins.length,
    controlledPublicPins,
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

  console.log(`CNC PWA构建引用审计通过：${currentPins.length}处当前构建针=${current}，缓存修订=${currentCacheRevision}，受控公网基线=${controlledPublic}，历史升级版本=${previous}，运行引用${operationalReferences.length}处，受控历史引用${legacyReferences.length}处。`);
}

try {
  main();
} catch (error) {
  const fallback = path.join(OUTPUT_DIR, 'error.txt');
  fs.writeFileSync(fallback, String(error && error.stack ? error.stack : error));
  console.error(error);
  process.exitCode = 1;
}
