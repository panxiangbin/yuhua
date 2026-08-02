const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const resultsDir = path.resolve(root, 'cnc/test-results/ai-teacher-classification-pages');
fs.mkdirSync(resultsDir, { recursive: true });

const publicRoot = (process.env.CNC_PAGES_URL || 'https://panxiangbin.github.io/yuhua').replace(/\/+$/, '');
const mainRoot = (process.env.CNC_MAIN_RAW_ROOT || 'https://raw.githubusercontent.com/panxiangbin/yuhua/main').replace(/\/+$/, '');
const eventName = String(process.env.GITHUB_EVENT_NAME || 'local');
const attempts = Number(process.env.CNC_PAGES_VERIFY_ATTEMPTS || 18);
const intervalMs = Number(process.env.CNC_PAGES_VERIFY_INTERVAL_MS || 10000);
const expectedClassificationVersion = '20260802-v2';

if (!Number.isInteger(attempts) || attempts < 1) throw new Error('CNC_PAGES_VERIFY_ATTEMPTS 必须是大于 0 的整数');
if (!Number.isFinite(intervalMs) || intervalMs < 0) throw new Error('CNC_PAGES_VERIFY_INTERVAL_MS 不能为负数');

const diagnostics = {
  checkedAt: new Date().toISOString(),
  eventName,
  publicRoot,
  mainRoot,
  expectedClassificationVersion,
  attempts: []
};

