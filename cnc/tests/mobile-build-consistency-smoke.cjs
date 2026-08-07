'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'cnc', 'test-results', 'mobile-build-consistency');
const REPORT = path.join(OUT, 'report.json');
const ERROR = path.join(OUT, 'error.txt');
fs.mkdirSync(OUT, { recursive: true });

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function match(source, pattern, label) {
  const value = source.match(pattern)?.[1] || '';
  if (!value) throw new Error(`未读取到${label}`);
  return value;
}

function main() {
  const info = JSON.parse(read('cnc/build-info.json').replace(/^\uFEFF/, ''));
  const runtime = read('cnc/personal-home.js');
  const browserGate = read('cnc/tests/mobile-home-final-smoke.cjs');

  if (info.app !== 'cnc-training-platform') throw new Error(`build-info应用标识错误：${info.app}`);
  const declared = String(info.mobileBuild || '');
  if (!/^\d{8}-mobile\d+$/.test(declared)) throw new Error(`mobileBuild格式无效：${declared}`);

  const bodyDataset = match(
    runtime,
    /document\.body\.dataset\.cncMobileHomeBuild\s*=\s*['"]([^'"]+)['"]/,
    'personal-home body dataset构建标记'
  );
  const refactorBuild = match(
    runtime,
    /refactorBuild\s*:\s*['"]([^'"]+)['"]/,
    'CNC_PERSONAL_HOME.refactorBuild'
  );
  const browserExpected = match(
    browserGate,
    /body\.dataset\.cncMobileHomeBuild\s*===\s*['"]([^'"]+)['"]/,
    '手机首页浏览器门禁期望构建'
  );

  const values = { declared, bodyDataset, refactorBuild, browserExpected };
  const mismatches = Object.entries(values).filter(([, value]) => value !== declared);
  const report = {
    generatedAt: new Date().toISOString(),
    commitSha: process.env.GITHUB_SHA || null,
    values,
    mismatchCount: mismatches.length,
    mismatches: mismatches.map(([name, value]) => ({ name, value, expected: declared })),
    passed: mismatches.length === 0
  };
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));

  if (mismatches.length) {
    throw new Error(`手机构建标记漂移：${mismatches.map(([name, value]) => `${name}=${value}，期望${declared}`).join('；')}`);
  }
  console.log(`CNC手机构建标记一致性通过：${declared}`);
}

try {
  main();
} catch (error) {
  fs.writeFileSync(ERROR, String(error && error.stack ? error.stack : error));
  console.error(error);
  process.exitCode = 1;
}
