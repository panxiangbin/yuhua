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

// 仅排除明确不是网站生产入口的历史维护/诊断源文件；若被生产页面引用，目标存在性仍会被检查。
const NON_PRODUCTION_SOURCE_PATHS = new Map([
  ['cnc/fix-json-encoding.js', '一次性JSON编码维护脚本，不由生产页面加载'],
  ['cnc/tmp_dom_dump.html', '历史DOM诊断快照，不是产品页面']
]);

// Service Worker 在运行时写入该诊断响应，它不是仓库静态文件。
const GENERATED_RUNTIME_TARGETS = new Set([
  'cnc/pwa-install-diagnostics.json'
]);

// 这些生产加载器明确先移除UTF-8 BOM，再执行JSON.parse。
const BOM_AWARE_JSON_SOURCES = new Set([
  'cnc/json-loader.js'
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

function extractCssReferences(text, source, bucket, kindPrefix = 'css') {
  let match;
  const urlPattern = /url\(\s*(["']?)([^)'"\s]+)\1\s*\)/gi;
  while ((match = urlPattern.exec(text))) addReference(bucket, source, match[2], `${kindPrefix}:url`);

  const importPattern = /@import\s+(?:url\(\s*)?(["'])([^"']+)\1/gi;
  while ((match = importPattern.exec(text))) addReference(bucket, source, match[2], `${kindPrefix}:import`);
}

function stripJsComments(text) {
  let output = '';
  let state = 'code';
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (state === 'line-comment') {
      if (char === '\n' || char === '\r') {
        state = 'code';
        output += char;
      } else {
        output += ' ';
      }
      continue;
    }

    if (state === 'block-comment') {
      if (char === '*' && next === '/') {
        output += '  ';
        index += 1;
        state = 'code';
      } else {
        output += char === '\n' || char === '\r' ? char : ' ';
      }
      continue;
    }

    if (state === 'single' || state === 'double' || state === 'template') {
      output += char;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if ((state === 'single' && char === "'") || (state === 'double' && char === '"') || (state === 'template' && char === '`')) {
        state = 'code';
      }
      continue;
    }

    if (char === '/' && next === '/') {
      output += '  ';
      index += 1;
      state = 'line-comment';
      continue;
    }
    if (char === '/' && next === '*') {
      output += '  ';
      index += 1;
      state = 'block-comment';
      continue;
    }
    if (char === "'") state = 'single';
    else if (char === '"') state = 'double';
    else if (char === '`') state = 'template';
    output += char;
  }

  return output;
}

function extractJsReferences(text, source, bucket, kindPrefix = 'js') {
  const code = stripJsComments(text);
  const quotedResource = /(["'`])((?:(?:\.\.?\/)|(?:\/(?:yuhua\/)?cnc\/))[^"'`\r\n]*?\.(?:html?|css|js|json|webmanifest|svg|png|jpe?g|webp|gif|mp4|webm|pdf|txt)(?:[?#][^"'`\r\n]*)?)\1/gi;
  let match;
  while ((match = quotedResource.exec(code))) addReference(bucket, source, match[2], `${kindPrefix}:quoted-resource`);
}

function extractHtmlReferences(text, source, bucket) {
  // 属性名前必须是空白或标签起点，避免把 data-action 误判为表单 action。
  const attributePattern = /(?:^|[\s<])(href|src|action|poster)\s*=\s*(["'])([\s\S]*?)\2/gi;
  let match;
  while ((match = attributePattern.exec(text))) addReference(bucket, source, match[3], `html:${match[1].toLowerCase()}`);

  const srcsetPattern = /(?:^|[\s<])srcset\s*=\s*(["'])([\s\S]*?)\1/gi;
  while ((match = srcsetPattern.exec(text))) {
    for (const candidate of match[2].split(',')) {
      const url = candidate.trim().split(/\s+/)[0];
      addReference(bucket, source, url, 'html:srcset');
    }
  }

  const styleAttributePattern = /(?:^|[\s<])style\s*=\s*(["'])([\s\S]*?)\1/gi;
  while ((match = styleAttributePattern.exec(text))) extractCssReferences(match[2], source, bucket, 'html:style');

  const styleBlockPattern = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  while ((match = styleBlockPattern.exec(text))) extractCssReferences(match[1], source, bucket, 'html:style-block');

  const inlineScriptPattern = /<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;
  while ((match = inlineScriptPattern.exec(text))) extractJsReferences(match[1], source, bucket, 'html:inline-script');
}

function extractManifestReferences(text, source, bucket, errors) {
  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch (error) {
    errors.push({ source, type: 'invalid-manifest-json', detail: error.message });
    return;
  }

  if (typeof manifest.start_url === 'string') addReference(bucket, source, manifest.start_url, 'manifest:start_url');
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

function validateTarget(reference, missing, invalid, bomNormalized) {
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
      let parseText = text;
      if (text.charCodeAt(0) === 0xFEFF) {
        if (!BOM_AWARE_JSON_SOURCES.has(reference.source)) {
          invalid.push({ ...reference, type: 'utf8-bom-without-aware-loader' });
          return { invalid: true };
        }
        parseText = text.slice(1);
        bomNormalized.push({ source: reference.source, target: reference.target, kind: reference.kind });
      }
      try { JSON.parse(parseText); } catch (error) {
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
  const forbiddenTokens = [
    ['cancel-in-progress', ': true'].join(''),
    ['continue-on-error', ': true'].join(''),
    ['test', '.skip('].join(''),
    ['describe', '.skip('].join(''),
    ['it', '.skip('].join(''),
    ['process.exit', '(0)'].join('')
  ];
  for (const forbidden of forbiddenTokens) {
    if (workflow.includes(forbidden)) errors.push({ source: rel(workflowPath), type: 'workflow-bypass', detail: forbidden });
  }
  return { sha256: sha256(workflow), pathTriggerCount };
}

function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  const errors = [];
  const bucket = { local: [], outsideCnc: [] };
  const allFiles = walk(cncRoot);
  const excludedSources = [];
  const sources = allFiles.filter(file => {
    if (!SOURCE_EXTENSIONS.has(path.extname(file).toLowerCase())) return false;
    const relative = rel(file);
    if (NON_PRODUCTION_SOURCE_PATHS.has(relative)) {
      excludedSources.push({ path: relative, reason: NON_PRODUCTION_SOURCE_PATHS.get(relative) });
      return false;
    }
    return true;
  });

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
  const bomNormalized = [];
  let generatedRuntimeReferences = 0;
  let validReferences = 0;
  let validatedBytes = 0;
  for (const reference of references) {
    const result = validateTarget(reference, missing, invalid, bomNormalized);
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
  const uniqueBomNormalized = [...new Map(bomNormalized.map(item => [`${item.source}\u0000${item.target}`, item])).values()];

  const report = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    scope: 'cnc/** production HTML/CSS/JS/webmanifest local references',
    sourceFilesScanned: sources.length,
    sourceBreakdown: sourceSummary.reduce((summary, item) => {
      const extension = path.extname(item.path).toLowerCase() || '(none)';
      summary[extension] = (summary[extension] || 0) + 1;
      return summary;
    }, {}),
    nonProductionSourcesExcluded: excludedSources.sort((a, b) => a.path.localeCompare(b.path, 'zh-CN')),
    localReferencesDiscovered: references.length,
    validReferences,
    generatedRuntimeReferences,
    bomNormalizedReferences: uniqueBomNormalized,
    outsideCncReferences: bucket.outsideCnc.length,
    validatedBytes,
    missing,
    invalid,
    errors,
    generatedRuntimeAllowlist: [...GENERATED_RUNTIME_TARGETS],
    bomAwareJsonSources: [...BOM_AWARE_JSON_SOURCES],
    workflow,
    passed: sources.length > 0 && references.length > 0 && missing.length === 0 && invalid.length === 0 && errors.length === 0
  };

  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  const diagnosticLines = [
    `CNC站内资源完整性：${report.passed ? '通过' : '失败'}`,
    `扫描源文件：${sources.length}`,
    `明确排除的非生产源：${excludedSources.length}`,
    `本地引用：${references.length}`,
    `有效引用：${validReferences}`,
    `运行时生成引用：${generatedRuntimeReferences}`,
    `BOM感知加载引用：${uniqueBomNormalized.length}`,
    `CNC范围外引用（仅记录）：${bucket.outsideCnc.length}`,
    `缺失：${missing.length}`,
    `无效：${invalid.length}`,
    `契约错误：${errors.length}`,
    '',
    ...excludedSources.map(item => `非生产源｜${item.path}｜${item.reason}`),
    ...uniqueBomNormalized.map(item => `BOM感知｜${item.source}｜${item.target}`),
    ...missing.map(item => `缺失｜${item.source}｜${item.kind}｜${item.raw} -> ${item.target}`),
    ...invalid.map(item => `无效｜${item.source}｜${item.kind}｜${item.raw} -> ${item.target}｜${item.type}`),
    ...errors.map(item => `错误｜${item.source}｜${item.type}｜${item.detail || ''}`)
  ];
  fs.writeFileSync(diagnosticPath, `${diagnosticLines.join('\n')}\n`);

  console.log(JSON.stringify({
    passed: report.passed,
    sourceFilesScanned: report.sourceFilesScanned,
    nonProductionSourcesExcluded: report.nonProductionSourcesExcluded.length,
    localReferencesDiscovered: report.localReferencesDiscovered,
    validReferences: report.validReferences,
    generatedRuntimeReferences: report.generatedRuntimeReferences,
    bomNormalizedReferences: report.bomNormalizedReferences.length,
    outsideCncReferences: report.outsideCncReferences,
    missing: report.missing.length,
    invalid: report.invalid.length,
    errors: report.errors.length,
    reportPath: rel(reportPath)
  }, null, 2));

  if (!report.passed) process.exitCode = 1;
}

main();
