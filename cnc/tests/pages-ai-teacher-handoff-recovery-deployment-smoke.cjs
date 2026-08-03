const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const outDir = path.join(root, 'cnc/test-results/ai-teacher-handoff-recovery-pages');
fs.mkdirSync(outDir, { recursive: true });

const publicRoot = (process.env.CNC_PAGES_URL || 'https://panxiangbin.github.io/yuhua').replace(/\/+$/, '');
const mainRoot = (process.env.CNC_MAIN_RAW_ROOT || 'https://raw.githubusercontent.com/panxiangbin/yuhua/main').replace(/\/+$/, '');
const eventName = String(process.env.GITHUB_EVENT_NAME || 'local');
const attempts = Number(process.env.CNC_PAGES_VERIFY_ATTEMPTS || 18);
const intervalMs = Number(process.env.CNC_PAGES_VERIFY_INTERVAL_MS || 10000);
const resourcePath = 'cnc/ai-teacher-explainability.html';

if (!Number.isInteger(attempts) || attempts < 1) throw new Error('CNC_PAGES_VERIFY_ATTEMPTS 必须是大于 0 的整数');
if (!Number.isFinite(intervalMs) || intervalMs < 0) throw new Error('CNC_PAGES_VERIFY_INTERVAL_MS 不能为负数');

const report = {
  checkedAt: new Date().toISOString(),
  eventName,
  publicRoot,
  mainRoot,
  resourcePath,
  attempts: []
};

