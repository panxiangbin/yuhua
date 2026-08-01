'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { validateLedger } = require('../tools/validate-content-trust-evidence-ledger.cjs');

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
const ALLOWED_STATES = ['awaiting_sources', 'sources_ready', 'in_review', 'review_complete'];
const MANIFEST_PATH = 'cnc/content-trust-manifest.json';
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

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label}不是有效 JSON：${error.message}`);
  }
}

function assertEvidencePage(text, label) {
  const required = [
    '<html lang="zh-CN">',
    '<title>CNC 内容复核资料准备度</title>',
    'content-trust-evidence-ledger.json',
    "cache: 'no-store'",
    REQUIRED_NOTICE,
    'ready-count',
    'source-count',
    'item-review-count',
    'sourceRecords',
    'itemReviewRecords',
    'reviewedItemCount',
    '资料清单记录',
    '逐条复核记录',
    '两者不能互相代替',
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
    separateRecordCounts: true,
    itemReviewCountPresent: true,
    returnLinksPresent: true
  };
}

function assertEvidenceLedger(text, manifest, label) {
  const ledger = parseJson(text, label);
  const validation = validateLedger(ledger, manifest);
  if (validation.errors.length) {
    throw new Error(`${label}未通过正式证据台账校验：\n- ${validation.errors.join('\n- ')}`);
  }

  const datasets = Array.isArray(ledger.datasets) ? ledger.datasets : [];
  if (ledger.schemaVersion !== 1) throw new Error(`${label}schemaVersion 不是 1`);
  if (ledger.requiredNotice !== REQUIRED_NOTICE) throw new Error(`${label}统一教学提示不一致`);
  if (!Array.isArray(ledger.requiredSourceFields)) throw new Error(`${label}缺少 requiredSourceFields`);
  for (const field of REQUIRED_SOURCE_FIELDS) {
    if (!ledger.requiredSourceFields.includes(field)) throw new Error(`${label}缺少来源必填字段：${field}`);
  }
  for (const state of ALLOWED_STATES) {
    if (!ledger.stateDefinitions || typeof ledger.stateDefinitions[state] !== 'string' || ledger.stateDefinitions[state].trim().length < 18) {
      throw new Error(`${label}缺少清楚的状态定义：${state}`);
    }
  }
  if (datasets.length !== EXPECTED_PATHS.length) {
    throw new Error(`${label}应登记 ${EXPECTED_PATHS.length} 个数据集，实际 ${datasets.length}`);
  }

  let reviewedItemCountMatchesUniqueItemKeys = true;
  let stateTransitionConsistent = true;
  let sourceRecordCount = 0;
  let itemReviewRecordCount = 0;
  let reviewedItemCount = 0;

  for (const requiredPath of EXPECTED_PATHS) {
    const item = datasets.find((entry) => entry && entry.path === requiredPath);
    if (!item) throw new Error(`${label}缺少数据集：${requiredPath}`);
    if (!['P0', 'P1', 'P2'].includes(item.reviewPriority)) throw new Error(`${label}${requiredPath} 复核优先级无效`);
    if (!ALLOWED_STATES.includes(item.state)) throw new Error(`${label}${requiredPath} 状态无效：${item.state}`);
    if (!Array.isArray(item.sourceRecords)) throw new Error(`${label}${requiredPath}.sourceRecords 必须为数组`);
    if (!Array.isArray(item.itemReviewRecords)) throw new Error(`${label}${requiredPath}.itemReviewRecords 必须为数组`);
    if (!Array.isArray(item.requestedSources) || item.requestedSources.length < 2) throw new Error(`${label}${requiredPath} 资料请求不足`);
    if (!item.blockedReason || item.blockedReason.trim().length < 18) throw new Error(`${label}${requiredPath} 缺少阻断原因`);

    const uniqueItemKeys = new Set(item.itemReviewRecords.map((record) => record && record.itemKey).filter(Boolean));
    if (item.reviewedItemCount !== uniqueItemKeys.size) {
      reviewedItemCountMatchesUniqueItemKeys = false;
      throw new Error(`${label}${requiredPath}.reviewedItemCount 与唯一 itemKey 数量不一致`);
    }

    const hasSources = item.sourceRecords.length > 0;
    const hasItemReviews = item.itemReviewRecords.length > 0;
    const transitionValid =
      (item.state === 'awaiting_sources' && item.readyForItemReview === false && !hasSources && !hasItemReviews) ||
      (item.state === 'sources_ready' && item.readyForItemReview === true && hasSources && !hasItemReviews) ||
      (item.state === 'in_review' && item.readyForItemReview === true && hasSources && hasItemReviews) ||
      (item.state === 'review_complete' && item.readyForItemReview === true && hasSources && hasItemReviews);
    if (!transitionValid) {
      stateTransitionConsistent = false;
      throw new Error(`${label}${requiredPath} 状态、资料清单和逐条复核记录不一致`);
    }

    sourceRecordCount += item.sourceRecords.length;
    itemReviewRecordCount += item.itemReviewRecords.length;
    reviewedItemCount += item.reviewedItemCount;
  }

  const p0 = datasets.filter((item) => item.reviewPriority === 'P0').map((item) => item.path).sort();
  const expectedP0 = ['cnc/alarm-data.js', 'cnc/gm-code-complete.js'].sort();
  if (JSON.stringify(p0) !== JSON.stringify(expectedP0)) throw new Error(`${label}P0 资料队列错误：${p0.join(', ')}`);

  return {
    schemaVersion: ledger.schemaVersion,
    datasetCount: datasets.length,
    p0Count: p0.length,
    stateDefinitions: ALLOWED_STATES.length,
    awaitingSourcesCount: datasets.filter((item) => item.state === 'awaiting_sources').length,
    sourcesReadyCount: datasets.filter((item) => item.state === 'sources_ready').length,
    inReviewCount: datasets.filter((item) => item.state === 'in_review').length,
    reviewCompleteCount: datasets.filter((item) => item.state === 'review_complete').length,
    readyCount: datasets.filter((item) => item.readyForItemReview === true).length,
    sourceRecordCount,
    itemReviewRecordCount,
    reviewedItemCount,
    requiredSourceFieldCount: REQUIRED_SOURCE_FIELDS.length,
    separateRecordCounts: true,
    reviewedItemCountMatchesUniqueItemKeys,
    stateTransitionConsistent,
    noUnverifiedContentClaim: true,
    validatorCounts: validation.counts
  };
}

function assertContract(resource, text, label, manifest) {
  return resource.contract === 'content-trust-evidence-page'
    ? assertEvidencePage(text, label)
    : assertEvidenceLedger(text, manifest, label);
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
    const localManifestText = fs.readFileSync(path.join(ROOT, MANIFEST_PATH), 'utf8').replace(/^\uFEFF/, '');
    const localManifest = parseJson(localManifestText, '当前分支可信度清单');
    const publishedManifest = await waitForExactResource({ path: MANIFEST_PATH, contract: 'content-trust-manifest-reference' });
    const mainManifest = parseJson(publishedManifest.main.buffer.toString('utf8').replace(/^\uFEFF/, ''), 'main可信度清单');
    const pagesManifest = parseJson(publishedManifest.pages.buffer.toString('utf8').replace(/^\uFEFF/, ''), 'Pages公网可信度清单');

    diagnostics.manifestReference = {
      path: MANIFEST_PATH,
      mainUrl: publishedManifest.mainUrl,
      pagesUrl: publishedManifest.pagesUrl,
      attempts: publishedManifest.attempts,
      local: { bytes: Buffer.byteLength(localManifestText), sha256: sha256(Buffer.from(localManifestText)) },
      main: { ...publishedManifest.main, buffer: undefined },
      pages: { ...publishedManifest.pages, buffer: undefined },
      verified: { publicReachable: true, exactBytesMatch: true, exactSha256Match: true }
    };

    for (const resource of RESOURCES) {
      const localBuffer = fs.readFileSync(path.join(ROOT, resource.path));
      const localText = localBuffer.toString('utf8').replace(/^\uFEFF/, '');
      const localContract = assertContract(resource, localText, '当前分支本地资源', localManifest);
      const published = await waitForExactResource(resource);
      const mainText = published.main.buffer.toString('utf8').replace(/^\uFEFF/, '');
      const pagesText = published.pages.buffer.toString('utf8').replace(/^\uFEFF/, '');
      const mainContract = assertContract(resource, mainText, 'main资源', mainManifest);
      const pagesContract = assertContract(resource, pagesText, 'Pages公网资源', pagesManifest);
      diagnostics.resources.push({
        path: resource.path,
        contract: resource.contract,
        mainUrl: published.mainUrl,
        pagesUrl: published.pagesUrl,
        attempts: published.attempts,
        local: { bytes: localBuffer.length, sha256: sha256(localBuffer), contract: localContract },
        main: { ...published.main, buffer: undefined, contract: mainContract },
        pages: { ...published.pages, buffer: undefined, contract: pagesContract },
        verified: {
          publicReachable: true,
          exactBytesMatch: true,
          exactSha256Match: true,
          semanticContractMatch: true
        }
      });
      console.log(`CNC Pages evidence resource verified: ${resource.path} ${published.pages.sha256}`);
    }

    diagnostics.verified = {
      resourceCount: RESOURCES.length,
      allPublicReachable: true,
      allExactBytesMatch: true,
      allExactSha256Match: true,
      allSemanticContractsMatch: true,
      separateRecordCounts: true,
      reviewedItemCountMatchesUniqueItemKeys: true,
      stateTransitionConsistent: true,
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
