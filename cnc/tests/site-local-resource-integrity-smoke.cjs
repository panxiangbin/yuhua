#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '../..');
const cncRoot = path.join(root, 'cnc');
const workflowPath = path.join(root, '.github/workflows/cnc-site-local-resource-integrity-smoke.yml');
const outputDir = path.join(root, 'artifacts/site-local-resource-integrity');
const reportPath = path.join(outputDir, 'report.json');
const diagnosticPath = path.join(outputDir, 'diagnostics.txt');

const SKIP_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  'tests',
  'docs',
  'test-results',
  'artifacts',
  'coverage'
]);

// Service Worker 在运行时写入该诊断响应，它不是仓库静态文件。
const GENERATED_RUNTIME_TARGETS = new Set([
  'cnc/pwa-install-diagnostics.json'
]);

const SOURCE_EXTENSIONS = new Set(['.html', '.css', '.js', '.webmanifest']);
const TEXT_TARGET_EXTENSIONS = new Set(['.html', '.css', '.js', '.json', '.webmanifest', '.svg', '.txt', '.md']);
const IGNORE_SCHEMES = /^(?:https?:|mailto:|tel:|sms:|javascript:|data:|blob:|about:|chrome:)/i;

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRECTORIES.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute));
    else files.push(absolute);
  }
  return files;
}

