const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const resultsDir = path.resolve(root, 'cnc/test-results');
fs.mkdirSync(resultsDir, { recursive: true });

const publicRoot = (process.env.CNC_PAGES_URL || 'https://panxiangbin.github.io/yuhua').replace(/\/+$/, '');
const mainRoot = (process.env.CNC_MAIN_RAW_ROOT || 'https://raw.githubusercontent.com/panxiangbin/yuhua/main').replace(/\/+$/, '');
const defaultResourceByContract = {
  'mobile-trust-nav': 'cnc/mobile-trust-nav.js',
  'knowledge-tree-lazy': 'cnc/ui-knowledge-tree.js',
  'content-trust-page': 'cnc/content-trust-status.html',
  'content-trust-manifest': 'cnc/content-trust-manifest.json',
  'simulator-hub-data': 'cnc/simulator-hub.html'
};
const resourceContract = String(process.env.CNC_EXACT_RESOURCE_CONTRACT || 'mobile-trust-nav');
if (!Object.prototype.hasOwnProperty.call(defaultResourceByContract, resourceContract)) {
  throw new Error(`不支持的具体资源契约：${resourceContract}`);
}
const resourcePath = String(process.env.CNC_EXACT_RESOURCE_PATH || defaultResourceByContract[resourceContract]).replace(/^\/+/, '');
const expectedResourcePath = defaultResourceByContract[resourceContract];
if (resourcePath !== expectedResourcePath) {
  throw new Error(`具体资源路径与契约不匹配：${resourceContract} 应使用 ${expectedResourcePath}，实际为 ${resourcePath}`);
}
const publicResourceUrl = `${publicRoot}/${resourcePath}`;
const mainResourceUrl = `${mainRoot}/${resourcePath}`;
const resultId = resourceContract.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
const resultPath = path.join(resultsDir, `pages-deployment-status-resource-${resultId}.json`);
const errorPath = path.join(resultsDir, `pages-deployment-status-resource-${resultId}-error.txt`);
const diagnostics = {
  checkedAt: new Date().toISOString(),
  resourcePath,
  resourceContract,
  mainResourceUrl,
  publicResourceUrl,
  attempts: []
};