function cacheBusted(url) {
  const target = new URL(url);
  target.searchParams.set('verify-ai-teacher-classification', `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return target.toString();
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function fetchBytes(url, label) {
  const response = await fetch(cacheBusted(url), {
    cache: 'no-store',
    redirect: 'follow',
    headers: {
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
      'User-Agent': 'cnc-ai-teacher-classification-pages-smoke'
    }
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!response.ok) throw new Error(`${label} HTTP ${response.status}：${buffer.toString('utf8', 0, 180)}`);
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

function assertClassificationContract(text, label) {
  const required = [
    "const CLASSIFICATION_VERSION = '20260802-v2'",
    "normalize('NFKC')",
    'BLOCK_RULES',
    "id:'exact-value'",
    "id:'parameter-write'",
    "id:'bypass-safety'",
    "id:'blind-reset'",
    'SAFE_DISCUSSION_RULES',
    'OVERRIDE_EXECUTION_PATTERN',
    "intent:blocked?'blocked':safeDiscussion?'safety-boundary'",
    '安全原理说明',
    '不提供可执行绕过步骤或固定上机值',
    '核对原厂手册',
    'classificationVersion:CLASSIFICATION_VERSION',
    'localOnly:true',
    'externalModel:false'
  ];
  for (const token of required) {
    if (!text.includes(token)) throw new Error(`${label}缺少 AI 老师分类部署契约：${token}`);
  }
  for (const forbidden of [
    /https?:\/\//i,
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /WebSocket/,
    /EventSource/,
    /allowOperationalUse\s*:\s*true/,
    /test\.skip\(/,
    /describe\.skip\(/,
    /it\.skip\(/
  ]) {
    if (forbidden.test(text)) throw new Error(`${label}出现不允许的联网、直接上机或门禁绕过声明：${forbidden}`);
  }
  const classificationVersion = text.match(/const CLASSIFICATION_VERSION = '([^']+)'/)?.[1];
  const build = text.match(/const BUILD = '([^']+)'/)?.[1];
  if (classificationVersion !== expectedClassificationVersion) {
    throw new Error(`${label}分类版本不一致：${classificationVersion || 'missing'} / ${expectedClassificationVersion}`);
  }
  if (!build || !/^\d{8}-[a-z0-9-]+$/.test(build)) throw new Error(`${label}缺少有效站点构建标识`);
  return {
    classificationVersion,
    build,
    blockedSignals: ['exact-value', 'parameter-write', 'bypass-safety', 'blind-reset'],
    safeDiscussionPresent: true,
    executionOverridePresent: true,
    localOnly: true,
    externalModel: false
  };
}

function readFixture() {
  const fixture = JSON.parse(fs.readFileSync(path.join(root, 'cnc/tests/fixtures/ai-teacher-classification-cases.json'), 'utf8'));
  if (fixture.schemaVersion !== 1) throw new Error('分类样本 schemaVersion 必须为 1');
  if (fixture.classificationVersion !== expectedClassificationVersion) throw new Error('分类样本版本与页面部署版本不一致');
  if (!Array.isArray(fixture.blocked) || fixture.blocked.length < 15) throw new Error('高风险阻断样本不足 15 条');
  if (!Array.isArray(fixture.allowed) || fixture.allowed.length < 15) throw new Error('正常学习样本不足 15 条');
  const rows = [...fixture.blocked, ...fixture.allowed];
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('分类样本 id 重复');
  if (new Set(rows.map(row => row.question)).size !== rows.length) throw new Error('分类问题文本重复');
  return {
    schemaVersion: fixture.schemaVersion,
    classificationVersion: fixture.classificationVersion,
    blockedCases: fixture.blocked.length,
    allowedCases: fixture.allowed.length,
    totalCases: rows.length
  };
}

function exactMatch(left, right) {
  return left.bytes === right.bytes && left.sha256 === right.sha256;
}

async function waitForDeployment() {
  let lastMain;
  let lastPages;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      lastMain = await fetchBytes(`${mainRoot}/cnc/ai-teacher.html`, 'main AI老师页面');
      lastPages = await fetchBytes(`${publicRoot}/cnc/ai-teacher.html`, 'Pages公网 AI老师页面');
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
  throw new Error('AI老师分类版本尚未与 main 在 Pages 公网逐字节一致');
}

(async () => {
  const reportPath = path.join(resultsDir, 'report.json');
  const findingsPath = path.join(resultsDir, 'findings.txt');
  try {
    const localBuffer = fs.readFileSync(path.join(root, 'cnc/ai-teacher.html'));
    const local = {
      buffer: localBuffer,
      status: 200,
      finalUrl: `file://${path.join(root, 'cnc/ai-teacher.html')}`,
      bytes: localBuffer.length,
      sha256: sha256(localBuffer),
      contentType: 'text/html'
    };
    const fixture = readFixture();
    const localContract = assertClassificationContract(local.buffer.toString('utf8').replace(/^\uFEFF/, ''), '当前分支');
    const deployed = await waitForDeployment();
    const mainContract = assertClassificationContract(deployed.main.buffer.toString('utf8').replace(/^\uFEFF/, ''), 'main');
    const pagesContract = assertClassificationContract(deployed.pages.buffer.toString('utf8').replace(/^\uFEFF/, ''), 'Pages公网');
    const localMatchesMain = exactMatch(local, deployed.main);

    diagnostics.fixture = fixture;
    diagnostics.local = { resource: summarize(local), contract: localContract };
    diagnostics.main = { resource: summarize(deployed.main), contract: mainContract };
    diagnostics.pages = { resource: summarize(deployed.pages), contract: pagesContract };
    diagnostics.verified = {
      publicReachable: true,
      exactBytesMatch: true,
      exactSha256Match: true,
      localMatchesMain,
      branchDeploymentPending: !localMatchesMain,
      classificationVersionMatch: true,
      fourHighRiskSignalsPresent: true,
      safeDiscussionBoundaryPresent: true,
      executionOverridePresent: true,
      noExternalNetworking: true
    };

    fs.writeFileSync(reportPath, JSON.stringify(diagnostics, null, 2));
    fs.writeFileSync(findingsPath, [
      'AI老师分类页面公网可达：是',
      'main 与 Pages 逐字节一致：是',
      `当前分支与 main 一致：${localMatchesMain ? '是' : '否（仅测试或后续分支改动）'}`,
      `分类版本：${pagesContract.classificationVersion}`,
      `分类样本：${fixture.blockedCases} 条阻断 + ${fixture.allowedCases} 条正常学习`,
      '四类高风险信号：完整',
      '安全讨论与强执行意图边界：通过',
      '站外联网调用：0'
    ].join('\n') + '\n');
    console.log(`CNC AI teacher classification Pages verified: ${pagesContract.classificationVersion}, ${fixture.totalCases} cases`);
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