function rel(absolute) {
  return path.relative(root, absolute).split(path.sep).join('/');
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function shouldIgnoreRaw(raw) {
  const value = String(raw || '').trim();
  return !value
    || value === '#'
    || value.startsWith('#')
    || value.startsWith('?')
    || value.startsWith('//')
    || IGNORE_SCHEMES.test(value)
    || value.includes('${')
    || value.includes('{{')
    || value.includes('<%')
    || value.includes('*>');
}

function normalizeLocalTarget(sourceRelative, rawReference) {
  let raw = decodeHtmlEntities(rawReference).trim();
  if (shouldIgnoreRaw(raw)) return { ignored: true };

  raw = raw.replace(/^url\((.*)\)$/i, '$1').trim().replace(/^['"]|['"]$/g, '');
  if (shouldIgnoreRaw(raw)) return { ignored: true };

  const withoutFragment = raw.split('#')[0];
  const withoutQuery = withoutFragment.split('?')[0];
  if (!withoutQuery) return { ignored: true };

  let decoded = withoutQuery;
  try { decoded = decodeURIComponent(withoutQuery); } catch {}
  decoded = decoded.replace(/\\/g, '/');

  let target;
  if (decoded.startsWith('/yuhua/cnc/')) {
    target = `cnc/${decoded.slice('/yuhua/cnc/'.length)}`;
  } else if (decoded === '/yuhua/cnc' || decoded === '/yuhua/cnc/') {
    target = 'cnc/index.html';
  } else if (decoded.startsWith('/cnc/')) {
    target = `cnc/${decoded.slice('/cnc/'.length)}`;
  } else if (decoded === '/cnc' || decoded === '/cnc/') {
    target = 'cnc/index.html';
  } else if (decoded.startsWith('/')) {
    return { outsideCnc: decoded.slice(1), raw };
  } else {
    target = path.posix.normalize(path.posix.join(path.posix.dirname(sourceRelative), decoded));
  }

  if (target.endsWith('/')) target += 'index.html';
  if (target === 'cnc') target = 'cnc/index.html';
  if (!target.startsWith('cnc/')) return { outsideCnc: target, raw };
  return { target, raw };
}

function addReference(bucket, source, raw, kind) {
  const normalized = normalizeLocalTarget(source, raw);
  if (normalized.ignored) return;
  if (normalized.outsideCnc) {
    bucket.outsideCnc.push({ source, raw: normalized.raw || raw, target: normalized.outsideCnc, kind });
    return;
  }
  bucket.local.push({ source, raw: normalized.raw || raw, target: normalized.target, kind });
}

function extractHtmlReferences(text, source, bucket) {
  const attributePattern = /\b(href|src|action|poster)\s*=\s*(["'])([\s\S]*?)\2/gi;
  let match;
  while ((match = attributePattern.exec(text))) addReference(bucket, source, match[3], `html:${match[1].toLowerCase()}`);

  const srcsetPattern = /\bsrcset\s*=\s*(["'])([\s\S]*?)\1/gi;
  while ((match = srcsetPattern.exec(text))) {
    for (const candidate of match[2].split(',')) {
      const url = candidate.trim().split(/\s+/)[0];
      addReference(bucket, source, url, 'html:srcset');
    }
  }

  const cssUrlPattern = /url\(\s*(["']?)([^)'"\s]+)\1\s*\)/gi;
  while ((match = cssUrlPattern.exec(text))) addReference(bucket, source, match[2], 'html:inline-css-url');
}

function extractCssReferences(text, source, bucket) {
  let match;
  const urlPattern = /url\(\s*(["']?)([^)'"\s]+)\1\s*\)/gi;
  while ((match = urlPattern.exec(text))) addReference(bucket, source, match[2], 'css:url');

  const importPattern = /@import\s+(?:url\(\s*)?(["'])([^"']+)\1/gi;
  while ((match = importPattern.exec(text))) addReference(bucket, source, match[2], 'css:import');
}

function extractJsReferences(text, source, bucket) {
  const quotedResource = /(["'`])((?:(?:\.\.?\/)|(?:\/(?:yuhua\/)?cnc\/))[^"'`\r\n]*?\.(?:html?|css|js|json|webmanifest|svg|png|jpe?g|webp|gif|mp4|webm|pdf|txt)(?:[?#][^"'`\r\n]*)?)\1/gi;
  let match;
  while ((match = quotedResource.exec(text))) addReference(bucket, source, match[2], 'js:quoted-resource');
}

function extractManifestReferences(text, source, bucket, errors) {
  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch (error) {
    errors.push({ source, type: 'invalid-manifest-json', detail: error.message });
    return;
  }

  for (const key of ['start_url']) {
    if (typeof manifest[key] === 'string') addReference(bucket, source, manifest[key], `manifest:${key}`);
  }
  for (const icon of [...(manifest.icons || []), ...(manifest.screenshots || [])]) {
    if (icon && typeof icon.src === 'string') addReference(bucket, source, icon.src, 'manifest:asset');
  }
  for (const shortcut of manifest.shortcuts || []) {
    if (shortcut && typeof shortcut.url === 'string') addReference(bucket, source, shortcut.url, 'manifest:shortcut');
    for (const icon of shortcut && Array.isArray(shortcut.icons) ? shortcut.icons : []) {
      if (icon && typeof icon.src === 'string') addReference(bucket, source, icon.src, 'manifest:shortcut-icon');
    }
  }
}

function validateTarget(reference, missing, invalid) {
  if (GENERATED_RUNTIME_TARGETS.has(reference.target)) return { generated: true };

  let absolute = path.join(root, reference.target);
  if (!fs.existsSync(absolute)) {
    missing.push(reference);
    return { missing: true };
  }

  const stat = fs.statSync(absolute);
  if (stat.isDirectory()) {
    absolute = path.join(absolute, 'index.html');
    if (!fs.existsSync(absolute)) {
      missing.push({ ...reference, target: `${reference.target.replace(/\/$/, '')}/index.html` });
      return { missing: true };
    }
  }

  const size = fs.statSync(absolute).size;
  if (size <= 0) {
    invalid.push({ ...reference, type: 'empty-target' });
    return { invalid: true };
  }

  const extension = path.extname(absolute).toLowerCase();
  if (TEXT_TARGET_EXTENSIONS.has(extension)) {
    const text = fs.readFileSync(absolute, 'utf8');
    if (extension === '.html') {
      const required = [/<html\b/i, /<title>[\s\S]*?<\/title>/i, /name=["']viewport["']/i];
      if (!required.every(pattern => pattern.test(text))) {
        invalid.push({ ...reference, type: 'invalid-html-shell' });
        return { invalid: true };
      }
    }
    if (extension === '.json' || extension === '.webmanifest') {
      try { JSON.parse(text); } catch (error) {
        invalid.push({ ...reference, type: 'invalid-json-target', detail: error.message });
        return { invalid: true };
      }
    }
  }

  return { valid: true, size };
}

function validateWorkflow(errors) {
  if (!fs.existsSync(workflowPath)) {
    errors.push({ source: rel(workflowPath), type: 'workflow-missing' });
    return null;
  }
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  const requiredTokens = [
    'pull_request:',
    'push:',
    'branches:',
    '- main',
    "node-version: 24",
    'permissions:',
    'contents: read',
    'cancel-in-progress: false',
    'if: always()',
    'actions/upload-artifact@v4',
    'cnc-site-local-resource-integrity-${{ github.run_id }}'
  ];
  for (const token of requiredTokens) {
    if (!workflow.includes(token)) errors.push({ source: rel(workflowPath), type: 'workflow-contract-missing', detail: token });
  }
  const pathTriggerCount = (workflow.match(/- 'cnc\/\*\*'/g) || []).length;
  if (pathTriggerCount !== 2) errors.push({ source: rel(workflowPath), type: 'workflow-trigger-asymmetry', detail: `cnc/** count=${pathTriggerCount}` });
  for (const forbidden of ['cancel-in-progress: true', 'continue-on-error: true', 'test.skip(', 'describe.skip(', 'it.skip(', 'process.exit(0)']) {
    if (workflow.includes(forbidden)) errors.push({ source: rel(workflowPath), type: 'workflow-bypass', detail: forbidden });
  }
  return { sha256: sha256(workflow), pathTriggerCount };
}

function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  const errors = [];
  const bucket = { local: [], outsideCnc: [] };
  const allFiles = walk(cncRoot);
  const sources = allFiles.filter(file => SOURCE_EXTENSIONS.has(path.extname(file).toLowerCase()));

  for (const absolute of sources) {
    const source = rel(absolute);
    const text = fs.readFileSync(absolute, 'utf8');
    const extension = path.extname(absolute).toLowerCase();
    if (extension === '.html') extractHtmlReferences(text, source, bucket);
    else if (extension === '.css') extractCssReferences(text, source, bucket);
    else if (extension === '.js') extractJsReferences(text, source, bucket);
    else if (extension === '.webmanifest') extractManifestReferences(text, source, bucket, errors);
  }

  const uniqueMap = new Map();
  for (const reference of bucket.local) {
    const key = `${reference.source}\u0000${reference.target}\u0000${reference.kind}`;
    if (!uniqueMap.has(key)) uniqueMap.set(key, reference);
  }
  const references = [...uniqueMap.values()].sort((a, b) => `${a.source}|${a.target}`.localeCompare(`${b.source}|${b.target}`, 'zh-CN'));

  const missing = [];
  const invalid = [];
  let generatedRuntimeReferences = 0;
  let validReferences = 0;
  let validatedBytes = 0;
  for (const reference of references) {
    const result = validateTarget(reference, missing, invalid);
    if (result.generated) generatedRuntimeReferences += 1;
    if (result.valid) {
      validReferences += 1;
      validatedBytes += result.size || 0;
    }
  }

  const workflow = validateWorkflow(errors);
  const sourceSummary = sources.map(file => ({
    path: rel(file),
    sha256: sha256(fs.readFileSync(file)),
    bytes: fs.statSync(file).size
  }));

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    scope: 'cnc/** production HTML/CSS/JS/webmanifest local references',
    sourceFilesScanned: sources.length,
    sourceBreakdown: sourceSummary.reduce((summary, item) => {
      const extension = path.extname(item.path).toLowerCase() || '(none)';
      summary[extension] = (summary[extension] || 0) + 1;
      return summary;
    }, {}),
    localReferencesDiscovered: references.length,
    validReferences,
    generatedRuntimeReferences,
    outsideCncReferences: bucket.outsideCnc.length,
    validatedBytes,
    missing,
    invalid,
    errors,
    generatedRuntimeAllowlist: [...GENERATED_RUNTIME_TARGETS],
    workflow,
    passed: sources.length > 0 && references.length > 0 && missing.length === 0 && invalid.length === 0 && errors.length === 0
  };

  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  const diagnosticLines = [
    `CNC站内资源完整性：${report.passed ? '通过' : '失败'}`,
    `扫描源文件：${sources.length}`,
    `本地引用：${references.length}`,
    `有效引用：${validReferences}`,
    `运行时生成引用：${generatedRuntimeReferences}`,
    `CNC范围外引用（仅记录）：${bucket.outsideCnc.length}`,
    `缺失：${missing.length}`,
    `无效：${invalid.length}`,
    `契约错误：${errors.length}`,
    '',
    ...missing.map(item => `缺失｜${item.source}｜${item.kind}｜${item.raw} -> ${item.target}`),
    ...invalid.map(item => `无效｜${item.source}｜${item.kind}｜${item.raw} -> ${item.target}｜${item.type}`),
    ...errors.map(item => `错误｜${item.source}｜${item.type}｜${item.detail || ''}`)
  ];
  fs.writeFileSync(diagnosticPath, `${diagnosticLines.join('\n')}\n`);

  console.log(JSON.stringify({
    passed: report.passed,
    sourceFilesScanned: report.sourceFilesScanned,
    localReferencesDiscovered: report.localReferencesDiscovered,
    validReferences: report.validReferences,
    generatedRuntimeReferences: report.generatedRuntimeReferences,
    outsideCncReferences: report.outsideCncReferences,
    missing: report.missing.length,
    invalid: report.invalid.length,
    errors: report.errors.length,
    reportPath: rel(reportPath)
  }, null, 2));

  if (!report.passed) process.exitCode = 1;
}

main();
