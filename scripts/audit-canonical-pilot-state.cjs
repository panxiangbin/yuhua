#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'test-artifacts');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'canonical-pilot-state-audit.json');

const PILOT_PAGES = [
  {
    file: 'cnc/cnc_program_checker_optimizer.html',
    canonical: 'https://www.gyyuhua.cn/cnc/cnc_program_checker_optimizer.html'
  },
  {
    file: 'cnc/cnc-calculator-suite.html',
    canonical: 'https://www.gyyuhua.cn/cnc/cnc-calculator-suite.html'
  }
];

const CONTACT_PATTERNS = [
  { id: 'tel-link', regex: /href\s*=\s*["']\s*tel:/i },
  { id: 'wechat-label', regex: /(?:微信号|微信联系|加微信|复制微信)/i },
  { id: 'phone-label', regex: /(?:联系电话|手机号码|手机号|拨打电话|复制号码)/i },
  { id: 'cn-mobile-number', regex: /(?<!\d)1[3-9]\d{9}(?!\d)/ }
];

function findCanonicalTags(html) {
  return [...html.matchAll(/<link\b[^>]*\brel\s*=\s*["'][^"']*\bcanonical\b[^"']*["'][^>]*>/gi)]
    .map((match) => match[0]);
}

function extractHref(tag) {
  const match = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
  return match ? match[1].trim() : '';
}

function auditPage(entry) {
  const absolutePath = path.join(ROOT, entry.file);
  const issues = [];

  if (!fs.existsSync(absolutePath)) {
    return {
      ...entry,
      state: 'missing-source',
      canonicalCount: 0,
      actualCanonical: null,
      contactFindings: [],
      issues: ['源 HTML 文件不存在']
    };
  }

  const html = fs.readFileSync(absolutePath, 'utf8');
  const tags = findCanonicalTags(html);
  const hrefs = tags.map(extractHref);
  const contactFindings = CONTACT_PATTERNS
    .filter(({ regex }) => regex.test(html))
    .map(({ id }) => id);

  let state = 'not-applied';
  if (tags.length > 1) {
    state = 'invalid';
    issues.push('页面存在多个 canonical 标签');
  } else if (tags.length === 1) {
    if (!hrefs[0]) {
      state = 'invalid';
      issues.push('canonical 标签缺少 href');
    } else if (hrefs[0] !== entry.canonical) {
      state = 'invalid';
      issues.push(`canonical 目标不匹配：${hrefs[0]}`);
    } else {
      state = 'applied-correctly';
    }
  }

  if (contactFindings.length > 0) {
    issues.push(`发现禁止的直接联系方式特征：${contactFindings.join(', ')}`);
  }

  return {
    ...entry,
    state,
    canonicalCount: tags.length,
    actualCanonical: hrefs[0] || null,
    contactFindings,
    issues
  };
}

const pages = PILOT_PAGES.map(auditPage);
const invalidPages = pages.filter((page) => page.issues.length > 0);
const appliedCount = pages.filter((page) => page.state === 'applied-correctly').length;
const pendingCount = pages.filter((page) => page.state === 'not-applied').length;

const report = {
  generatedAt: new Date().toISOString(),
  purpose: '持续确认 canonical 试点页面只处于“尚未实施”或“已正确实施”两种安全状态，并阻断直接联系方式回流。',
  allowedStates: ['not-applied', 'applied-correctly'],
  summary: {
    total: pages.length,
    appliedCorrectly: appliedCount,
    notApplied: pendingCount,
    invalid: invalidPages.length,
    directContactLeakage: pages.filter((page) => page.contactFindings.length > 0).length
  },
  pages
};

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Canonical pilot state audit: ${appliedCount} applied, ${pendingCount} pending, ${invalidPages.length} invalid.`);
console.log(`Report: ${path.relative(ROOT, OUTPUT_FILE)}`);

if (invalidPages.length > 0) {
  for (const page of invalidPages) {
    console.error(`${page.file}: ${page.issues.join('; ')}`);
  }
  process.exit(1);
}
