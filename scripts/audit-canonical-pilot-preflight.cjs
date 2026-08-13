const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.join(ROOT, 'test-artifacts');
const PILOT_PATH = path.join(ARTIFACT_DIR, 'canonical-pilot-batch.json');
const JSON_OUT = path.join(ARTIFACT_DIR, 'canonical-pilot-preflight-audit.json');
const CSV_OUT = path.join(ARTIFACT_DIR, 'canonical-pilot-preflight-audit.csv');

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join('；') : String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

if (!fs.existsSync(PILOT_PATH)) {
  throw new Error('缺少 canonical 试点批次报告，请先运行 build-canonical-pilot-batch.cjs');
}

const pilot = JSON.parse(fs.readFileSync(PILOT_PATH, 'utf8'));
const rows = [];

for (const item of pilot.pilotBatch || []) {
  const filePath = path.join(ROOT, item.file);
  const issues = [];
  let html = '';

  if (!fs.existsSync(filePath)) {
    issues.push('源 HTML 文件不存在');
  } else {
    html = fs.readFileSync(filePath, 'utf8');
    const headOpen = countMatches(html, /<head(?:\s[^>]*)?>/gi);
    const headClose = countMatches(html, /<\/head\s*>/gi);
    const titleCount = countMatches(html, /<title(?:\s[^>]*)?>[\s\S]*?<\/title\s*>/gi);
    const canonicalCount = countMatches(html, /<link\b[^>]*\brel\s*=\s*["'][^"']*\bcanonical\b[^"']*["'][^>]*>/gi);
    const metaRefreshCount = countMatches(html, /<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi);
    const baseCount = countMatches(html, /<base\b[^>]*>/gi);

    if (headOpen !== 1 || headClose !== 1) issues.push(`head 结构异常（开始 ${headOpen}，结束 ${headClose}）`);
    if (titleCount !== 1) issues.push(`title 数量异常（${titleCount}）`);
    if (canonicalCount !== 0) issues.push(`候选页当前 canonical 数量不是 0（${canonicalCount}）`);
    if (metaRefreshCount > 0) issues.push('存在 meta refresh，需人工确认跳转语义');
    if (baseCount > 0) issues.push('存在 base 标签，可能改变相对链接解析');

    const forbiddenChecks = [
      ['tel: 拨号链接', /href\s*=\s*["']\s*tel:/i],
      ['微信号字段', /(微信号|微信号码|加微信|联系微信)/i],
      ['复制号码入口', /(复制.{0,8}(号码|电话|手机|微信)|copy.{0,8}(phone|mobile|wechat))/i],
      ['中国大陆手机号', /(?<!\d)1[3-9]\d{9}(?!\d)/],
    ];

    for (const [label, pattern] of forbiddenChecks) {
      if (pattern.test(html)) issues.push(`发现禁止内容：${label}`);
    }

    const expectedCanonical = String(item.targetCanonical || '');
    try {
      const url = new URL(expectedCanonical);
      if (url.protocol !== 'https:') issues.push('目标 canonical 不是 HTTPS');
      if (url.hostname !== 'www.gyyuhua.cn') issues.push('目标 canonical 不在确认域名内');
      if (url.search || url.hash) issues.push('目标 canonical 含查询参数或片段');
    } catch {
      issues.push('目标 canonical 不是合法绝对 URL');
    }
  }

  rows.push({
    file: item.file,
    pageType: item.pageType,
    targetCanonical: item.targetCanonical,
    sourceExists: fs.existsSync(filePath),
    blockingIssues: issues.length,
    decision: issues.length ? '阻断并人工审核' : '通过实施前安全门禁',
    issues,
    automaticChanges: 0,
  });
}

const summary = {
  checkedPages: rows.length,
  passedPages: rows.filter((row) => row.blockingIssues === 0).length,
  blockedPages: rows.filter((row) => row.blockingIssues > 0).length,
  blockingIssues: rows.reduce((sum, row) => sum + row.blockingIssues, 0),
  automaticChanges: 0,
};

const report = {
  generatedAt: new Date().toISOString(),
  scope: '对低风险 canonical 试点页执行写入前结构、跳转和直接联系方式安全门禁；不修改 HTML',
  summary,
  rules: [
    '源页面必须存在，且只能有一个完整 head 和一个 title',
    '实施前页面必须没有 canonical、meta refresh 或 base 标签冲突',
    '目标 canonical 必须为 www.gyyuhua.cn 下的 HTTPS 绝对网址且不含查询参数或片段',
    '页面不得包含电话、手机号、微信号、tel:、拨号或复制号码入口',
    '本审计只生成报告，不修改页面、产品参数或业务数据',
  ],
  items: rows,
};

fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
fs.writeFileSync(JSON_OUT, `${JSON.stringify(report, null, 2)}\n`);

const headers = ['file', 'pageType', 'targetCanonical', 'sourceExists', 'blockingIssues', 'decision', 'issues', 'automaticChanges'];
const csv = [headers.join(','), ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(','))].join('\n');
fs.writeFileSync(CSV_OUT, `${csv}\n`);

console.log(`Canonical 试点实施前审计：${summary.checkedPages} 页，通过 ${summary.passedPages} 页，阻断 ${summary.blockedPages} 页，问题 ${summary.blockingIssues} 项。`);

if (summary.blockingIssues > 0) {
  process.exitCode = 1;
}
