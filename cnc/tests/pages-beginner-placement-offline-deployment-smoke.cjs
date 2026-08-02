const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'cnc/test-results/beginner-placement-offline-pages');
fs.mkdirSync(out, { recursive: true });

const publicRoot = (process.env.CNC_PAGES_URL || 'https://panxiangbin.github.io/yuhua').replace(/\/+$/, '');
const mainRoot = (process.env.CNC_MAIN_RAW_ROOT || 'https://raw.githubusercontent.com/panxiangbin/yuhua/main').replace(/\/+$/, '');
const expectedPwaBuild = '20260802-pwa6';
const attempts = Number(process.env.CNC_PAGES_VERIFY_ATTEMPTS || 18);
const intervalMs = Number(process.env.CNC_PAGES_VERIFY_INTERVAL_MS || 10000);
const resources = ['cnc/beginner-placement.html', 'cnc/sw.js', 'cnc/build-info.json'];

const report = {
  checkedAt: new Date().toISOString(),
  publicRoot,
  mainRoot,
  expectedPwaBuild,
  attempts: [],
  resources: {}
};

function digest(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function withNonce(url) {
  const target = new URL(url);
  target.searchParams.set('verify-beginner-placement-offline', `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return target.toString();
}

async function fetchBytes(url, label) {
  const response = await fetch(withNonce(url), {
    cache: 'no-store',
    redirect: 'follow',
    headers: {
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
      'User-Agent': 'cnc-beginner-placement-offline-pages-smoke'
    }
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!response.ok) throw new Error(`${label} HTTP ${response.status}: ${buffer.toString('utf8', 0, 180)}`);
  return {
    buffer,
    status: response.status,
    bytes: buffer.length,
    sha256: digest(buffer),
    finalUrl: response.url,
    cacheControl: response.headers.get('cache-control'),
    lastModified: response.headers.get('last-modified'),
    etag: response.headers.get('etag')
  };
}

function summary(value) {
  return {
    status: value.status,
    bytes: value.bytes,
    sha256: value.sha256,
    finalUrl: value.finalUrl,
    cacheControl: value.cacheControl,
    lastModified: value.lastModified,
    etag: value.etag
  };
}

function exact(left, right) {
  return left.bytes === right.bytes && left.sha256 === right.sha256;
}

function requireTokens(text, label, tokens) {
  for (const token of tokens) {
    if (!text.includes(token)) throw new Error(`${label}缺少契约：${token}`);
  }
}

function assertPlacement(text, label) {
  requireTokens(text, label, [
    '<title>CNC新手起点测评',
    'id="progress"',
    'role="progressbar"',
    'id="options"',
    'role="radiogroup"',
    '测评只做推荐',
    '相同版本原厂手册',
    '授权人员确认',
    '不写入长期学习记录'
  ]);
  for (const forbidden of ['localStorage.setItem', 'indexedDB.open', '固定上机值', '绕过安全门联锁']) {
    if (text.includes(forbidden)) throw new Error(`${label}出现禁止内容：${forbidden}`);
  }
}

function assertServiceWorker(text, label) {
  requireTokens(text, label, [
    `const BUILD = '${expectedPwaBuild}'`,
    "'./beginner-placement.html'",
    "'./ai-teacher.html'",
    "'./ai-teacher-intake.html'",
    "'./ai-teacher-explainability.html'",
    "name.startsWith('cnc-') && !name.endsWith(BUILD)"
  ]);
  const block = text.match(/const REQUIRED_CORE_PATHS = \[([\s\S]*?)\];/)?.[1] || '';
  const core = [...block.matchAll(/'([^']+)'/g)].map(match => match[1]);
  if (core.length !== 10 || new Set(core).size !== 10) throw new Error(`${label}核心资源必须为10项且无重复：${JSON.stringify(core)}`);
  if (!core.includes('./beginner-placement.html')) throw new Error(`${label}起点测评未进入核心缓存`);
}

function assertBuildInfo(text, label) {
  let data;
  try { data = JSON.parse(text.replace(/^\uFEFF/, '')); } catch (error) { throw new Error(`${label}不是合法JSON：${error.message}`); }
  if (data.app !== 'cnc-training-platform') throw new Error(`${label}应用标识错误`);
  if (data.pwaBuild !== expectedPwaBuild) throw new Error(`${label}PWA构建错误：${data.pwaBuild}`);
  if (data.scope !== '/cnc/') throw new Error(`${label}作用域错误：${data.scope}`);
  if (!String(data.contentStage || '').includes('起点测评离线核心')) throw new Error(`${label}缺少起点测评离线核心标记`);
}

function assertContract(resource, text, label) {
  if (resource.endsWith('beginner-placement.html')) return assertPlacement(text, label);
  if (resource.endsWith('sw.js')) return assertServiceWorker(text, label);
  if (resource.endsWith('build-info.json')) return assertBuildInfo(text, label);
  throw new Error(`未知资源：${resource}`);
}

async function waitForExactDeployment() {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const record = { attempt, at: new Date().toISOString(), resources: {} };
    try {
      let allMatch = true;
      const values = {};
      for (const resource of resources) {
        const main = await fetchBytes(`${mainRoot}/${resource}`, `main ${resource}`);
        const pages = await fetchBytes(`${publicRoot}/${resource}`, `Pages ${resource}`);
        const matched = exact(main, pages);
        values[resource] = { main, pages, matched };
        record.resources[resource] = { matched, main: summary(main), pages: summary(pages) };
        if (!matched) allMatch = false;
      }
      report.attempts.push(record);
      if (allMatch) return values;
    } catch (error) {
      record.error = error.message;
      report.attempts.push(record);
    }
    if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error('起点测评离线核心资源尚未与main在Pages公网逐字节一致');
}

(async () => {
  const reportPath = path.join(out, 'report.json');
  const findingsPath = path.join(out, 'findings.txt');
  try {
    const deployed = await waitForExactDeployment();
    const findings = [];
    for (const resource of resources) {
      const localBuffer = fs.readFileSync(path.join(root, resource));
      const local = { buffer: localBuffer, bytes: localBuffer.length, sha256: digest(localBuffer) };
      const pair = deployed[resource];
      if (!exact(local, pair.main)) throw new Error(`当前分支与main不一致：${resource}`);
      const localText = localBuffer.toString('utf8').replace(/^\uFEFF/, '');
      const mainText = pair.main.buffer.toString('utf8').replace(/^\uFEFF/, '');
      const pagesText = pair.pages.buffer.toString('utf8').replace(/^\uFEFF/, '');
      assertContract(resource, localText, `当前分支 ${resource}`);
      assertContract(resource, mainText, `main ${resource}`);
      assertContract(resource, pagesText, `Pages ${resource}`);
      report.resources[resource] = {
        local: { bytes: local.bytes, sha256: local.sha256 },
        main: summary(pair.main),
        pages: summary(pair.pages),
        exactBytesMatch: true,
        exactSha256Match: true,
        localMatchesMain: true
      };
      findings.push(`${resource}｜${pair.pages.bytes} bytes｜${pair.pages.sha256}`);
    }
    report.verified = {
      publicReachable: true,
      exactBytesMatch: true,
      exactSha256Match: true,
      localMatchesMain: true,
      pwaBuild: expectedPwaBuild,
      beginnerPlacementPublic: true,
      beginnerPlacementInCoreCache: true,
      tenCoreResourcesVerified: true,
      recommendationBoundaryVisible: true,
      manualBoundaryVisible: true,
      authorizedPersonBoundaryVisible: true,
      noLongTermLearningWrite: true
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(findingsPath, [
      '起点测评Pages公网可达：是',
      '当前分支、main、Pages逐字节一致：是',
      `PWA构建：${expectedPwaBuild}`,
      '起点测评进入10项核心预缓存：是',
      '测评推荐、原厂手册、授权人员与不写长期记录边界：可见',
      ...findings
    ].join('\n') + '\n');
    console.log(`CNC beginner placement offline Pages verified: ${expectedPwaBuild}`);
  } catch (error) {
    report.error = String(error && error.stack || error);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(findingsPath, report.error + '\n');
    throw error;
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
