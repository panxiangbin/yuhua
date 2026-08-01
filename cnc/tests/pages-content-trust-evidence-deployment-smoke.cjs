'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const RESULTS_DIR = path.join(ROOT, 'cnc', 'test-results');
const PUBLIC_ROOT = (process.env.CNC_PAGES_URL || 'https://panxiangbin.github.io/yuhua').replace(/\/+$/, '');
const MAIN_ROOT = (process.env.CNC_MAIN_RAW_ROOT || 'https://raw.githubusercontent.com/panxiangbin/yuhua/main').replace(/\/+$/, '');
const REQUIRED_NOTICE = '教学参考，需按机床说明书、现场工艺和空运行验证';
const REQUIRED_SOURCE_FIELDS = [
  'publisher',
  'documentTitle',
  'documentCodeOrRevision',
  'applicableSystemOrMachine',
  'pageOrSection',
  'reviewedAt',
  'reviewer',
  'verificationNotes'
];
const EXPECTED_PATHS = [
  'cnc/alarm-data.js',
  'cnc/gm-code-complete.js',
  'cnc/diagnosis-data.js',
  'cnc/weak-category-data.js',
  'cnc/learning-content-data.js'
];
const RESOURCES = [
  { path: 'cnc/content-trust-evidence.html', contract: 'content-trust-evidence-page' },
  { path: 'cnc/content-trust-evidence-ledger.json', contract: 'content-trust-evidence-ledger' }
];

