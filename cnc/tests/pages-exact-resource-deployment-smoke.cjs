const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const resultsDir = path.resolve(root, 'cnc/test-results');
fs.mkdirSync(resultsDir, { recursive: true });

const publicRoot = (process.env.CNC_PAGES_URL || 'https://panxiangbin.github.io/yuhua').replace(/\/+$/, '');
const mainRoot = (process.env.CNC_MAIN_RAW_ROOT || 'https://raw.githubusercontent.com/panxiangbin/yuhua/main').replace(/\/+$/, '');
const resourcePath = String(process.env.CNC_EXACT_RESOURCE_PATH || 'cnc/mobile-trust-nav.js').replace(/^\/+/, '');
const publicResourceUrl = `${publicRoot}/${resourcePath}`;
const mainResourceUrl = `${mainRoot}/${resourcePath}`;
const diagnostics = {
  checkedAt: new Date().toISOString(),
  resourcePath,
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

function assertResourceContract(text, label) {
  if (!text.includes("var BUILD = '20260721s';")) {
    throw new Error(`${label}缺少 mobile-trust-nav 构建标识`);
  }
  if (!text.includes('window.CNC_TRUST_NAV')) {
    throw new Error(`${label}缺少 CNC_TRUST_NAV 就绪契约`);
  }
  if (/new\s+MutationObserver\s*\(/.test(text)) {
    throw new Error(`${label}重新引入全局 MutationObserver，可能造成无障碍同步微任务循环`);
  }
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
    assertResourceContract(localText, '当前分支本地资源');
    diagnostics.local = {
      path: localPath,
      bytes: localBuffer.length,
      sha256: sha256(localBuffer)
    };

    const published = await waitForExactResource();
    const mainText = published.main.buffer.toString('utf8').replace(/^\uFEFF/, '');
    const pagesText = published.pages.buffer.toString('utf8').replace(/^\uFEFF/, '');
    assertResourceContract(mainText, 'main资源');
    assertResourceContract(pagesText, 'Pages公网资源');

    diagnostics.main = { ...published.main, buffer: undefined };
    diagnostics.pages = { ...published.pages, buffer: undefined };
    diagnostics.verified = {
      publicReachable: true,
      exactBytesMatch: true,
      exactSha256Match: true,
      accessibilitySyncContractPresent: true,
      globalMutationObserverAbsent: true
    };

    fs.writeFileSync(
      path.join(resultsDir, 'pages-deployment-status-resource-result.json'),
      JSON.stringify(diagnostics, null, 2)
    );
    console.log(`CNC Pages exact resource verified: ${resourcePath} ${published.pages.sha256}`);
  } catch (error) {
    diagnostics.error = String(error && error.stack || error);
    fs.writeFileSync(
      path.join(resultsDir, 'pages-deployment-status-resource-result.json'),
      JSON.stringify(diagnostics, null, 2)
    );
    fs.writeFileSync(
      path.join(resultsDir, 'pages-deployment-status-resource-error.txt'),
      diagnostics.error
    );
    throw error;
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
