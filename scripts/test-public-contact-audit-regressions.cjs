#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repositoryRoot = path.resolve(__dirname, "..");
const auditSource = fs.readFileSync(path.join(__dirname, "audit-public-contact-leaks.cjs"), "utf8");

const cases = [
  {
    name: "allows URL sanitizer checks",
    file: "safe.js",
    content: 'if (ref.startsWith("tel:") || ref.startsWith("sms:")) return null;',
    expectedStatus: 0
  },
  {
    name: "blocks executable tel link",
    file: "unsafe.html",
    content: '<a href="tel:123">拨号</a>',
    expectedStatus: 1,
    expectedType: "直接联系链接"
  },
  {
    name: "blocks mainland mobile literal",
    file: "unsafe.json",
    content: '{"value":"13800138000"}',
    expectedStatus: 1,
    expectedType: "大陆手机号字面值"
  },
  {
    name: "blocks visible WeChat copy",
    file: "unsafe.html",
    content: '<span>微信客服</span>',
    expectedStatus: 1,
    expectedType: "直接联系方式文案"
  },
  {
    name: "blocks copy-number controls",
    file: "unsafe.html",
    content: '<button id="copyPhone">复制</button>',
    expectedStatus: 1,
    expectedType: "直接联系方式控件"
  }
];

for (const testCase of cases) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "yuhua-contact-audit-"));
  try {
    const scriptsDir = path.join(fixtureRoot, "scripts");
    fs.mkdirSync(scriptsDir, { recursive: true });
    fs.writeFileSync(path.join(scriptsDir, "audit-public-contact-leaks.cjs"), auditSource);
    fs.writeFileSync(path.join(fixtureRoot, testCase.file), testCase.content);

    const result = spawnSync(process.execPath, [path.join(scriptsDir, "audit-public-contact-leaks.cjs")], {
      cwd: fixtureRoot,
      encoding: "utf8"
    });

    assert.strictEqual(
      result.status,
      testCase.expectedStatus,
      `${testCase.name}: expected exit ${testCase.expectedStatus}, got ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );

    const summaryPath = path.join(fixtureRoot, "test-artifacts", "public-contact-audit-summary.json");
    assert.ok(fs.existsSync(summaryPath), `${testCase.name}: summary report missing`);
    const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

    if (testCase.expectedStatus === 0) {
      assert.strictEqual(summary.findingCount, 0, `${testCase.name}: safe fixture was flagged`);
    } else {
      assert.ok(summary.findingCount > 0, `${testCase.name}: unsafe fixture was not reported`);
      assert.match(result.stderr, new RegExp(testCase.expectedType), `${testCase.name}: expected finding type missing`);
      assert.doesNotMatch(result.stderr, /13800138000/, `${testCase.name}: raw mobile leaked into logs`);
    }
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

console.log(`公开联系方式审计回归测试通过：${cases.length} 个场景。`);