fs.mkdirSync(RESULTS_DIR, { recursive: true });
const resultPath = path.join(RESULTS_DIR, 'pages-deployment-status-content-trust-evidence.json');
const errorPath = path.join(RESULTS_DIR, 'pages-deployment-status-content-trust-evidence-error.txt');
const diagnostics = { checkedAt: new Date().toISOString(), resources: [] };

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function cacheBusted(url) {
  const target = new URL(url);
  target.searchParams.set('verify-evidence-resource', `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return target.toString();
}

async function fetchBytes(url, label) {
  const response = await fetch(cacheBusted(url), {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
      'User-Agent': 'cnc-pages-content-trust-evidence-smoke'
    },
    redirect: 'follow'
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!response.ok) {
    throw new Error(`${label} HTTP ${response.status}：${buffer.toString('utf8', 0, 180)}`);
  }
  return {
    buffer,
    status: response.status,
    finalUrl: response.url,
    bytes: buffer.length,
    sha256: sha256(buffer),
    contentType: response.headers.get('content-type'),
    cacheControl: response.headers.get('cache-control'),
    age: response.headers.get('age'),
    etag: response.headers.get('etag'),
    lastModified: response.headers.get('last-modified')
  };
}

function assertEvidencePage(text, label) {
  const required = [
    '<html lang="zh-CN">',
    '<title>CNC 内容复核资料准备度</title>',
    'content-trust-evidence-ledger.json',
    "cache: 'no-store'",
    '教学参考，需按机床说明书、现场工艺和空运行验证',
    'ready-count',
    'source-count',
    'requested-sources',
    'blockedReason',
    '返回内容可信度状态',
    '返回 CNC 新手训练平台'
  ];
  for (const token of required) {
    if (!text.includes(token)) throw new Error(`${label}缺少证据准备度页面契约：${token}`);
  }
  return {
    languageChinese: true,
    ledgerNoStoreFetchPresent: true,
    readinessBoundaryPresent: true,
    returnLinksPresent: true
  };
}

function assertEvidenceLedger(text, label) {
  let ledger;
  try {
    ledger = JSON.parse(text);
  } catch (error) {
    throw new Error(`${label}不是有效 JSON：${error.message}`);
  }
  const datasets = Array.isArray(ledger.datasets) ? ledger.datasets : [];
  if (ledger.schemaVersion !== 1) throw new Error(`${label}schemaVersion 不是 1`);
  if (ledger.requiredNotice !== REQUIRED_NOTICE) throw new Error(`${label}统一教学提示不一致`);
  if (!Array.isArray(ledger.requiredSourceFields)) throw new Error(`${label}缺少 requiredSourceFields`);
  for (const field of REQUIRED_SOURCE_FIELDS) {
    if (!ledger.requiredSourceFields.includes(field)) throw new Error(`${label}缺少来源必填字段：${field}`);
  }
  if (datasets.length !== EXPECTED_PATHS.length) throw new Error(`${label}应登记 ${EXPECTED_PATHS.length} 个数据集，实际 ${datasets.length}`);
  for (const requiredPath of EXPECTED_PATHS) {
    const item = datasets.find((entry) => entry && entry.path === requiredPath);
    if (!item) throw new Error(`${label}缺少数据集：${requiredPath}`);
    if (!['P0', 'P1', 'P2'].includes(item.reviewPriority)) throw new Error(`${label}${requiredPath} 复核优先级无效`);
    if (item.state !== 'awaiting_sources') throw new Error(`${label}${requiredPath} 在没有来源记录时必须保持 awaiting_sources`);
    if (item.readyForItemReview !== false) throw new Error(`${label}${requiredPath} 不得标记为可开始逐条复核`);
    if (item.reviewedItemCount !== 0) throw new Error(`${label}${requiredPath} 不得伪造已复核条目`);
    if (!Array.isArray(item.sourceRecords) || item.sourceRecords.length !== 0) throw new Error(`${label}${requiredPath} 当前来源记录必须为 0`);
    if (!Array.isArray(item.requestedSources) || item.requestedSources.length < 2) throw new Error(`${label}${requiredPath} 资料请求不足`);
    if (!item.blockedReason || item.blockedReason.length < 18) throw new Error(`${label}${requiredPath} 缺少阻断原因`);
  }
  const p0 = datasets.filter((item) => item.reviewPriority === 'P0').map((item) => item.path).sort();
  const expectedP0 = ['cnc/alarm-data.js', 'cnc/gm-code-complete.js'].sort();
  if (JSON.stringify(p0) !== JSON.stringify(expectedP0)) throw new Error(`${label}P0 资料队列错误：${p0.join(', ')}`);
  const readyCount = datasets.filter((item) => item.readyForItemReview === true).length;
  const sourceRecordCount = datasets.reduce((sum, item) => sum + item.sourceRecords.length, 0);
  const reviewedItemCount = datasets.reduce((sum, item) => sum + item.reviewedItemCount, 0);
  if (readyCount !== 0 || sourceRecordCount !== 0 || reviewedItemCount !== 0) {
    throw new Error(`${label}不得在缺少来源时宣称已准备或已复核`);
  }
  return {
    schemaVersion: ledger.schemaVersion,
    datasetCount: datasets.length,
    p0Count: p0.length,
    awaitingSourcesCount: datasets.filter((item) => item.state === 'awaiting_sources').length,
    readyCount,
    sourceRecordCount,
    reviewedItemCount,
    requiredSourceFieldCount: REQUIRED_SOURCE_FIELDS.length
  };
}

function assertContract(resource, text, label) {
  return resource.contract === 'content-trust-evidence-page'
    ? assertEvidencePage(text, label)
    : assertEvidenceLedger(text, label);
}

async function waitForExactResource(resource) {
  const attempts = Number(process.env.CNC_PAGES_VERIFY_ATTEMPTS || 18);
  const intervalMs = Number(process.env.CNC_PAGES_VERIFY_INTERVAL_MS || 10000);
  const mainUrl = `${MAIN_ROOT}/${resource.path}`;
  const pagesUrl = `${PUBLIC_ROOT}/${resource.path}`;
  const attemptLog = [];
  let lastMain;
  let lastPages;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      lastMain = await fetchBytes(mainUrl, 'main资源');
      lastPages = await fetchBytes(pagesUrl, 'Pages公网资源');
      const matched = lastMain.sha256 === lastPages.sha256 && lastMain.bytes === lastPages.bytes;
      attemptLog.push({
        attempt,
        at: new Date().toISOString(),
        main: { ...lastMain, buffer: undefined },
        pages: { ...lastPages, buffer: undefined },
        matched
      });
      if (matched) return { mainUrl, pagesUrl, attempts: attemptLog, main: lastMain, pages: lastPages };
    } catch (error) {
      attemptLog.push({ attempt, at: new Date().toISOString(), error: error.message });
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  const mainSummary = lastMain ? `${lastMain.sha256}/${lastMain.bytes}` : '未读取';
  const pagesSummary = lastPages ? `${lastPages.sha256}/${lastPages.bytes}` : '未读取';
  throw new Error(`${resource.path} 未与 main 逐字节一致：main=${mainSummary}，Pages=${pagesSummary}`);
}

(async () => {
  try {
    for (const resource of RESOURCES) {
      const localBuffer = fs.readFileSync(path.join(ROOT, resource.path));
      const localText = localBuffer.toString('utf8').replace(/^\uFEFF/, '');
      const localContract = assertContract(resource, localText, '当前分支本地资源');
      const published = await waitForExactResource(resource);
      const mainText = published.main.buffer.toString('utf8').replace(/^\uFEFF/, '');
      const pagesText = published.pages.buffer.toString('utf8').replace(/^\uFEFF/, '');
      const mainContract = assertContract(resource, mainText, 'main资源');
      const pagesContract = assertContract(resource, pagesText, 'Pages公网资源');
      diagnostics.resources.push({
        path: resource.path,
        contract: resource.contract,
        mainUrl: published.mainUrl,
        pagesUrl: published.pagesUrl,
        attempts: published.attempts,
        local: { bytes: localBuffer.length, sha256: sha256(localBuffer), contract: localContract },
        main: { ...published.main, buffer: undefined, contract: mainContract },
        pages: { ...published.pages, buffer: undefined, contract: pagesContract },
        verified: { publicReachable: true, exactBytesMatch: true, exactSha256Match: true }
      });
      console.log(`CNC Pages evidence resource verified: ${resource.path} ${published.pages.sha256}`);
    }
    diagnostics.verified = {
      resourceCount: RESOURCES.length,
      allPublicReachable: true,
      allExactBytesMatch: true,
      allExactSha256Match: true,
      noUnverifiedContentClaim: true
    };
    fs.writeFileSync(resultPath, JSON.stringify(diagnostics, null, 2) + '\n');
  } catch (error) {
    diagnostics.error = String(error && error.stack || error);
    fs.writeFileSync(resultPath, JSON.stringify(diagnostics, null, 2) + '\n');
    fs.writeFileSync(errorPath, diagnostics.error + '\n');
    throw error;
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