function cacheBusted(url) {
  const target = new URL(url);
  target.searchParams.set('verify-resource', `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return target.toString();
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function fetchBytes(url, label) {
  const requestUrl = cacheBusted(url);
  const response = await fetch(requestUrl, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
      'User-Agent': 'cnc-pages-exact-resource-smoke'
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

function assertMobileTrustNavContract(text, label) {
  const required = [
    'window.CNC_TRUST_NAV',
    'window.CNC_ACCESSIBILITY_FOUNDATION',
    'var SYNC_DELAYS = [0, 80, 240, 600]',
    'polling: false',
    'observer: false'
  ];
  for (const token of required) {
    if (!text.includes(token)) throw new Error(`${label}缺少无障碍同步契约：${token}`);
  }
  if (!/var\s+BUILD\s*=\s*['"]20\d{6}[a-z0-9-]*['"]/.test(text)) {
    throw new Error(`${label}缺少 mobile-trust-nav 构建标识`);
  }
  if (/new\s+MutationObserver\s*\(/.test(text)) {
    throw new Error(`${label}重新引入全局 MutationObserver，可能造成无障碍同步微任务循环`);
  }
  return {
    accessibilitySyncContractPresent: true,
    globalMutationObserverAbsent: true
  };
}

function assertKnowledgeTreeLazyContract(text, label) {
  const required = [
    'materializeChildren(nodeEl, node, childLevel)',
    "group.dataset.rendered === 'true'",
    'data-rendered="false"',
    'if (open) this.materializeChildren(nodeEl, node, level + 1)',
    'if (initiallyOpen && hasChildren) this.materializeChildren(nodeEl, node, level + 1)'
  ];
  for (const token of required) {
    if (!text.includes(token)) throw new Error(`${label}缺少知识树按需渲染契约：${token}`);
  }
  if (/if\s*\(hasChildren\)\s*node\.children\.forEach/.test(text)) {
    throw new Error(`${label}恢复了知识树全量递归首屏渲染`);
  }
  return {
    lazyMaterializationPresent: true,
    fullRecursiveFirstPaintAbsent: true
  };
}

function assertContentTrustPageContract(text, label) {
  const required = [
    '<html lang="zh-CN">',
    'CONTENT TRUST STATUS',
    'content-trust-manifest.json',
    '教学参考，需按机床说明书、现场工艺和空运行验证',
    'item.allowOperationalUse === true',
    '不可直接上机使用',
    '返回 CNC 新手训练平台'
  ];
  for (const token of required) {
    if (!text.includes(token)) throw new Error(`${label}缺少内容可信度状态页契约：${token}`);
  }
  if (!text.includes("cache: 'no-store'")) {
    throw new Error(`${label}未使用 no-store 读取可信度清单，可能显示旧状态`);
  }
  return {
    publicStatusPagePresent: true,
    manifestNoStoreFetchPresent: true,
    operationalBoundaryPresent: true
  };
}

function assertContentTrustManifestContract(text, label) {
  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch (error) {
    throw new Error(`${label}不是有效 JSON：${error.message}`);
  }
  const requiredNotice = '教学参考，需按机床说明书、现场工艺和空运行验证';
  const requiredPaths = [
    'cnc/learning-content-data.js',
    'cnc/alarm-data.js',
    'cnc/diagnosis-data.js',
    'cnc/gm-code-complete.js',
    'cnc/weak-category-data.js'
  ];
  const datasets = Array.isArray(manifest.datasets) ? manifest.datasets : [];
  if (manifest.schemaVersion !== 1) throw new Error(`${label}schemaVersion 不是 1`);
  if (manifest.requiredNotice !== requiredNotice) throw new Error(`${label}统一教学参考提示不一致`);
  if (datasets.length < requiredPaths.length) throw new Error(`${label}登记数据集少于 ${requiredPaths.length} 个`);
  for (const requiredPath of requiredPaths) {
    const item = datasets.find(entry => entry && entry.path === requiredPath);
    if (!item) throw new Error(`${label}缺少可信度登记：${requiredPath}`);
    if (item.allowOperationalUse !== false) throw new Error(`${label}错误放开直接上机使用：${requiredPath}`);
    if (item.notice !== requiredNotice) throw new Error(`${label}数据集提示不一致：${requiredPath}`);
  }
  const pendingCount = datasets.filter(item => String(item && item.status || '').startsWith('pending_')).length;
  const operationalCount = datasets.filter(item => item && item.allowOperationalUse === true).length;
  if (pendingCount < 4) throw new Error(`${label}待逐条复核数据集少于 4 个`);
  if (operationalCount !== 0) throw new Error(`${label}存在被标记为可直接上机的数据集`);
  return {
    schemaVersion: manifest.schemaVersion,
    datasetCount: datasets.length,
    pendingCount,
    operationalCount,
    requiredNoticePresent: true
  };
}

function assertSimulatorHubDataContract(text, label) {
  const required = [
    'data.records&&data.records[id]',
    'data.simulators&&data.simulators[id]',
    'recordSignature(record)',
    'window.CNC_SIMULATOR_HUB',
    '已读取 ${compatRecords}/13 项本机训练记录',
    './icon-192.svg',
    '请以机床原厂手册、企业安全制度和现场条件为准'
  ];
  for (const token of required) {
    if (!text.includes(token)) throw new Error(`${label}缺少模拟训练数据可靠性契约：${token}`);
  }
  if (text.includes("function item(data,id){return data[id]||data.simulators?.[id]||{}}")) {
    throw new Error(`${label}恢复了仅兼容旧 simulators 的总览读取逻辑`);
  }
  return {
    recordsSchemaPresent: true,
    legacySimulatorsSchemaPresent: true,
    duplicateRecordGuardPresent: true,
    diagnosticsSnapshotPresent: true,
    explicitFaviconPresent: true,
    machineManualBoundaryPresent: true
  };
}

function assertResourceContract(text, label) {
  if (resourceContract === 'mobile-trust-nav') return assertMobileTrustNavContract(text, label);
  if (resourceContract === 'knowledge-tree-lazy') return assertKnowledgeTreeLazyContract(text, label);
  if (resourceContract === 'content-trust-page') return assertContentTrustPageContract(text, label);
  if (resourceContract === 'simulator-hub-data') return assertSimulatorHubDataContract(text, label);
  return assertContentTrustManifestContract(text, label);
}

async function waitForExactResource() {
  const attempts = Number(process.env.CNC_PAGES_VERIFY_ATTEMPTS || 18);
  const intervalMs = Number(process.env.CNC_PAGES_VERIFY_INTERVAL_MS || 10000);
  let lastMain;
  let lastPages;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      lastMain = await fetchBytes(mainResourceUrl, 'main资源');
      lastPages = await fetchBytes(publicResourceUrl, 'Pages公网资源');
      const matched = lastMain.sha256 === lastPages.sha256 && lastMain.bytes === lastPages.bytes;
      diagnostics.attempts.push({
        attempt,
        at: new Date().toISOString(),
        main: { ...lastMain, buffer: undefined },
        pages: { ...lastPages, buffer: undefined },
        matched
      });
      if (matched) return { main: lastMain, pages: lastPages };
    } catch (error) {
      diagnostics.attempts.push({ attempt, at: new Date().toISOString(), error: error.message });
    }
    if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  const mainSummary = lastMain ? `${lastMain.sha256}/${lastMain.bytes}` : '未读取';
  const pagesSummary = lastPages ? `${lastPages.sha256}/${lastPages.bytes}` : '未读取';
  throw new Error(`Pages具体资源未与main逐字节一致：main=${mainSummary}，Pages=${pagesSummary}`);
}

(async () => {
  try {
    const localPath = path.join(root, resourcePath);
    const localBuffer = fs.readFileSync(localPath);
    const localText = localBuffer.toString('utf8').replace(/^\uFEFF/, '');
    const localContract = assertResourceContract(localText, '当前分支本地资源');
    diagnostics.local = {
      path: localPath,
      bytes: localBuffer.length,
      sha256: sha256(localBuffer),
      contract: localContract
    };

    const published = await waitForExactResource();
    const mainText = published.main.buffer.toString('utf8').replace(/^\uFEFF/, '');
    const pagesText = published.pages.buffer.toString('utf8').replace(/^\uFEFF/, '');
    const mainContract = assertResourceContract(mainText, 'main资源');
    const pagesContract = assertResourceContract(pagesText, 'Pages公网资源');

    diagnostics.main = { ...published.main, buffer: undefined, contract: mainContract };
    diagnostics.pages = { ...published.pages, buffer: undefined, contract: pagesContract };
    diagnostics.verified = {
      publicReachable: true,
      exactBytesMatch: true,
      exactSha256Match: true,
      resourceContract,
      contractChecks: pagesContract
    };

    fs.writeFileSync(resultPath, JSON.stringify(diagnostics, null, 2));
    console.log(`CNC Pages exact resource verified: ${resourcePath} ${published.pages.sha256} (${resourceContract})`);
  } catch (error) {
    diagnostics.error = String(error && error.stack || error);
    fs.writeFileSync(resultPath, JSON.stringify(diagnostics, null, 2));
    fs.writeFileSync(errorPath, diagnostics.error);
    throw error;
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
