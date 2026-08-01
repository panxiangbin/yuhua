'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(ROOT, 'artifacts', 'content-trust-status');
const BASE_URL = process.env.CNC_TEST_BASE_URL || 'http://127.0.0.1:4173';
const REQUIRED_NOTICE = '教学参考，需按机床说明书、现场工艺和空运行验证';

(async () => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const browserErrors = [];
  const failedRequests = [];
  let browser;
  let report;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      locale: 'zh-CN'
    });
    const page = await context.newPage();
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('pageerror', (error) => browserErrors.push(error.message));
    page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'unknown' }));

    const response = await page.goto(`${BASE_URL}/cnc/content-trust-status.html`, { waitUntil: 'networkidle', timeout: 30000 });
    if (!response || !response.ok()) throw new Error(`状态页加载失败：${response ? response.status() : 'no response'}`);
    await page.waitForFunction(() => document.querySelectorAll('.dataset').length >= 5, null, { timeout: 10000 });

    const data = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      title: document.title,
      notice: document.getElementById('required-notice')?.textContent?.trim(),
      datasetCount: Number(document.getElementById('dataset-count')?.textContent),
      pendingCount: Number(document.getElementById('pending-count')?.textContent),
      operationalCount: Number(document.getElementById('operational-count')?.textContent),
      cards: document.querySelectorAll('.dataset').length,
      pendingBadges: document.querySelectorAll('.pending_manual_verification,.pending_system_scope_review').length,
      reviewedBadges: document.querySelectorAll('.reviewed_scope').length,
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      mainCount: document.querySelectorAll('main').length,
      returnLink: document.querySelector('a[href="./"]')?.textContent?.trim() || ''
    }));

    const findings = [];
    if (data.lang !== 'zh-CN') findings.push(`页面语言应为 zh-CN，实际为 ${data.lang}`);
    if (data.notice !== REQUIRED_NOTICE) findings.push('统一教学参考提示未正确显示');
    if (data.datasetCount !== 5 || data.cards !== 5) findings.push(`登记数据集应为 5，实际统计 ${data.datasetCount} / 卡片 ${data.cards}`);
    if (data.pendingCount !== 4 || data.pendingBadges !== 4) findings.push(`待逐条复核数据集应为 4，实际 ${data.pendingCount} / 标签 ${data.pendingBadges}`);
    if (data.operationalCount !== 0) findings.push(`可直接上机使用必须为 0，实际 ${data.operationalCount}`);
    if (data.reviewedBadges !== 1) findings.push(`reviewed_scope 应仅有课程数据 1 项，实际 ${data.reviewedBadges}`);
    if (data.horizontalOverflow > 0) findings.push(`390px 手机宽度存在 ${data.horizontalOverflow}px 横向溢出`);
    if (data.mainCount !== 1) findings.push(`主要内容地标应为 1，实际 ${data.mainCount}`);
    if (!data.returnLink.includes('返回 CNC')) findings.push('缺少返回 CNC 平台入口');
    if (browserErrors.length) findings.push(`浏览器错误：${browserErrors.join(' | ')}`);
    if (failedRequests.length) findings.push(`失败请求：${failedRequests.map((item) => item.url).join(' | ')}`);

    report = {
      generatedAt: new Date().toISOString(),
      url: page.url(),
      viewport: { width: 390, height: 844, deviceScaleFactor: 2 },
      result: findings.length ? 'failure' : 'success',
      data,
      browserErrors,
      failedRequests,
      findings
    };

    await page.screenshot({ path: path.join(OUTPUT_DIR, 'content-trust-status-390x844.png'), fullPage: true });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'findings.txt'), (findings.length ? findings : ['PASS: 手机端可信度状态页明确显示 4 项待复核、0 项可直接上机使用。']).join('\n') + '\n');

    if (findings.length) throw new Error(findings.join('\n'));
    console.log('CNC 手机端内容可信度状态页验证通过', data);
  } catch (error) {
    if (!report) {
      report = { generatedAt: new Date().toISOString(), result: 'failure', error: error.message, browserErrors, failedRequests };
      fs.writeFileSync(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(report, null, 2) + '\n');
      fs.writeFileSync(path.join(OUTPUT_DIR, 'findings.txt'), `ERROR: ${error.message}\n`);
    }
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})();
