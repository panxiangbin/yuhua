const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const resultsDir = path.resolve(root, 'cnc/test-results/ai-teacher-handoff-producer-pages');
fs.mkdirSync(resultsDir, { recursive: true });

const resourcePath = 'cnc/ai-teacher.html';
const publicRoot = (process.env.CNC_PAGES_URL || 'https://panxiangbin.github.io/yuhua').replace(/\/+$/, '');
const mainRoot = (process.env.CNC_MAIN_RAW_ROOT || 'https://raw.githubusercontent.com/panxiangbin/yuhua/main').replace(/\/+$/, '');
const eventName = String(process.env.GITHUB_EVENT_NAME || 'local');
const requireLocalMainMatch = eventName !== 'pull_request';
const attempts = Number(process.env.CNC_PAGES_VERIFY_ATTEMPTS || 18);
const intervalMs = Number(process.env.CNC_PAGES_VERIFY_INTERVAL_MS || 10000);

if (!Number.isInteger(attempts) || attempts < 1) throw new Error('CNC_PAGES_VERIFY_ATTEMPTS 必须是大于 0 的整数');
if (!Number.isFinite(intervalMs) || intervalMs < 0) throw new Error('CNC_PAGES_VERIFY_INTERVAL_MS 不能为负数');

const diagnostics = {
  checkedAt: new Date().toISOString(),
  eventName,
  requireLocalMainMatch,
  resourcePath,
  publicRoot,
  mainRoot,
  attempts: []
};

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function cacheBusted(url) {
  const target = new URL(url);
  target.searchParams.set('verify-handoff-producer', `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return target.toString();
}

function summarize(payload) {
  return {
    status: payload.status,
    finalUrl: payload.finalUrl,
    bytes: payload.bytes,
    sha256: payload.sha256,
    contentType: payload.contentType,
    cacheControl: payload.cacheControl,
    age: payload.age,
    etag: payload.etag,
    lastModified: payload.lastModified
  };
}

async function fetchBytes(url, label) {
  const response = await fetch(cacheBusted(url), {
    cache: 'no-store',
    redirect: 'follow',
    headers: {
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
      'User-Agent': 'cnc-ai-teacher-handoff-producer-pages-smoke'
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

function assertProducerContract(text, label) {
  const required = [
    "const HANDOFF_KEY = 'cnc_ai_teacher_explainability_handoff_v1'",
    'const HANDOFF_SCHEMA_VERSION = 1',
    'const HANDOFF_MAX_AGE_MS = 5 * 60 * 1000',
    'function clearExplainabilityHandoff()',
    'sessionStorage.removeItem(HANDOFF_KEY)',
    'function prepareExplainabilityHandoff(question,intent)',
    "intent==='blocked'||intent==='safety-boundary'",
    'value.length<1||value.length>120',
    "source:'ai-teacher'",
    'expiresAt:createdAt+HANDOFF_MAX_AGE_MS',
    'sessionStorage.setItem(HANDOFF_KEY,JSON.stringify(payload))',
    "route('查看本次判断说明','./ai-teacher-explainability.html',true)",
    'const payload=prepareExplainabilityHandoff(question,intent)',
    "renderAnswer(button.dataset.intent,'')",
    'renderAnswer(classified.intent,question)',
    'handoff:Object.freeze({key:HANDOFF_KEY',
    '不调用外部模型',
    '核对机床原厂手册'
  ];
  for (const token of required) {
    if (!text.includes(token)) throw new Error(`${label}缺少一次性交接生产端契约：${token}`);
  }

  const forbidden = [
    /localStorage\.setItem\s*\(\s*HANDOFF_KEY/,
    /indexedDB[^\n]{0,120}HANDOFF_KEY/i,
    /ai-teacher-explainability\.html\?[^'"\s]*/i,
    /ai-teacher-explainability\.html#[^'"\s]*/i,
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /WebSocket/,
    /EventSource/
  ];
  for (const pattern of forbidden) {
    if (pattern.test(text)) throw new Error(`${label}出现不允许的长期存储、URL携带或外部联网：${pattern}`);
  }

  const build = text.match(/const BUILD = '([^']+)'/)?.[1];
  const classificationVersion = text.match(/const CLASSIFICATION_VERSION = '([^']+)'/)?.[1];
  if (!build || !/^\d{8}-[a-z0-9-]+$/.test(build)) throw new Error(`${label}缺少有效站点构建标识`);
  if (!classificationVersion || !/^\d{8}-v\d+$/.test(classificationVersion)) throw new Error(`${label}缺少有效分类器版本`);

  return {
    build,
    classificationVersion,
    key: 'cnc_ai_teacher_explainability_handoff_v1',
    schemaVersion: 1,
    maxAgeMs: 300000,
    allowedIntents: ['blocked', 'safety-boundary'],
    sessionStorageOnly: true,
    normalQuestionClearsStaleData: true,
    fixedExplainabilityUrl: true,
    noExternalNetworking: true
  };
}

function readLocal() {
  const buffer = fs.readFileSync(path.join(root, resourcePath));
  return {
    buffer,
    status: 200,
    finalUrl: `file://${path.join(root, resourcePath)}`,
    bytes: buffer.length,
    sha256: sha256(buffer),
    contentType: 'text/html'
  };
}

