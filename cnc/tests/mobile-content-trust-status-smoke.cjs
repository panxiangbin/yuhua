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
    await page.waitForFunction(() => document.querySelectorAll('.dataset').length >= 5 && document.querySelectorAll('.queue-item').length >= 5, null, { timeout: 10000 });

    const data = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      title: document.title,
      notice: document.getElementById('required-notice')?.textContent?.trim(),
      datasetCount: Number(document.getElementById('dataset-count')?.textContent),
      pendingCount: Number(document.getElementById('pending-count')?.textContent),
      p0Count: Number(document.getElementById('p0-count')?.textContent),
      operationalCount: Number(document.getElementById('operational-count')?.textContent),
      cards: document.querySelectorAll('.dataset').length,
      pendingBadges: document.querySelectorAll('.dataset .pending_manual_verification,.dataset .pending_system_scope_review').length,
      reviewedBadges: document.querySelectorAll('.dataset .reviewed_scope').length,
      queueItems: document.querySelectorAll('.queue-item').length,
      queuePriorities: Array.from(document.querySelectorAll('.queue-item')).map((item) => item.dataset.priority),
      queueP0Items: document.querySelectorAll('.queue-item[data-priority="P0"]').length,
      evidenceLists: document.querySelectorAll('.dataset .evidence-list').length,
      evidenceItems: document.querySelectorAll('.dataset .evidence-list li').length,
      datasetNextActions: document.querySelectorAll('.dataset .next-action').length,
      queueNextActions: document.querySelectorAll('.queue-item .next-action').length,
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      mainCount: document.querySelectorAll('main').length,
      returnLink: document.querySelector('a[href="./"]')?.textContent?.trim() || ''
    }));

    const findings = [];
    if (data.lang !== 'zh-CN') findings.push(`页面语言应为 zh-CN，实际为 ${data.lang}`);
    if (data.notice !== REQUIRED_NOTICE) findings.push('统一教学参考提示未正确显示');
    if (data.datasetCount !== 5 || data.cards !== 5) findings.push(`登记数据集应为 5，实际统计 ${data.datasetCount} / 卡片 ${data.cards}`);
    if (data.pendingCount !== 4 || data.pendingBadges !== 4) findings.push(`待逐条复核数据集应为 4，实际 ${data.pendingCount} / 标签 ${data.pendingBadges}`);
    if (data.p0Count !== 2 || data.queueP0Items !== 2) findings.push(`P0 优先复核数据集应为 2，实际统计 ${data.p0Count} / 队列 ${data.queueP0Items}`);
    if (data.operationalCount !== 0) findings.push(`可直接上机使用必须为 0，实际 ${data.operationalCount}`);
    if (data.reviewedBadges !== 1) findings.push(`reviewed_scope 应仅有课程数据 1 项，实际 ${data.reviewedBadges}`);
    if (data.queueItems !== 5) findings.push(`复核队列应显示 5 项，实际 ${data.queueItems}`);
    if (data.queuePriorities.slice(0, 2).some((priority) => priority !== 'P0')) findings.push(`复核队列前两项必须为 P0，实际顺序 ${data.queuePriorities.join(' > ')}`);
    const priorityRank = { P0: 0, P1: 1, P2: 2 };
    for (let index = 1; index < data.queuePriorities.length; index += 1) {
      if ((priorityRank[data.queuePriorities[index]] ?? 99) < (priorityRank[data.queuePriorities[index - 1]] ?? 99)) {
        findings.push(`复核队列优先级排序错误：${data.queuePriorities.join(' > ')}`);
        break;
      }
    }
    if (data.evidenceLists !== 5 || data.evidenceItems < 10) findings.push(`每个数据集必须显示至少两项证据要求，实际列表 ${data.evidenceLists} / 条目 ${data.evidenceItems}`);
    if (data.datasetNextActions !== 5 || data.queueNextActions !== 5) findings.push(`数据集和队列均必须显示下一步动作，实际 ${data.datasetNextActions} / ${data.queueNextActions}`);
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
    fs.writeFileSync(path.join(OUTPUT_DIR, 'findings.txt'), (findings.length ? findings : ['PASS: 手机端可信度状态页按 P0→P2 显示复核队列、证据要求，且保持 0 项可直接上机使用。']).join('\n') + '\n');

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
