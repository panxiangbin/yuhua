'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(ROOT, 'artifacts', 'content-trust-evidence-status');
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

    const response = await page.goto(`${BASE_URL}/cnc/content-trust-evidence.html`, { waitUntil: 'networkidle', timeout: 30000 });
    if (!response || !response.ok()) throw new Error(`资料准备度页面加载失败：${response ? response.status() : 'no response'}`);
    await page.waitForFunction(() => document.querySelectorAll('.dataset').length >= 5, null, { timeout: 10000 });

    const data = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      title: document.title,
      notice: document.getElementById('required-notice')?.textContent?.trim(),
      datasetCount: Number(document.getElementById('dataset-count')?.textContent),
      readyCount: Number(document.getElementById('ready-count')?.textContent),
      sourceCount: Number(document.getElementById('source-count')?.textContent),
      itemReviewCount: Number(document.getElementById('item-review-count')?.textContent),
      boundaryText: document.querySelector('.record-boundary')?.textContent?.trim() || '',
      cards: document.querySelectorAll('.dataset').length,
      metricCards: document.querySelectorAll('.summary .metric').length,
      awaitingBadges: document.querySelectorAll('.dataset .awaiting_sources').length,
      requestedLists: document.querySelectorAll('.dataset .requested-sources').length,
      requestedItems: document.querySelectorAll('.dataset .requested-sources li').length,
      priorities: Array.from(document.querySelectorAll('.dataset')).map((item) => item.dataset.priority),
      p0Cards: document.querySelectorAll('.dataset[data-priority="P0"]').length,
      blockedCards: document.querySelectorAll('.dataset .blocked').length,
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      mainCount: document.querySelectorAll('main').length,
      returnTrustLink: document.querySelector('a[href="./content-trust-status.html"]')?.textContent?.trim() || '',
      returnPlatformLink: document.querySelector('a[href="./"]')?.textContent?.trim() || ''
    }));

    const findings = [];
    if (data.lang !== 'zh-CN') findings.push(`页面语言应为 zh-CN，实际 ${data.lang}`);
    if (data.notice !== REQUIRED_NOTICE) findings.push('统一教学参考提示未正确显示');
    if (data.datasetCount !== 5 || data.cards !== 5) findings.push(`登记数据集应为 5，实际统计 ${data.datasetCount} / 卡片 ${data.cards}`);
    if (data.metricCards !== 4) findings.push(`资料准备度摘要应有 4 项，实际 ${data.metricCards}`);
    if (data.readyCount !== 0) findings.push(`资料已齐可逐条复核必须为 0，实际 ${data.readyCount}`);
    if (data.sourceCount !== 0) findings.push(`资料清单记录当前必须为 0，实际 ${data.sourceCount}`);
    if (data.itemReviewCount !== 0) findings.push(`逐条复核记录当前必须为 0，实际 ${data.itemReviewCount}`);
    if (!data.boundaryText.includes('资料清单记录') || !data.boundaryText.includes('逐条复核记录') || !data.boundaryText.includes('不能互相代替')) {
      findings.push('页面没有清楚说明资料清单与逐条复核记录的边界');
    }
    if (data.awaitingBadges !== 5) findings.push(`5 个数据集都应保持 awaiting_sources，实际 ${data.awaitingBadges}`);
    if (data.p0Cards !== 2) findings.push(`P0 资料准备项应为 2，实际 ${data.p0Cards}`);
    if (data.priorities.slice(0, 2).some((priority) => priority !== 'P0')) findings.push(`前两项必须为 P0，实际顺序 ${data.priorities.join(' > ')}`);
    if (data.requestedLists !== 5 || data.requestedItems < 10) findings.push(`每个数据集必须显示至少两项资料请求，实际列表 ${data.requestedLists} / 条目 ${data.requestedItems}`);
    if (data.blockedCards !== 5) findings.push(`每个数据集必须显示当前阻断原因，实际 ${data.blockedCards}`);
    if (data.horizontalOverflow > 0) findings.push(`390px 手机宽度存在 ${data.horizontalOverflow}px 横向溢出`);
    if (data.mainCount !== 1) findings.push(`主要内容地标应为 1，实际 ${data.mainCount}`);
    if (!data.returnTrustLink.includes('可信度状态')) findings.push('缺少返回内容可信度状态入口');
    if (!data.returnPlatformLink.includes('CNC 新手训练平台')) findings.push('缺少返回 CNC 平台入口');
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

    await page.screenshot({ path: path.join(OUTPUT_DIR, 'content-trust-evidence-390x844.png'), fullPage: true });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'findings.txt'), (findings.length ? findings : [
      'PASS: 手机端如实显示 5 个数据集仍等待资料、0 条资料清单记录、0 条逐条复核记录，并明确两类记录不能互相代替。'
    ]).join('\n') + '\n');

    if (findings.length) throw new Error(findings.join('\n'));
    console.log('CNC 手机端内容复核资料准备度验证通过', data);
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
