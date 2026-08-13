const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cncRoot = path.join(root, 'cnc');
const artifactsDir = path.join(root, 'test-artifacts');
const expectedWorkerPath = '/cnc/sw.js';
const expectedScope = '/cnc/';

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [full];
  });
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function isProductionSource(file) {
  const filePath = relative(file);
  return !filePath.startsWith('cnc/tests/');
}

function fail(message, details = {}) {
  return { level: 'error', message, ...details };
}

const findings = [];
const checkedFiles = [];

const workerFile = path.join(cncRoot, 'sw.js');
const manifestFile = path.join(cncRoot, 'manifest.webmanifest');
const buildInfoFile = path.join(cncRoot, 'build-info.json');

for (const required of [workerFile, manifestFile, buildInfoFile]) {
  if (!fs.existsSync(required)) findings.push(fail('PWA 核心文件缺失', { file: relative(required) }));
}

let expectedBuild = '';
if (fs.existsSync(buildInfoFile)) {
  try {
    const buildInfo = JSON.parse(fs.readFileSync(buildInfoFile, 'utf8'));
    expectedBuild = String(buildInfo.pwaBuild || '').trim();
    if (!expectedBuild) findings.push(fail('build-info.json 缺少 pwaBuild', { file: relative(buildInfoFile) }));
  } catch (error) {
    findings.push(fail('build-info.json 无法解析', { file: relative(buildInfoFile), error: error.message }));
  }
}

if (fs.existsSync(workerFile)) {
  const workerSource = fs.readFileSync(workerFile, 'utf8');
  checkedFiles.push(relative(workerFile));
  if (!workerSource.includes('addEventListener("install"') && !workerSource.includes("addEventListener('install'")) {
    findings.push(fail('Service Worker 缺少 install 监听器', { file: relative(workerFile) }));
  }
  if (!workerSource.includes('addEventListener("fetch"') && !workerSource.includes("addEventListener('fetch'")) {
    findings.push(fail('Service Worker 缺少 fetch 监听器', { file: relative(workerFile) }));
  }
  if (expectedBuild && !workerSource.includes(expectedBuild)) {
    findings.push(fail('Service Worker 未引用当前 pwaBuild', { file: relative(workerFile), expectedBuild }));
  }
}

const sourceFiles = walk(cncRoot)
  .filter(file => /\.(?:html|js|cjs|mjs)$/i.test(file))
  .filter(isProductionSource);
const registrations = [];
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  if (!source.includes('serviceWorker.register')) continue;
  checkedFiles.push(relative(file));
  const registerPattern = /serviceWorker\.register\(\s*(["'`])([^"'`]+)\1\s*(?:,\s*\{([\s\S]*?)\})?\s*\)/g;
  let match;
  while ((match = registerPattern.exec(source))) {
    const worker = match[2];
    const options = match[3] || '';
    const scopeMatch = options.match(/scope\s*:\s*(["'`])([^"'`]+)\1/);
    const scope = scopeMatch ? scopeMatch[2] : '(default)';
    registrations.push({ file: relative(file), worker, scope });
    const normalizedWorker = worker.startsWith('/') ? worker : `/cnc/${worker.replace(/^\.\//, '')}`;
    if (normalizedWorker !== expectedWorkerPath) {
      findings.push(fail('Service Worker 注册路径不一致', { file: relative(file), worker, expected: expectedWorkerPath }));
    }
    if (scope !== '(default)') {
      const normalizedScope = scope.startsWith('/') ? scope : `/cnc/${scope.replace(/^\.\//, '')}`;
      if (normalizedScope !== expectedScope) {
        findings.push(fail('Service Worker 注册作用域不一致', { file: relative(file), scope, expected: expectedScope }));
      }
    }
  }
}

if (!registrations.length) {
  findings.push(fail('未找到任何生产环境 Service Worker 注册调用', { root: 'cnc/', excluded: 'cnc/tests/' }));
}

const report = {
  generatedAt: new Date().toISOString(),
  expectedWorkerPath,
  expectedScope,
  expectedBuild,
  excludedPaths: ['cnc/tests/'],
  registrations,
  checkedFiles: [...new Set(checkedFiles)].sort(),
  findings,
  passed: findings.length === 0
};

fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(path.join(artifactsDir, 'pwa-registration-contract-audit.json'), JSON.stringify(report, null, 2));

if (!report.passed) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(`PWA registration contract audit passed: ${registrations.length} production registration(s), build ${expectedBuild}`);
