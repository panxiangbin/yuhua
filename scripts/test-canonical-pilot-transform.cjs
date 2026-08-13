const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'test-artifacts');
const pilots = [
  {
    file: 'cnc/cnc_program_checker_optimizer.html',
    canonical: 'https://www.gyyuhua.cn/cnc/cnc_program_checker_optimizer.html'
  },
  {
    file: 'cnc/cnc-calculator-suite.html',
    canonical: 'https://www.gyyuhua.cn/cnc/cnc-calculator-suite.html'
  }
];

const forbidden = [
  /tel\s*:/i,
  /微信(?:号|号码)?\s*[:：]?/i,
  /手机号\s*[:：]?/i,
  /电话号码\s*[:：]?/i,
  /复制(?:电话|号码|手机号)/i,
  /拨打(?:电话|号码)/i
];

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function bodyOf(html) {
  const match = html.match(/<body\b[^>]*>[\s\S]*<\/body>/i);
  return match ? match[0] : '';
}

function simulate(html, canonical) {
  if (!/<head\b[^>]*>/i.test(html) || !/<\/head>/i.test(html)) {
    throw new Error('缺少完整 head');
  }
  if ((html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi) || []).length) {
    throw new Error('页面已存在 canonical，禁止重复插入');
  }
  const titleEnd = html.search(/<\/title>/i);
  if (titleEnd < 0) throw new Error('缺少 title');
  const end = titleEnd + html.slice(titleEnd).match(/<\/title>/i)[0].length;
  return html.slice(0, end) + `\n  <link rel="canonical" href="${canonical}" />` + html.slice(end);
}

const items = pilots.map(item => {
  const filePath = path.join(root, item.file);
  const source = fs.readFileSync(filePath, 'utf8');
  const transformed = simulate(source, item.canonical);
  const canonicals = transformed.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi) || [];
  const bodyUnchanged = hash(bodyOf(source)) === hash(bodyOf(transformed));
  const onlyExpectedDelta = transformed === simulate(source, item.canonical);
  const contactLeaks = forbidden.filter(pattern => pattern.test(transformed)).map(pattern => pattern.source);
  const expectedTag = `<link rel="canonical" href="${item.canonical}" />`;
  const passed = canonicals.length === 1 && transformed.includes(expectedTag) && bodyUnchanged && onlyExpectedDelta && contactLeaks.length === 0;
  return {
    ...item,
    sourceSha256: hash(source),
    transformedSha256: hash(transformed),
    canonicalCount: canonicals.length,
    bodyUnchanged,
    contactLeaks,
    passed
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  mode: 'simulation-only',
  modifiedFiles: [],
  checked: items.length,
  passed: items.filter(item => item.passed).length,
  failed: items.filter(item => !item.passed).length,
  items
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'canonical-pilot-transform-test.json'), JSON.stringify(report, null, 2) + '\n');
const csv = [
  'file,canonical,canonicalCount,bodyUnchanged,contactLeaks,passed',
  ...items.map(item => [item.file, item.canonical, item.canonicalCount, item.bodyUnchanged, item.contactLeaks.join('|'), item.passed]
    .map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
].join('\n') + '\n';
fs.writeFileSync(path.join(outDir, 'canonical-pilot-transform-test.csv'), csv);

console.log(`Canonical 试点模拟：${report.passed}/${report.checked} 通过；未修改任何 HTML。`);
if (report.failed) process.exit(1);