function hash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function cacheBusted(url) {
  const target = new URL(url);
  target.searchParams.set('verify-handoff-recovery', `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return target.toString();
}

async function fetchResource(url, label) {
  const response = await fetch(cacheBusted(url), {
    cache: 'no-store',
    redirect: 'follow',
    headers: {
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
      'User-Agent': 'cnc-ai-teacher-handoff-recovery-pages-smoke'
    }
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!response.ok) throw new Error(`${label} HTTP ${response.status}：${buffer.toString('utf8', 0, 180)}`);
  return {
    buffer,
    status: response.status,
    bytes: buffer.length,
    sha256: hash(buffer),
    finalUrl: response.url,
    cacheControl: response.headers.get('cache-control'),
    etag: response.headers.get('etag'),
    lastModified: response.headers.get('last-modified')
  };
}

function summary(value) {
  return {
    status: value.status,
    bytes: value.bytes,
    sha256: value.sha256,
    finalUrl: value.finalUrl,
    cacheControl: value.cacheControl,
    etag: value.etag,
    lastModified: value.lastModified
  };
}

function exact(left, right) {
  return left.bytes === right.bytes && left.sha256 === right.sha256;
}

function visibleBody(text) {
  const body = text.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  if (!body) throw new Error('判断说明页缺少 body');
  return body
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function assertListenerContract(text, label) {
  const pagehide = /window\.addEventListener\(['"]pagehide['"],(?:clearConsumedHandoffView|\(\)=>clearConsumedHandoffView\(\{focusStatus:false\}\))\)/;
  const pageshow = /window\.addEventListener\(['"]pageshow['"],event=>\{if\(event\.persisted\)clearConsumedHandoffView\((?:\{focusStatus:true\})?\)\}\)/;
  if (!pagehide.test(text)) throw new Error(`${label}缺少受控 pagehide 清理监听器`);
  if (!pageshow.test(text)) throw new Error(`${label}缺少 event.persisted 受控 BFCache 清理监听器`);
}

function assertRecoveryContract(text, label) {
  const required = [
    "const EXPLAINABILITY_VERSION = '20260802-v2'",
    "const HANDOFF_KEY = 'cnc_ai_teacher_explainability_handoff_v1'",
    "handoffOutcome('storage-unavailable')",
    "document.documentElement.dataset.handoffState='consumed-cleared'",
    "displayedFromHandoff=true",
    "displayedFromHandoff=false",
    'sessionStorage.getItem(HANDOFF_KEY)',
    'sessionStorage.removeItem(HANDOFF_KEY)',
    'teacherApi.classifyQuestion',
    'localOnly:true',
    'externalModel:false'
  ];
  for (const token of required) {
    if (!text.includes(token)) throw new Error(`${label}缺少交接恢复部署契约：${token}`);
  }
  assertListenerContract(text, label);

  const visible = visibleBody(text);
  for (const token of [
    '本页不提供固定上机值',
    '必须核对相同版本原厂手册',
    '未逐条复核内容不可直接上机'
  ]) {
    if (!visible.includes(token)) throw new Error(`${label}缺少可见安全边界：${token}`);
  }

  for (const forbidden of [
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /WebSocket/,
    /EventSource/,
    /localStorage\.(?:setItem|removeItem)\(HANDOFF_KEY/,
    /indexedDB/i,
    /allowOperationalUse\s*:\s*true/,
    /test\.skip\(/,
    /describe\.skip\(/,
    /it\.skip\(/
  ]) {
    if (forbidden.test(text)) throw new Error(`${label}出现站外联网、长期交接存储、直接上机或门禁绕过声明：${forbidden}`);
  }

  return {
    explainabilityVersion: '20260802-v2',
    storageUnavailableRecovery: true,
    bfcacheScrub: true,
    separateTabSessionBoundary: true,
    noExternalNetworking: true,
    noLongTermHandoffStorage: true,
    originalManualBoundary: true
  };
}

async function waitForMainAndPages() {
  let lastMain;
  let lastPages;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      [lastMain, lastPages] = await Promise.all([
        fetchResource(`${mainRoot}/${resourcePath}`, 'main 判断说明页'),
        fetchResource(`${publicRoot}/${resourcePath}`, 'Pages 公网判断说明页')
      ]);
      const matched = exact(lastMain, lastPages);
      report.attempts.push({
        attempt,
        at: new Date().toISOString(),
        matched,
        main: summary(lastMain),
        pages: summary(lastPages)
      });
      if (matched) return { main: lastMain, pages: lastPages };
    } catch (error) {
      report.attempts.push({ attempt, at: new Date().toISOString(), error: error.message });
    }
    if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error('AI老师交接恢复页面尚未与 main 在 Pages 公网逐字节一致');
}

(async () => {
  const reportPath = path.join(outDir, 'report.json');
  const findingsPath = path.join(outDir, 'findings.txt');
  try {
    const localBuffer = fs.readFileSync(path.join(root, resourcePath));
    const local = {
      buffer: localBuffer,
      status: 200,
      bytes: localBuffer.length,
      sha256: hash(localBuffer),
      finalUrl: `file://${path.join(root, resourcePath)}`
    };
    const localText = localBuffer.toString('utf8').replace(/^\uFEFF/, '');
    const localContract = assertRecoveryContract(localText, '当前分支');

    const deployed = await waitForMainAndPages();
    const mainText = deployed.main.buffer.toString('utf8').replace(/^\uFEFF/, '');
    const pagesText = deployed.pages.buffer.toString('utf8').replace(/^\uFEFF/, '');
    const mainContract = assertRecoveryContract(mainText, 'main');
    const pagesContract = assertRecoveryContract(pagesText, 'Pages 公网');
    const localMatchesMain = exact(local, deployed.main);
    const branchDeploymentPending = !localMatchesMain;

    if (eventName !== 'pull_request' && branchDeploymentPending) {
      throw new Error(`非 PR 验收不允许当前分支判断说明页与 main 不一致：${eventName}`);
    }

    report.local = { resource: summary(local), contract: localContract };
    report.main = { resource: summary(deployed.main), contract: mainContract };
    report.pages = { resource: summary(deployed.pages), contract: pagesContract };
    report.verified = {
      publicReachable: true,
      exactBytesMatch: true,
      exactSha256Match: true,
      localMatchesMain,
      branchDeploymentPending,
      storageUnavailableRecoveryPresent: true,
      bfcacheScrubPresent: true,
      consumedClearedStatePresent: true,
      sessionStorageOnly: true,
      noExternalNetworking: true,
      noLongTermHandoffStorage: true,
      originalManualBoundaryPresent: true
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(findingsPath, [
      'AI老师交接恢复页面公网可达：是',
      'main 与 Pages 逐字节一致：是',
      `当前分支与 main 一致：${localMatchesMain ? '是' : '否（生产页面分支待合并）'}`,
      `资源字节：${deployed.pages.bytes}`,
      `SHA-256：${deployed.pages.sha256}`,
      'SessionStorage 不可用恢复：已部署',
      '真实 BFCache 返回清理逻辑：已部署',
      '已消费状态 consumed-cleared：已部署',
      '独立标签页会话隔离：保持',
      '站外联网调用：0',
      '长期交接存储写入：0',
      '原厂手册与逐条复核边界：保留'
    ].join('\n') + '\n');
    console.log(`CNC AI teacher handoff recovery Pages verified: public ${deployed.pages.bytes} bytes / ${deployed.pages.sha256}, pending=${branchDeploymentPending}`);
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
