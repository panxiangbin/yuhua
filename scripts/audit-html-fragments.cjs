const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'test-artifacts');
const SKIP_DIRS = new Set(['.git', 'node_modules', 'test-artifacts']);
const findings = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) files.push(full);
  }
  return files;
}

function decodeFragment(value) {
  try { return decodeURIComponent(value); }
  catch { return null; }
}

function normalizeLocalTarget(sourceFile, href) {
  const hashIndex = href.indexOf('#');
  if (hashIndex < 0) return null;
  const beforeHash = href.slice(0, hashIndex);
  const fragmentRaw = href.slice(hashIndex + 1);
  if (!fragmentRaw) return null;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(beforeHash)) return null;
  const cleanPath = beforeHash.split('?')[0];
  const targetFile = cleanPath
    ? path.resolve(path.dirname(sourceFile), cleanPath)
    : sourceFile;
  return { targetFile, fragmentRaw, fragment: decodeFragment(fragmentRaw) };
}

const htmlFiles = walk(ROOT).sort();
const pageCache = new Map();

function inspectPage(file) {
  if (pageCache.has(file)) return pageCache.get(file);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    const result = { exists: false, ids: new Map() };
    pageCache.set(file, result);
    return result;
  }
  const html = fs.readFileSync(file, 'utf8');
  const ids = new Map();
  const idRegex = /\bid\s*=\s*(["'])(.*?)\1/gi;
  let match;
  while ((match = idRegex.exec(html))) {
    const id = match[2].trim();
    if (!id) continue;
    ids.set(id, (ids.get(id) || 0) + 1);
  }
  const result = { exists: true, html, ids };
  pageCache.set(file, result);
  return result;
}

for (const file of htmlFiles) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const page = inspectPage(file);

  for (const [id, count] of page.ids) {
    if (count > 1) {
      findings.push({ severity: 'high', type: 'duplicate-id', source: rel, target: rel, fragment: id, detail: `id appears ${count} times` });
    }
  }

  const hrefRegex = /\bhref\s*=\s*(["'])(.*?)\1/gi;
  let hrefMatch;
  while ((hrefMatch = hrefRegex.exec(page.html))) {
    const href = hrefMatch[2].trim();
    const target = normalizeLocalTarget(file, href);
    if (!target) continue;
    const targetRel = path.relative(ROOT, target.targetFile).replace(/\\/g, '/');
    if (!target.fragment) {
      findings.push({ severity: 'medium', type: 'invalid-fragment-encoding', source: rel, target: targetRel, fragment: target.fragmentRaw, detail: href });
      continue;
    }
    const targetPage = inspectPage(target.targetFile);
    if (!targetPage.exists) {
      findings.push({ severity: 'high', type: 'missing-fragment-page', source: rel, target: targetRel, fragment: target.fragment, detail: href });
      continue;
    }
    if (!targetPage.ids.has(target.fragment)) {
      findings.push({ severity: 'medium', type: 'missing-fragment-id', source: rel, target: targetRel, fragment: target.fragment, detail: href });
    }
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const counts = findings.reduce((acc, item) => {
  acc[item.type] = (acc[item.type] || 0) + 1;
  return acc;
}, {});
const summary = {
  generatedAt: new Date().toISOString(),
  scannedHtmlFiles: htmlFiles.length,
  findings: findings.length,
  highSeverity: findings.filter(x => x.severity === 'high').length,
  mediumSeverity: findings.filter(x => x.severity === 'medium').length,
  counts,
  policy: {
    modifiesHtml: false,
    modifiesProductData: false,
    directContactDataAdded: false,
  },
};
fs.writeFileSync(path.join(OUT_DIR, 'html-fragment-audit-summary.json'), JSON.stringify(summary, null, 2) + '\n');
const csv = ['severity,type,source,target,fragment,detail', ...findings.map(item =>
  [item.severity, item.type, item.source, item.target, item.fragment, item.detail]
    .map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')
)].join('\n') + '\n';
fs.writeFileSync(path.join(OUT_DIR, 'html-fragment-audit-items.csv'), csv);

console.log(JSON.stringify(summary, null, 2));
if (summary.highSeverity > 0) {
  console.error('High-severity HTML fragment issues found; see audit report.');
  process.exitCode = 1;
}
