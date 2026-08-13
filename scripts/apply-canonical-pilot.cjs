#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const WRITE = process.argv.includes('--write');
const PILOT = [
  {
    file: 'cnc/cnc_program_checker_optimizer.html',
    canonical: 'https://www.gyyuhua.cn/cnc/cnc_program_checker_optimizer.html'
  },
  {
    file: 'cnc/cnc-calculator-suite.html',
    canonical: 'https://www.gyyuhua.cn/cnc/cnc-calculator-suite.html'
  }
];

const forbiddenChecks = [
  { name: 'tel link', regex: /href\s*=\s*["']\s*tel:/i },
  { name: 'WeChat label', regex: /微信(?:号|联系|客服)?\s*[:：]?/i },
  { name: 'mainland mobile number', regex: /(?:^|\D)1[3-9]\d{9}(?:\D|$)/ },
  { name: 'dial action', regex: /(?:拨打|拨号|立即致电|电话联系)/i },
  { name: 'copy contact action', regex: /(?:复制(?:电话|手机号|号码|微信)|copy(?:Phone|Mobile|Wechat))/i }
];

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function getBody(html) {
  const match = html.match(/<body\b[^>]*>[\s\S]*?<\/body>/i);
  if (!match) throw new Error('missing complete <body>');
  return match[0];
}

function assertNoDirectContact(html, file) {
  for (const check of forbiddenChecks) {
    if (check.regex.test(html)) {
      throw new Error(`${file}: forbidden direct-contact pattern detected (${check.name})`);
    }
  }
}

function validateTarget(item) {
  const url = new URL(item.canonical);
  if (url.protocol !== 'https:' || url.hostname !== 'www.gyyuhua.cn' || url.search || url.hash) {
    throw new Error(`${item.file}: unsafe canonical target ${item.canonical}`);
  }
  const expectedPath = `/${item.file}`;
  if (decodeURI(url.pathname) !== expectedPath) {
    throw new Error(`${item.file}: canonical path mismatch ${url.pathname}`);
  }
}

function transform(html, item) {
  validateTarget(item);
  const beforeBodyHash = sha256(getBody(html));
  const canonicalMatches = html.match(/<link\b[^>]*rel\s*=\s*["'][^"']*canonical[^"']*["'][^>]*>/gi) || [];

  if (canonicalMatches.length > 1) {
    throw new Error(`${item.file}: multiple canonical links found; refusing to modify`);
  }

  if (canonicalMatches.length === 1) {
    if (!canonicalMatches[0].includes(`href="${item.canonical}"`) && !canonicalMatches[0].includes(`href='${item.canonical}'`)) {
      throw new Error(`${item.file}: existing canonical does not match approved target`);
    }
    assertNoDirectContact(html, item.file);
    return {
      output: html,
      beforeBodyHash,
      afterBodyHash: beforeBodyHash,
      alreadyPresent: true
    };
  }

  const headMatches = html.match(/<head\b[^>]*>[\s\S]*?<\/head>/gi) || [];
  if (headMatches.length !== 1) {
    throw new Error(`${item.file}: expected exactly one complete <head>, found ${headMatches.length}`);
  }

  const titleMatches = headMatches[0].match(/<title\b[^>]*>[\s\S]*?<\/title>/gi) || [];
  if (titleMatches.length !== 1) {
    throw new Error(`${item.file}: expected exactly one <title>, found ${titleMatches.length}`);
  }

  if (/<meta\b[^>]*http-equiv\s*=\s*["']refresh["']/i.test(html)) {
    throw new Error(`${item.file}: meta refresh detected; refusing to modify`);
  }
  if (/<base\b/i.test(html)) {
    throw new Error(`${item.file}: <base> detected; refusing to modify`);
  }

  const title = titleMatches[0];
  const canonicalTag = `\n  <link rel="canonical" href="${item.canonical}" />`;
  const output = html.replace(title, title + canonicalTag);
  const afterBodyHash = sha256(getBody(output));

  if (beforeBodyHash !== afterBodyHash) {
    throw new Error(`${item.file}: body changed during canonical insertion`);
  }

  const outputCanonicals = output.match(/<link\b[^>]*rel\s*=\s*["'][^"']*canonical[^"']*["'][^>]*>/gi) || [];
  if (outputCanonicals.length !== 1 || !outputCanonicals[0].includes(item.canonical)) {
    throw new Error(`${item.file}: canonical insertion invariant failed`);
  }

  assertNoDirectContact(output, item.file);
  return { output, beforeBodyHash, afterBodyHash, alreadyPresent: false };
}

const report = {
  mode: WRITE ? 'write' : 'dry-run',
  generatedAt: new Date().toISOString(),
  changed: [],
  safety: {
    bodyMustRemainByteIdentical: true,
    noProductDataChanges: true,
    noDirectContactAllowed: true,
    officialHostOnly: 'www.gyyuhua.cn',
    idempotentWhenAlreadyApplied: true
  }
};

for (const item of PILOT) {
  const absolute = path.join(ROOT, item.file);
  if (!fs.existsSync(absolute)) throw new Error(`${item.file}: source file missing`);
  const source = fs.readFileSync(absolute, 'utf8');
  assertNoDirectContact(source, item.file);
  const result = transform(source, item);

  if (WRITE && !result.alreadyPresent) fs.writeFileSync(absolute, result.output, 'utf8');
  report.changed.push({
    file: item.file,
    canonical: item.canonical,
    bodyHashBefore: result.beforeBodyHash,
    bodyHashAfter: result.afterBodyHash,
    bodyUnchanged: result.beforeBodyHash === result.afterBodyHash,
    alreadyPresent: result.alreadyPresent,
    written: WRITE && !result.alreadyPresent
  });
}

const outDir = path.join(ROOT, 'test-artifacts');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'canonical-pilot-application.json'),
  JSON.stringify(report, null, 2) + '\n',
  'utf8'
);

console.log(`${WRITE ? 'Applied or verified' : 'Validated'} canonical pilot for ${report.changed.length} pages.`);
for (const item of report.changed) {
  console.log(`- ${item.file} -> ${item.canonical} (body unchanged: ${item.bodyUnchanged}, already present: ${item.alreadyPresent})`);
}