function exactMatch(left, right) {
  return left.bytes === right.bytes && left.sha256 === right.sha256;
}

async function waitForMainAndPages() {
  let lastMain;
  let lastPages;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      lastMain = await fetchBytes(`${mainRoot}/${resourcePath}`, 'main AI老师页面');
      lastPages = await fetchBytes(`${publicRoot}/${resourcePath}`, 'Pages公网 AI老师页面');
      const matched = exactMatch(lastMain, lastPages);
      diagnostics.attempts.push({
        attempt,
        at: new Date().toISOString(),
        matched,
        main: summarize(lastMain),
        pages: summarize(lastPages)
      });
      if (matched) return { main: lastMain, pages: lastPages };
    } catch (error) {
      diagnostics.attempts.push({ attempt, at: new Date().toISOString(), error: error.message });
    }
    if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error('AI老师一次性交接生产端尚未在 Pages 与 main 逐字节一致');
}

(async () => {
  const reportPath = path.join(resultsDir, 'report.json');
  const findingsPath = path.join(resultsDir, 'findings.txt');
  try {
    const local = readLocal();
    const localContract = assertProducerContract(local.buffer.toString('utf8').replace(/^\uFEFF/, ''), '当前分支 AI老师页面');
    const published = await waitForMainAndPages();
    const mainContract = assertProducerContract(published.main.buffer.toString('utf8').replace(/^\uFEFF/, ''), 'main AI老师页面');
    const pagesContract = assertProducerContract(published.pages.buffer.toString('utf8').replace(/^\uFEFF/, ''), 'Pages公网 AI老师页面');
    const localMatchesMain = exactMatch(local, published.main);

    if (requireLocalMainMatch && !localMatchesMain) {
      throw new Error('main 或手动复验必须要求当前检出 AI老师页面与远程 main 完全一致');
    }

    diagnostics.local = { resource: summarize(local), contract: localContract };
    diagnostics.main = { resource: summarize(published.main), contract: mainContract };
    diagnostics.pages = { resource: summarize(published.pages), contract: pagesContract };
    diagnostics.verified = {
      publicReachable: true,
      exactBytesMatch: true,
      exactSha256Match: true,
      localMatchesMain,
      branchDeploymentPending: !localMatchesMain,
      producerContractPresent: true,
      sessionStorageOnly: true,
      allowedIntentBoundaryPresent: true,
      staleDataCleanupPresent: true,
      fixedExplainabilityUrlPresent: true,
      noExternalNetworking: true
    };

    fs.writeFileSync(reportPath, JSON.stringify(diagnostics, null, 2));
    fs.writeFileSync(findingsPath, [
      'AI老师一次性交接生产端公网可达：是',
      'main 与 Pages 逐字节一致：是',
      `当前分支与 main 一致：${localMatchesMain ? '是' : '否（PR 分支页面改动待合并部署）'}`,
      `页面字节：${published.pages.bytes}`,
      `页面 SHA-256：${published.pages.sha256}`,
      `站点构建：${pagesContract.build}`,
      `分类器版本：${pagesContract.classificationVersion}`,
      '只允许 blocked / safety-boundary：通过',
      'SessionStorage 一次性交接：通过',
      '普通问题清理遗留数据：通过',
      '问题不进入URL或长期存储：通过',
      '站外联网调用：0'
    ].join('\n') + '\n');
    console.log(`CNC AI teacher handoff producer Pages verified: ${pagesContract.build} / ${published.pages.sha256}`);
  } catch (error) {
    diagnostics.error = String(error && error.stack || error);
    fs.writeFileSync(reportPath, JSON.stringify(diagnostics, null, 2));
    fs.writeFileSync(findingsPath, diagnostics.error + '\n');
    throw error;
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
