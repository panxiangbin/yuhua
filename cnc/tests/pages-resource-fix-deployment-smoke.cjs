const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const resultsDir = path.resolve(root, 'cnc/test-results');
fs.mkdirSync(resultsDir, { recursive: true });

const publicRoot = (process.env.CNC_PAGES_URL || 'https://panxiangbin.github.io/yuhua').replace(/\/+$/, '');
const mainRoot = (process.env.CNC_MAIN_RAW_ROOT || 'https://raw.githubusercontent.com/panxiangbin/yuhua/main').replace(/\/+$/, '');
const resultPath = path.join(resultsDir, 'pages-deployment-status-resource-fix-propagation.json');
const errorPath = path.join(resultsDir, 'pages-deployment-status-resource-fix-propagation-error.txt');

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function cacheBusted(url, resourceId) {
  const target = new URL(url);
  target.searchParams.set('verify-resource-fix', `${resourceId}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return target.toString();
}

async function fetchBytes(url, label, resourceId) {
  const response = await fetch(cacheBusted(url, resourceId), {
    cache: 'no-store',
    redirect: 'follow',
    headers: {
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
      'User-Agent': 'cnc-pages-resource-fix-deployment-smoke'
    }
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

function assertTrainingProfileContract(text, label) {
  const required = [
    '<html lang="zh-CN">',
    '<meta name="robots" content="noindex">',
    '<meta http-equiv="refresh" content="0;url=./profile.html">',
    "'./profile.html' + window.location.search + window.location.hash",
    'window.location.replace(target)',
    '学习记录不会在这里被修改',
    '<a href="./profile.html">继续查看成长档案</a>',
    'min-height:48px'
  ];
  for (const token of required) {
    if (!text.includes(token)) throw new Error(`${label}缺少成长档案兼容入口契约：${token}`);
  }
  for (const forbidden of ['localStorage', 'sessionStorage', 'indexedDB', 'fetch(', 'http://', 'https://']) {
    if (text.includes(forbidden)) throw new Error(`${label}兼容入口包含越界行为：${forbidden}`);
  }
  return {
    sameSiteTarget: './profile.html',
    queryAndHashPreserved: true,
    learningDataMutationAbsent: true,
    manualFallbackPresent: true,
    minimumTouchTargetPx: 48
  };
}

function assertKnowledgeImagePlaceholderContract(text, label) {
  const required = [
    '<svg xmlns="http://www.w3.org/2000/svg"',
    'viewBox="0 0 800 450"',
    'role="img"',
    'aria-labelledby="title desc"',
    '<title id="title">CNC教学图片暂缺</title>',
    '<desc id="desc">浅色工业风占位图，提示当前知识点的教学图片正在补充。</desc>',
    '教学图片正在补充',
    '请以课程文字、原厂手册和现场条件为准'
  ];
  for (const token of required) {
    if (!text.includes(token)) throw new Error(`${label}缺少教学图片回退契约：${token}`);
  }
  for (const forbidden of ['<script', '<foreignObject', 'javascript:', 'data:text/html', 'http://']) {
    if (text.includes(forbidden)) throw new Error(`${label}教学图片回退包含不安全内容：${forbidden}`);
  }
  return {
    accessibleNamePresent: true,
    accessibleDescriptionPresent: true,
    fixedViewBoxPresent: true,
    activeContentAbsent: true,
    technicalBoundaryPresent: true
  };
}

const resources = [
  {
    id: 'training-profile-compat',
    path: 'cnc/training-profile.html',
    assertContract: assertTrainingProfileContract
  },
  {
    id: 'knowledge-image-placeholder',
    path: 'cnc/assets/images/batch01_core/placeholder.svg',
    assertContract: assertKnowledgeImagePlaceholderContract
  }
];

const diagnostics = {
  checkedAt: new Date().toISOString(),
  attempts: [],
  resources: {}
};

async function readResourcePair(resource) {
  const mainUrl = `${mainRoot}/${resource.path}`;
  const publicUrl = `${publicRoot}/${resource.path}`;
  const [main, pages] = await Promise.all([
    fetchBytes(mainUrl, `${resource.id} main资源`, resource.id),
    fetchBytes(publicUrl, `${resource.id} Pages公网资源`, resource.id)
  ]);
  return {
    mainUrl,
    publicUrl,
    main,
    pages,
    matched: main.sha256 === pages.sha256 && main.bytes === pages.bytes
  };
}

async function waitForExactResources() {
  const attempts = Number(process.env.CNC_PAGES_VERIFY_ATTEMPTS || 18);
  const intervalMs = Number(process.env.CNC_PAGES_VERIFY_INTERVAL_MS || 10000);
  let latest = [];

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const attemptRecord = { attempt, at: new Date().toISOString(), resources: [] };
    latest = [];
    let allMatched = true;

    for (const resource of resources) {
      try {
        const pair = await readResourcePair(resource);
        latest.push({ resource, pair });
        attemptRecord.resources.push({
          id: resource.id,
          path: resource.path,
          main: { ...pair.main, buffer: undefined },
          pages: { ...pair.pages, buffer: undefined },
          matched: pair.matched
        });
        if (!pair.matched) allMatched = false;
      } catch (error) {
        allMatched = false;
        attemptRecord.resources.push({ id: resource.id, path: resource.path, error: error.message });
      }
    }

    diagnostics.attempts.push(attemptRecord);
    if (allMatched && latest.length === resources.length) return latest;
    if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  const summary = latest.map(({ resource, pair }) => (
    `${resource.id}:main=${pair.main.sha256}/${pair.main.bytes},pages=${pair.pages.sha256}/${pair.pages.bytes}`
  )).join('；') || '未成功读取资源对';
  throw new Error(`Pages修复资源未与main逐字节一致：${summary}`);
}

(async () => {
  try {
    for (const resource of resources) {
      const localPath = path.join(root, resource.path);
      if (!fs.existsSync(localPath)) throw new Error(`当前分支缺少资源：${resource.path}`);
      const localBuffer = fs.readFileSync(localPath);
      if (localBuffer.length === 0) throw new Error(`当前分支资源为空：${resource.path}`);
      const localText = localBuffer.toString('utf8').replace(/^\uFEFF/, '');
      diagnostics.resources[resource.id] = {
        path: resource.path,
        local: {
          bytes: localBuffer.length,
          sha256: sha256(localBuffer),
          contract: resource.assertContract(localText, `${resource.id} 当前分支资源`)
        }
      };
    }

    const published = await waitForExactResources();
    for (const { resource, pair } of published) {
      const mainText = pair.main.buffer.toString('utf8').replace(/^\uFEFF/, '');
      const pagesText = pair.pages.buffer.toString('utf8').replace(/^\uFEFF/, '');
      const mainContract = resource.assertContract(mainText, `${resource.id} main资源`);
      const pagesContract = resource.assertContract(pagesText, `${resource.id} Pages公网资源`);
      diagnostics.resources[resource.id].main = { ...pair.main, buffer: undefined, contract: mainContract };
      diagnostics.resources[resource.id].pages = { ...pair.pages, buffer: undefined, contract: pagesContract };
      diagnostics.resources[resource.id].verified = {
        publicReachable: true,
        exactBytesMatch: true,
        exactSha256Match: true,
        semanticContractMatch: true
      };
      console.log(`CNC Pages resource fix verified: ${resource.path} ${pair.pages.sha256} (${resource.id})`);
    }

    diagnostics.verified = {
      resourceCount: resources.length,
      allPublicReachable: true,
      allExactBytesMatch: true,
      allExactSha256Match: true,
      allSemanticContractsMatch: true
    };
    fs.writeFileSync(resultPath, JSON.stringify(diagnostics, null, 2));
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
